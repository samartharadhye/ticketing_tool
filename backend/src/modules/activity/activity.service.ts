import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';

import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ACTION_TO_EVENT_TYPE,
  ActivityEventType,
  ActivityEventWithRelations,
  ActivityItemResponse,
  EVENT_TYPE_TO_ACTION,
  PaginatedActivityResponse,
  RecordActivityOptions,
  SAFE_ACTOR_SELECT,
  SAFE_ISSUE_SELECT,
  SAFE_PROJECT_SELECT,
} from './activity.types';
import { QueryActivityDto } from './dto/query-activity.dto';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a business or audit activity event.
   * Supports transactional execution by passing an active Prisma transaction client (`tx`).
   */
  async recordActivity(
    options: RecordActivityOptions,
  ): Promise<ActivityItemResponse> {
    const {
      actorId,
      type,
      action: customAction,
      summary,
      details: customDetails,
      issueId,
      projectId: customProjectId,
      metadata = {},
      tx,
    } = options;

    if (!actorId) {
      throw new BadRequestException('actorId is required to record activity.');
    }

    const client = tx || this.prisma;

    // Resolve canonical action verb
    const canonicalAction =
      customAction ||
      EVENT_TYPE_TO_ACTION[type] ||
      type.toString().toLowerCase();

    // Auto-resolve projectId from issue if issueId is present and projectId was omitted
    let resolvedProjectId = customProjectId;
    if (!resolvedProjectId && issueId) {
      try {
        const issue = await client.issue.findUnique({
          where: { id: issueId },
          select: { projectId: true, title: true },
        });
        if (issue) {
          resolvedProjectId = issue.projectId;
        }
      } catch (err: unknown) {
        this.logger.debug(
          `Could not pre-resolve project for issue ${issueId}: ${err}`,
        );
      }
    }

    // Determine final human-readable details string
    const finalDetails =
      customDetails ||
      summary ||
      (Object.keys(metadata).length > 0 && !summary
        ? JSON.stringify({ action: canonicalAction, ...metadata })
        : `${canonicalAction} on ${issueId || 'workspace'}`);

    const createdEvent = await client.activityEvent.create({
      data: {
        userId: actorId,
        action: canonicalAction,
        details: finalDetails,
        issueId: issueId || null,
        projectId: resolvedProjectId || null,
      },
      include: {
        user: { select: SAFE_ACTOR_SELECT },
        issue: { select: SAFE_ISSUE_SELECT },
        project: { select: SAFE_PROJECT_SELECT },
      },
    });

    this.logger.log(
      `Recorded activity [${type}] action="${canonicalAction}" by user="${actorId}" on issue="${issueId || 'none'}"`,
    );

    return this.formatActivity(createdEvent);
  }

  /**
   * Builds type-safe Prisma ActivityEventWhereInput based on validated query parameters.
   */
  public buildWhereClause(
    dto: QueryActivityDto,
    currentUser: AuthenticatedUser,
  ): Prisma.ActivityEventWhereInput {
    const where: Prisma.ActivityEventWhereInput = {};
    const conditions: Prisma.ActivityEventWhereInput[] = [];

    // Filter by type or action
    if (dto.type) {
      const canonicalAction = EVENT_TYPE_TO_ACTION[dto.type];
      if (canonicalAction) {
        conditions.push({
          OR: [
            { action: dto.type },
            { action: canonicalAction },
            { action: canonicalAction.toLowerCase() },
          ],
        });
      } else {
        conditions.push({
          action: { equals: dto.type, mode: 'insensitive' },
        });
      }
    } else if (dto.action) {
      conditions.push({
        action: { equals: dto.action, mode: 'insensitive' },
      });
    }

    // Filter by issueId
    if (dto.issueId) {
      conditions.push({ issueId: dto.issueId });
    }

    // Filter by projectId
    if (dto.projectId) {
      conditions.push({
        OR: [
          { projectId: dto.projectId },
          { issue: { projectId: dto.projectId } },
        ],
      });
    }

    // Filter by actorId / userId with role-based restriction
    const requestedActorId = dto.actorId || dto.userId;
    if (requestedActorId) {
      const isPrivileged =
        currentUser.role === UserRole.Admin ||
        currentUser.role === UserRole.Project_Manager;

      if (!isPrivileged && requestedActorId !== currentUser.id) {
        throw new ForbiddenException(
          'You are only authorized to filter activity by your own user ID.',
        );
      }
      conditions.push({ userId: requestedActorId });
    }

    // Date range filter
    if (dto.startDate || dto.endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (dto.startDate) {
        const start = new Date(dto.startDate);
        if (isNaN(start.getTime())) {
          throw new BadRequestException('Invalid startDate format.');
        }
        dateFilter.gte = start;
      }
      if (dto.endDate) {
        const end = new Date(dto.endDate);
        if (isNaN(end.getTime())) {
          throw new BadRequestException('Invalid endDate format.');
        }
        dateFilter.lte = end;
      }
      conditions.push({ timestamp: dateFilter });
    }

    // Substring search on details
    if (dto.search && dto.search.trim()) {
      conditions.push({
        details: { contains: dto.search.trim(), mode: 'insensitive' },
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    return where;
  }

  /**
   * Retrieves paginated activity records.
   */
  async findAll(
    dto: QueryActivityDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedActivityResponse> {
    const page = Math.max(1, dto.page || 1);
    const limit = Math.min(100, Math.max(1, dto.limit || 20));
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(dto, currentUser);

    const [records, total] = await Promise.all([
      this.prisma.activityEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        include: {
          user: { select: SAFE_ACTOR_SELECT },
          issue: { select: SAFE_ISSUE_SELECT },
          project: { select: SAFE_PROJECT_SELECT },
        },
      }),
      this.prisma.activityEvent.count({ where }),
    ]);

    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

    return {
      data: records.map((record) => this.formatActivity(record)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieves the most recent activities (for dashboard / sidebar widgets).
   */
  async findRecent(
    currentUser: AuthenticatedUser,
    limit = 10,
  ): Promise<ActivityItemResponse[]> {
    const boundedLimit = Math.min(50, Math.max(1, limit));
    const records = await this.prisma.activityEvent.findMany({
      take: boundedLimit,
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      include: {
        user: { select: SAFE_ACTOR_SELECT },
        issue: { select: SAFE_ISSUE_SELECT },
        project: { select: SAFE_PROJECT_SELECT },
      },
    });

    return records.map((record) => this.formatActivity(record));
  }

  /**
   * Retrieves activities associated with a specific issue.
   */
  async findByIssue(
    issueId: string,
    _currentUser: AuthenticatedUser,
  ): Promise<ActivityItemResponse[]> {
    const issueExists = await this.prisma.issue.findUnique({
      where: { id: issueId },
      select: { id: true },
    });

    if (!issueExists) {
      throw new NotFoundException(`Issue with ID "${issueId}" not found`);
    }

    const records = await this.prisma.activityEvent.findMany({
      where: { issueId },
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      include: {
        user: { select: SAFE_ACTOR_SELECT },
        issue: { select: SAFE_ISSUE_SELECT },
        project: { select: SAFE_PROJECT_SELECT },
      },
    });

    return records.map((record) => this.formatActivity(record));
  }

  /**
   * Retrieves a single activity entry by ID.
   */
  async findOne(
    id: string,
    _currentUser: AuthenticatedUser,
  ): Promise<ActivityItemResponse> {
    const record = await this.prisma.activityEvent.findUnique({
      where: { id },
      include: {
        user: { select: SAFE_ACTOR_SELECT },
        issue: { select: SAFE_ISSUE_SELECT },
        project: { select: SAFE_PROJECT_SELECT },
      },
    });

    if (!record) {
      throw new NotFoundException(`Activity record with ID "${id}" not found`);
    }

    return this.formatActivity(record);
  }

  /**
   * Formats a raw Prisma ActivityEventWithRelations entity into a clean, predictable API response.
   */
  public formatActivity(row: ActivityEventWithRelations): ActivityItemResponse {
    const canonicalType =
      ACTION_TO_EVENT_TYPE[row.action] ||
      (row.action.toUpperCase() as ActivityEventType);

    let parsedMetadata: Record<string, unknown> = {};
    let displaySummary = row.details;

    // Detect if details contains JSON metadata or plain text
    if (
      row.details &&
      typeof row.details === 'string' &&
      row.details.trim().startsWith('{')
    ) {
      try {
        const parsed = JSON.parse(row.details);
        if (typeof parsed === 'object' && parsed !== null) {
          parsedMetadata = parsed;
          if (typeof parsed.summary === 'string') {
            displaySummary = parsed.summary;
          } else if (typeof parsed.details === 'string') {
            displaySummary = parsed.details;
          } else if (parsed.action) {
            displaySummary = `${parsed.action} on ${row.issueId || 'workspace'}`;
          }
        }
      } catch {
        // Fall back to plain text
      }
    }

    // Strictly redact internal tokens or sensitive fields
    const sanitizedMetadata: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsedMetadata)) {
      if (
        !key.toLowerCase().includes('password') &&
        !key.toLowerCase().includes('token') &&
        !key.toLowerCase().includes('secret')
      ) {
        sanitizedMetadata[key] = value;
      }
    }

    const isoTimestamp = row.timestamp.toISOString();

    return {
      id: row.id,
      type: canonicalType,
      action: row.action,
      summary: displaySummary,
      details: displaySummary,
      createdAt: isoTimestamp,
      timestamp: isoTimestamp,
      userId: row.userId,
      actor: {
        id: row.user?.id || row.userId,
        name: row.user?.name || 'Unknown User',
        email: row.user?.email,
        avatarUrl: row.user?.avatar || null,
        avatar: row.user?.avatar || '',
        role: row.user?.role,
        department: row.user?.department,
      },
      issueId: row.issueId || null,
      issue: row.issue
        ? {
            id: row.issue.id,
            key: row.issue.id,
            title: row.issue.title,
          }
        : null,
      projectId:
        row.projectId || (row.issue ? row.issue.projectId : null) || null,
      project: row.project
        ? {
            id: row.project.id,
            key: row.project.key,
            name: row.project.name,
          }
        : null,
      metadata: sanitizedMetadata,
    };
  }
}
