import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SavedFilter } from '@prisma/client';

import { IssuesService, IssueWithRelations, PaginatedIssuesResult } from '../issues/issues.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplyFilterQueryDto } from './dto/apply-filter-query.dto';
import { CreateFilterDto } from './dto/create-filter.dto';
import { QuerySavedFiltersDto } from './dto/query-saved-filters.dto';
import { UpdateFilterDto } from './dto/update-filter.dto';
import { CriteriaValidator } from './utils/criteria-validator';

export interface SavedFilterResponse {
  id: string;
  name: string;
  criteria: Record<string, unknown>;
  filters: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export function formatSavedFilter(filter: any): SavedFilterResponse {
  const rawCriteria = filter.filters ?? filter.criteria;
  const criteriaObj =
    rawCriteria &&
      typeof rawCriteria === 'object' &&
      !Array.isArray(rawCriteria)
      ? (rawCriteria as Record<string, unknown>)
      : {};

  return {
    id: filter.id,
    name: filter.name,
    criteria: criteriaObj,
    filters: criteriaObj,
    createdAt: filter.createdAt ?? new Date(),
    updatedAt: filter.updatedAt ?? new Date(),
  };
}

@Injectable()
export class SavedFiltersService {
  private readonly logger = new Logger(SavedFiltersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly issuesService: IssuesService,
  ) { }

  /**
   * Creates and persists a new saved filter for the authenticated user.
   *
   * @param dto Validated creation payload containing name and filter criteria.
   * @param userId Authenticated user identifier (owner).
   * @returns Formatted SavedFilterResponse.
   */
  async create(
    dto: CreateFilterDto,
    userId: string,
  ): Promise<SavedFilterResponse> {
    const rawCriteria = dto.getCriteria();
    const validatedCriteria = CriteriaValidator.validate(rawCriteria);

    const savedFilter = await this.prisma.savedFilter.create({
      data: {
        name: dto.name.trim(),
        criteria: validatedCriteria as unknown as Prisma.InputJsonValue,
        userId,
      } as any,
    });

    this.logger.log(
      `Created saved filter "${savedFilter.name}" (${savedFilter.id}) for user ${userId}`,
    );

    return formatSavedFilter(savedFilter);
  }

  /**
   * Retrieves all saved filters owned by the authenticated user with deterministic ordering.
   *
   * @param userId Authenticated user identifier.
   * @param query Optional pagination and search filters.
   * @returns Array of saved filters owned by the user.
   */
  async findAll(
    userId: string,
    query?: QuerySavedFiltersDto,
  ): Promise<SavedFilterResponse[]> {
    const where: Prisma.SavedFilterWhereInput = {
      userId,
    };

    if (query?.search && query.search.trim()) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    const filters = await this.prisma.savedFilter.findMany({
      where,
      orderBy: {
        updatedAt: 'desc',
      } as any,
      take: query?.take ?? 50,
      skip: query?.skip ?? 0,
    });

    return filters.map(formatSavedFilter);
  }

  /**
   * Retrieves a single saved filter by ID, strictly enforcing that it belongs to the authenticated user.
   *
   * @param id Saved filter ID.
   * @param userId Authenticated user identifier.
   * @returns The owned saved filter.
   * @throws NotFoundException if the filter does not exist or belongs to another user.
   */
  async findOne(
    id: string,
    userId: string,
  ): Promise<SavedFilterResponse> {
    const filter = await this.prisma.savedFilter.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!filter) {
      throw new NotFoundException(`Saved filter with ID "${id}" not found`);
    }

    return formatSavedFilter(filter);
  }

  /**
   * Partially updates a saved filter's name and/or criteria.
   * Strictly enforces ownership at the database query level.
   *
   * @param id Saved filter ID.
   * @param dto Validated update payload.
   * @param userId Authenticated user identifier.
   * @returns The updated saved filter.
   * @throws NotFoundException if the filter does not exist or belongs to another user.
   */
  async update(
    id: string,
    dto: UpdateFilterDto,
    userId: string,
  ): Promise<SavedFilterResponse> {
    // Scoped check to ensure filter exists and is owned by the user
    const existing = await this.prisma.savedFilter.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Saved filter with ID "${id}" not found`);
    }

    const dataToUpdate: Prisma.SavedFilterUpdateInput = {};

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) {
        throw new BadRequestException('name cannot be empty or whitespace-only');
      }
      dataToUpdate.name = trimmedName;
    }

    const criteriaUpdate = dto.getCriteria();
    if (criteriaUpdate !== undefined) {
      const validatedCriteria = CriteriaValidator.validate(criteriaUpdate);
      (dataToUpdate as any).criteria = validatedCriteria as unknown as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.savedFilter.update({
      where: { id },
      data: dataToUpdate,
    });

    this.logger.log(
      `Updated saved filter "${updated.name}" (${updated.id}) by user ${userId}`,
    );

    return formatSavedFilter(updated);
  }

  /**
   * Deletes a saved filter. Strictly enforces ownership at the database query level.
   *
   * @param id Saved filter ID.
   * @param userId Authenticated user identifier.
   * @returns Success confirmation object.
   * @throws NotFoundException if the filter does not exist or belongs to another user.
   */
  async remove(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; id: string }> {
    const existing = await this.prisma.savedFilter.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Saved filter with ID "${id}" not found`);
    }

    await this.prisma.savedFilter.delete({
      where: { id },
    });

    this.logger.log(`Deleted saved filter ${id} by user ${userId}`);

    return { success: true, id };
  }

  /**
   * Alias for remove to support diverse test conventions.
   */
  async delete(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.remove(id, userId);
  }

  /**
   * Applies a saved filter: loads persisted criteria, validates them, translates
   * them into QueryIssuesDto, and executes search through the existing IssuesService.
   *
   * @param id Saved filter ID.
   * @param userId Authenticated user identifier.
   * @param overrides Optional query overrides for pagination/sorting.
   * @returns Matching issues with pagination.
   * @throws NotFoundException if the filter does not exist or belongs to another user.
   */
  async apply(
    id: string,
    userId: string,
    overrides?: ApplyFilterQueryDto,
  ): Promise<IssueWithRelations[] | PaginatedIssuesResult> {
    const filter = await this.prisma.savedFilter.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!filter) {
      throw new NotFoundException(`Saved filter with ID "${id}" not found`);
    }

    // Protect against outdated or malformed persisted data
    const rawCriteria = (filter as any).filters ?? (filter as any).criteria;
    const validatedCriteria = CriteriaValidator.validate(rawCriteria);

    // Safely translate validated criteria to QueryIssuesDto
    const queryIssuesDto = CriteriaValidator.toQueryIssuesDto(
      validatedCriteria,
      userId,
      overrides,
    );

    // Delegate directly to the existing IssuesService
    return this.issuesService.findMany(queryIssuesDto, userId);
  }

  /**
   * Applies a saved filter and returns paginated result with count.
   */
  async applyWithCount(
    id: string,
    userId: string,
    overrides?: ApplyFilterQueryDto,
  ): Promise<PaginatedIssuesResult> {
    const filter = await this.prisma.savedFilter.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!filter) {
      throw new NotFoundException(`Saved filter with ID "${id}" not found`);
    }

    const rawCriteria = (filter as any).filters ?? (filter as any).criteria;
    const validatedCriteria = CriteriaValidator.validate(rawCriteria);
    const queryIssuesDto = CriteriaValidator.toQueryIssuesDto(
      validatedCriteria,
      userId,
      overrides,
    );

    return this.issuesService.findManyWithCount(queryIssuesDto, userId);
  }
}
