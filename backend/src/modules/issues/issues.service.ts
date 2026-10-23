import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  CommentType,
  IssueStatus,
  Prisma,
  SupportLevel,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ActivityEventType } from '../activity/activity.types';
import { ActivityService } from '../activity/activity.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { EscalateIssueDto } from './dto/escalate-issue.dto';
import { QueryIssuesDto } from './dto/query-issues.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

export const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  avatar: true,
  status: true,
} as const;

export const ISSUE_INCLUDE_RELATIONS = {
  assignee: { select: SAFE_USER_SELECT },
  reporter: { select: SAFE_USER_SELECT },
  project: {
    select: {
      id: true,
      key: true,
      name: true,
      status: true,
    },
  },
  sprint: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
  epic: {
    select: {
      id: true,
      name: true,
      status: true,
      color: true,
    },
  },
  _count: {
    select: {
      comments: true,
      attachments: true,
    },
  },
} as const;

export type IssueWithRelations = Prisma.IssueGetPayload<{
  include: typeof ISSUE_INCLUDE_RELATIONS;
}>;

export interface PaginatedIssuesResult {
  items: IssueWithRelations[];
  total: number;
  take: number;
  skip: number;
}

@Injectable()
export class IssuesService {
  private readonly logger = new Logger(IssuesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly activityService?: ActivityService,
  ) {}

  /**
   * Builds safe, typed Prisma IssueWhereInput from validated query DTO.
   */
  public buildWhereClause(
    dto: QueryIssuesDto,
    currentUserId?: string,
  ): Prisma.IssueWhereInput {
    const where: Prisma.IssueWhereInput = {};
    const conditions: Prisma.IssueWhereInput[] = [];

    // Search query on title, description, id, or labels
    const searchTerm = (dto.q || dto.search || '').trim();
    if (searchTerm) {
      conditions.push({
        OR: [
          { id: { contains: searchTerm, mode: 'insensitive' } },
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { labels: { has: searchTerm } },
        ],
      });
    }

    // Status filter
    if (dto.status) {
      if (Array.isArray(dto.status)) {
        if (dto.status.length > 0) {
          conditions.push({ status: { in: dto.status } });
        }
      } else {
        conditions.push({ status: dto.status });
      }
    }

    // Priority filter
    if (dto.priority) {
      if (Array.isArray(dto.priority)) {
        if (dto.priority.length > 0) {
          conditions.push({ priority: { in: dto.priority } });
        }
      } else {
        conditions.push({ priority: dto.priority });
      }
    }

    // Issue Type filter
    if (dto.type) {
      if (Array.isArray(dto.type)) {
        if (dto.type.length > 0) {
          conditions.push({ type: { in: dto.type } });
        }
      } else {
        conditions.push({ type: dto.type });
      }
    }

    // Support Level filter
    if (dto.supportLevel) {
      if (Array.isArray(dto.supportLevel)) {
        if (dto.supportLevel.length > 0) {
          conditions.push({ supportLevel: { in: dto.supportLevel } });
        }
      } else {
        conditions.push({ supportLevel: dto.supportLevel });
      }
    }

    // Assignee filter
    if (dto.assigneeId !== undefined) {
      if (dto.assigneeId === 'unassigned') {
        conditions.push({ assigneeId: null });
      } else if (dto.assigneeId === 'me' && currentUserId) {
        conditions.push({ assigneeId: currentUserId });
      } else if (dto.assigneeId && dto.assigneeId !== 'All' && dto.assigneeId !== 'ALL') {
        conditions.push({ assigneeId: dto.assigneeId });
      }
    }

    // Reporter filter
    if (dto.reporterId !== undefined) {
      if (dto.reporterId === 'me' && currentUserId) {
        conditions.push({ reporterId: currentUserId });
      } else if (dto.reporterId && dto.reporterId !== 'All' && dto.reporterId !== 'ALL') {
        conditions.push({ reporterId: dto.reporterId });
      }
    }

    // Project filter
    if (dto.projectId && dto.projectId !== 'All' && dto.projectId !== 'ALL') {
      conditions.push({ projectId: dto.projectId });
    }

    // Sprint filter
    if (dto.sprintId !== undefined) {
      if (dto.sprintId === 'backlog' || dto.sprintId === 'unassigned') {
        conditions.push({ sprintId: null });
      } else if (dto.sprintId && dto.sprintId !== 'All' && dto.sprintId !== 'ALL') {
        conditions.push({ sprintId: dto.sprintId });
      }
    }

    // Epic filter
    if (dto.epicId && dto.epicId !== 'All' && dto.epicId !== 'ALL') {
      conditions.push({ epicId: dto.epicId });
    }

    // Labels filter
    if (dto.labels && dto.labels.length > 0) {
      conditions.push({ labels: { hasSome: dto.labels } });
    }

    // Escalated flag
    if (dto.isEscalated !== undefined) {
      conditions.push({ isEscalated: dto.isEscalated });
    }

    // Date range filters
    if (dto.createdDateFrom || dto.createdDateTo) {
      const createdDateFilter: Prisma.DateTimeFilter = {};
      if (dto.createdDateFrom) createdDateFilter.gte = new Date(dto.createdDateFrom);
      if (dto.createdDateTo) createdDateFilter.lte = new Date(dto.createdDateTo);
      conditions.push({ createdDate: createdDateFilter });
    }

    if (dto.updatedDateFrom || dto.updatedDateTo) {
      const updatedDateFilter: Prisma.DateTimeFilter = {};
      if (dto.updatedDateFrom) updatedDateFilter.gte = new Date(dto.updatedDateFrom);
      if (dto.updatedDateTo) updatedDateFilter.lte = new Date(dto.updatedDateTo);
      conditions.push({ updatedDate: updatedDateFilter });
    }

    if (dto.dueDateFrom || dto.dueDateTo) {
      const dueDateFilter: Prisma.DateTimeNullableFilter = {};
      if (dto.dueDateFrom) dueDateFilter.gte = new Date(dto.dueDateFrom);
      if (dto.dueDateTo) dueDateFilter.lte = new Date(dto.dueDateTo);
      conditions.push({ dueDate: dueDateFilter });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    return where;
  }

  /**
   * Executes issue search with pagination and sorting.
   */
  async findMany(
    dto: QueryIssuesDto,
    currentUserId?: string,
  ): Promise<IssueWithRelations[]> {
    const where = this.buildWhereClause(dto, currentUserId);
    const take = dto.take ?? 50;
    const skip = dto.skip ?? 0;
    const sortBy = dto.sortBy || 'createdDate';
    const sortOrder = (dto.sortOrder || 'desc').toLowerCase() as Prisma.SortOrder;

    return this.prisma.issue.findMany({
      where,
      take,
      skip,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: ISSUE_INCLUDE_RELATIONS,
    });
  }

  /**
   * Executes issue search and returns results along with total count.
   */
  async findManyWithCount(
    dto: QueryIssuesDto,
    currentUserId?: string,
  ): Promise<PaginatedIssuesResult> {
    const where = this.buildWhereClause(dto, currentUserId);
    const take = dto.take ?? 50;
    const skip = dto.skip ?? 0;
    const sortBy = dto.sortBy || 'createdDate';
    const sortOrder = (dto.sortOrder || 'desc').toLowerCase() as Prisma.SortOrder;

    const [items, total] = await Promise.all([
      this.prisma.issue.findMany({
        where,
        take,
        skip,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: ISSUE_INCLUDE_RELATIONS,
      }),
      this.prisma.issue.count({ where }),
    ]);

    return {
      items,
      total,
      take,
      skip,
    };
  }

  /**
   * Retrieves single issue with relations.
   */
  async findOne(id: string): Promise<IssueWithRelations> {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: ISSUE_INCLUDE_RELATIONS,
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID "${id}" not found`);
    }

    return issue;
  }

  /**
   * Creates a new issue, calculates SLA deadlines, and records ISSUE_CREATED audit activity.
   */
  async create(
    dto: CreateIssueDto,
    actorId: string,
  ): Promise<IssueWithRelations> {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      select: { id: true, key: true },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID "${dto.projectId}" not found`);
    }

    // Determine sequence number for issue key (e.g. INB-1039)
    const latestIssue = await this.prisma.issue.findFirst({
      where: { projectId: dto.projectId },
      orderBy: { createdDate: 'desc' },
      select: { id: true },
    });

    let nextNumber = 1001;
    if (latestIssue && latestIssue.id.includes('-')) {
      const parts = latestIssue.id.split('-');
      const parsedNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(parsedNum)) {
        nextNumber = parsedNum + 1;
      }
    }
    const generatedId = `${project.key}-${nextNumber}`;

    const executeOperation = async (tx: Prisma.TransactionClient) => {
      const created = await tx.issue.create({
        data: {
          id: generatedId,
          projectId: dto.projectId,
          title: dto.title.trim(),
          description: dto.description || '',
          type: dto.type,
          status: dto.status,
          priority: dto.priority,
          supportLevel: dto.supportLevel,
          assigneeId: dto.assigneeId || null,
          reporterId: actorId,
          sprintId: dto.sprintId || null,
          epicId: dto.epicId || null,
          labels: dto.labels || [],
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          storyPoints: dto.storyPoints || null,
          estimatedTime: dto.estimatedTime || null,
        },
        include: ISSUE_INCLUDE_RELATIONS,
      });

      if (this.activityService) {
        await this.activityService.recordActivity({
          actorId,
          type: ActivityEventType.ISSUE_CREATED,
          action: 'created',
          summary: `created ticket ${created.id} "${created.title}"`,
          details: `created ticket ${created.id} "${created.title}"`,
          issueId: created.id,
          projectId: created.projectId,
          metadata: {
            priority: created.priority,
            type: created.type,
            supportLevel: created.supportLevel,
          },
          tx,
        });
      }

      return created;
    };

    if (typeof this.prisma.$transaction === 'function') {
      return this.prisma.$transaction(executeOperation);
    }
    return executeOperation(this.prisma);
  }

  /**
   * Updates an issue and audits any changed status, priority, or assignee.
   */
  async update(
    id: string,
    dto: UpdateIssueDto,
    actorId: string,
  ): Promise<IssueWithRelations> {
    const existing = await this.prisma.issue.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Issue with ID "${id}" not found`);
    }

    const executeOperation = async (tx: Prisma.TransactionClient) => {
      const updated = await tx.issue.update({
        where: { id },
        data: {
          title: dto.title?.trim(),
          description: dto.description,
          type: dto.type,
          status: dto.status,
          priority: dto.priority,
          supportLevel: dto.supportLevel,
          assigneeId: dto.assigneeId !== undefined ? dto.assigneeId : undefined,
          projectId: dto.projectId,
          sprintId: dto.sprintId !== undefined ? dto.sprintId : undefined,
          epicId: dto.epicId !== undefined ? dto.epicId : undefined,
          labels: dto.labels,
          dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
          storyPoints: dto.storyPoints !== undefined ? dto.storyPoints : undefined,
          estimatedTime: dto.estimatedTime !== undefined ? dto.estimatedTime : undefined,
          isEscalated: dto.isEscalated,
        },
        include: ISSUE_INCLUDE_RELATIONS,
      });

      if (this.activityService) {
        // 1. Audit status change
        if (dto.status && dto.status !== existing.status) {
          const fromStr = existing.status.replace(/_/g, ' ');
          const toStr = dto.status.replace(/_/g, ' ');
          await this.activityService.recordActivity({
            actorId,
            type: ActivityEventType.ISSUE_STATUS_CHANGED,
            action: 'status_changed',
            summary: `Changed status of ${id} from ${fromStr} to ${toStr}`,
            details: `Changed status of ${id} from ${fromStr} to ${toStr}`,
            issueId: id,
            projectId: existing.projectId,
            metadata: {
              previousStatus: existing.status,
              newStatus: dto.status,
            },
            tx,
          });
        }

        // 2. Audit priority change
        if (dto.priority && dto.priority !== existing.priority) {
          await this.activityService.recordActivity({
            actorId,
            type: ActivityEventType.ISSUE_PRIORITY_CHANGED,
            action: 'priority_changed',
            summary: `Changed priority of ${id} from ${existing.priority} to ${dto.priority}`,
            details: `Changed priority of ${id} from ${existing.priority} to ${dto.priority}`,
            issueId: id,
            projectId: existing.projectId,
            metadata: {
              previousPriority: existing.priority,
              newPriority: dto.priority,
            },
            tx,
          });
        }

        // 3. Audit assignment / reassignment
        if (dto.assigneeId !== undefined && dto.assigneeId !== existing.assigneeId) {
          let newAssigneeName = 'unassigned';
          if (dto.assigneeId) {
            const newAssignee = await tx.user.findUnique({
              where: { id: dto.assigneeId },
              select: { name: true },
            });
            newAssigneeName = newAssignee?.name || dto.assigneeId;
          }

          const isReassignment = existing.assigneeId !== null && dto.assigneeId !== null;
          const eventType = isReassignment
            ? ActivityEventType.ISSUE_REASSIGNED
            : ActivityEventType.ISSUE_ASSIGNED;
          const verb = isReassignment ? 'reassigned' : 'assigned';

          await this.activityService.recordActivity({
            actorId,
            type: eventType,
            action: 'assigned',
            summary: `${verb} ${id} to ${newAssigneeName}`,
            details: `${verb} ${id} to ${newAssigneeName}`,
            issueId: id,
            projectId: existing.projectId,
            metadata: {
              previousAssigneeId: existing.assigneeId,
              newAssigneeId: dto.assigneeId,
            },
            tx,
          });
        }

        // 4. General update if neither status, priority, nor assignment changed
        const hasMajorEvent =
          (dto.status && dto.status !== existing.status) ||
          (dto.priority && dto.priority !== existing.priority) ||
          (dto.assigneeId !== undefined && dto.assigneeId !== existing.assigneeId);

        if (!hasMajorEvent) {
          await this.activityService.recordActivity({
            actorId,
            type: ActivityEventType.ISSUE_UPDATED,
            action: 'updated',
            summary: `Updated attributes on issue ${id}`,
            details: `Updated attributes on issue ${id}`,
            issueId: id,
            projectId: existing.projectId,
            tx,
          });
        }
      }

      return updated;
    };

    if (typeof this.prisma.$transaction === 'function') {
      return this.prisma.$transaction(executeOperation);
    }
    return executeOperation(this.prisma);
  }

  /**
   * Updates only issue status and records audit event if changed.
   */
  async updateStatus(
    id: string,
    status: IssueStatus,
    actorId: string,
  ): Promise<IssueWithRelations> {
    const existing = await this.prisma.issue.findUnique({
      where: { id },
      include: ISSUE_INCLUDE_RELATIONS,
    });

    if (!existing) {
      throw new NotFoundException(`Issue with ID "${id}" not found`);
    }

    // Guard: Do not create redundant status-change events if status is unchanged
    if (existing.status === status) {
      return existing;
    }

    const executeOperation = async (tx: Prisma.TransactionClient) => {
      const updated = await tx.issue.update({
        where: { id },
        data: { status },
        include: ISSUE_INCLUDE_RELATIONS,
      });

      if (this.activityService) {
        const fromStr = existing.status.replace(/_/g, ' ');
        const toStr = status.replace(/_/g, ' ');
        await this.activityService.recordActivity({
          actorId,
          type: ActivityEventType.ISSUE_STATUS_CHANGED,
          action: 'status_changed',
          summary: `Changed status of ${id} from ${fromStr} to ${toStr}`,
          details: `Changed status of ${id} from ${fromStr} to ${toStr}`,
          issueId: id,
          projectId: existing.projectId,
          metadata: {
            previousStatus: existing.status,
            newStatus: status,
          },
          tx,
        });
      }

      return updated;
    };

    if (typeof this.prisma.$transaction === 'function') {
      return this.prisma.$transaction(executeOperation);
    }
    return executeOperation(this.prisma);
  }

  /**
   * Assigns or reassigns an issue to a user.
   */
  async assign(
    id: string,
    assigneeId: string | null,
    actorId: string,
  ): Promise<IssueWithRelations> {
    const existing = await this.prisma.issue.findUnique({
      where: { id },
      include: ISSUE_INCLUDE_RELATIONS,
    });

    if (!existing) {
      throw new NotFoundException(`Issue with ID "${id}" not found`);
    }

    if (existing.assigneeId === assigneeId) {
      return existing;
    }

    const executeOperation = async (tx: Prisma.TransactionClient) => {
      let assigneeName = 'unassigned';
      if (assigneeId) {
        const user = await tx.user.findUnique({
          where: { id: assigneeId },
          select: { name: true },
        });
        assigneeName = user?.name || assigneeId;
      }

      const updated = await tx.issue.update({
        where: { id },
        data: { assigneeId },
        include: ISSUE_INCLUDE_RELATIONS,
      });

      if (this.activityService) {
        const isReassignment = existing.assigneeId !== null && assigneeId !== null;
        const verb = isReassignment ? 'reassigned' : 'assigned';
        const eventType = isReassignment
          ? ActivityEventType.ISSUE_REASSIGNED
          : ActivityEventType.ISSUE_ASSIGNED;

        await this.activityService.recordActivity({
          actorId,
          type: eventType,
          action: 'assigned',
          summary: `${verb} ${id} to ${assigneeName}`,
          details: `${verb} ${id} to ${assigneeName}`,
          issueId: id,
          projectId: existing.projectId,
          metadata: {
            previousAssigneeId: existing.assigneeId,
            newAssigneeId: assigneeId,
          },
          tx,
        });
      }

      return updated;
    };

    if (typeof this.prisma.$transaction === 'function') {
      return this.prisma.$transaction(executeOperation);
    }
    return executeOperation(this.prisma);
  }

  /**
   * Executes support tier escalation with escalation record, internal note, and audit log.
   */
  async escalate(
    id: string,
    dto: EscalateIssueDto,
    actorId: string,
  ): Promise<IssueWithRelations> {
    const existing = await this.prisma.issue.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Issue with ID "${id}" not found`);
    }

    const executeOperation = async (tx: Prisma.TransactionClient) => {
      // 1. Create EscalationRecord
      await tx.escalationRecord.create({
        data: {
          issueId: id,
          fromLevel: existing.supportLevel,
          toLevel: dto.toLevel,
          reason: dto.reason,
          escalatedByUserId: actorId,
          assignedToUserId: dto.assignedToUserId || existing.assigneeId,
        },
      });

      // 2. Insert auto-generated internal escalation note
      await tx.comment.create({
        data: {
          issueId: id,
          authorId: actorId,
          type: CommentType.internal,
          content: `[Internal Escalation Note] Escalated from ${existing.supportLevel} to ${dto.toLevel}.\nReason: ${dto.reason}`,
        },
      });

      // 3. Record ISSUE_ESCALATED audit event
      if (this.activityService) {
        await this.activityService.recordActivity({
          actorId,
          type: ActivityEventType.ISSUE_ESCALATED,
          action: 'escalated',
          summary: `escalated ${id} from ${existing.supportLevel} to ${dto.toLevel} (Reason: ${dto.reason})`,
          details: `escalated ${id} from ${existing.supportLevel} to ${dto.toLevel} (Reason: ${dto.reason})`,
          issueId: id,
          projectId: existing.projectId,
          metadata: {
            fromLevel: existing.supportLevel,
            toLevel: dto.toLevel,
            reason: dto.reason,
            assignedToUserId: dto.assignedToUserId || null,
          },
          tx,
        });
      }

      // 4. Update the issue
      return tx.issue.update({
        where: { id },
        data: {
          supportLevel: dto.toLevel,
          isEscalated: true,
          assigneeId: dto.assignedToUserId ?? existing.assigneeId,
        },
        include: ISSUE_INCLUDE_RELATIONS,
      });
    };

    if (typeof this.prisma.$transaction === 'function') {
      return this.prisma.$transaction(executeOperation);
    }
    return executeOperation(this.prisma);
  }
}
