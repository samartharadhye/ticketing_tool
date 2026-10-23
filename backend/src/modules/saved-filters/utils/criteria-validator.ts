import { BadRequestException } from '@nestjs/common';
import {
  IssueStatus,
  IssueType,
  Priority,
  SupportLevel,
} from '@prisma/client';

import { QueryIssuesDto } from '../../issues/dto/query-issues.dto';

/**
 * Whitelist of permitted criteria keys.
 * Client cannot pass arbitrary database properties.
 */
export const ALLOWED_CRITERIA_KEYS = new Set<string>([
  'status',
  'priority',
  'type',
  'supportLevel',
  'assigneeId',
  'reporterId',
  'projectId',
  'sprintId',
  'epicId',
  'labels',
  'isEscalated',
  'createdDateFrom',
  'createdDateTo',
  'updatedDateFrom',
  'updatedDateTo',
  'dueDateFrom',
  'dueDateTo',
  'search',
  'q',
  'sortBy',
  'sortOrder',
]);

/**
 * Mapping table to normalize case-insensitive and format-variant status strings.
 */
const STATUS_MAP: Record<string, IssueStatus> = {
  open: IssueStatus.Open,
  'to do': IssueStatus.To_Do,
  todo: IssueStatus.To_Do,
  to_do: IssueStatus.To_Do,
  'in progress': IssueStatus.In_Progress,
  inprogress: IssueStatus.In_Progress,
  in_progress: IssueStatus.In_Progress,
  'in review': IssueStatus.In_Review,
  inreview: IssueStatus.In_Review,
  in_review: IssueStatus.In_Review,
  testing: IssueStatus.Testing,
  blocked: IssueStatus.Blocked,
  resolved: IssueStatus.Resolved,
  closed: IssueStatus.Closed,
};

/**
 * Mapping table to normalize case-insensitive and format-variant priority strings.
 */
const PRIORITY_MAP: Record<string, Priority> = {
  lowest: Priority.Lowest,
  low: Priority.Low,
  medium: Priority.Medium,
  high: Priority.High,
  highest: Priority.Highest,
};

/**
 * Mapping table to normalize case-insensitive and format-variant type strings.
 */
const TYPE_MAP: Record<string, IssueType> = {
  task: IssueType.Task,
  bug: IssueType.Bug,
  story: IssueType.Story,
  epic: IssueType.Epic,
  sub_task: IssueType.Sub_task,
  'sub-task': IssueType.Sub_task,
  subtask: IssueType.Sub_task,
};

/**
 * Mapping table to normalize support levels.
 */
const SUPPORT_LEVEL_MAP: Record<string, SupportLevel> = {
  l1: SupportLevel.L1,
  l2: SupportLevel.L2,
  l3: SupportLevel.L3,
};

export interface ValidatedCriteria {
  status?: IssueStatus | IssueStatus[];
  priority?: Priority | Priority[];
  type?: IssueType | IssueType[];
  supportLevel?: SupportLevel | SupportLevel[];
  assigneeId?: string;
  reporterId?: string;
  projectId?: string;
  sprintId?: string;
  epicId?: string;
  labels?: string[];
  isEscalated?: boolean;
  createdDateFrom?: string;
  createdDateTo?: string;
  updatedDateFrom?: string;
  updatedDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
  q?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class CriteriaValidator {
  /**
   * Validates raw input against whitelist, type rules, and enum boundaries.
   * Throws BadRequestException for any malformed or disallowed properties.
   */
  static validate(rawCriteria: unknown): ValidatedCriteria {
    if (
      !rawCriteria ||
      typeof rawCriteria !== 'object' ||
      Array.isArray(rawCriteria)
    ) {
      throw new BadRequestException(
        'Criteria must be a valid non-null structured object.',
      );
    }

    const criteriaObj = rawCriteria as Record<string, unknown>;

    // Prototype pollution prevention
    if (
      Object.prototype.hasOwnProperty.call(criteriaObj, '__proto__') ||
      Object.prototype.hasOwnProperty.call(criteriaObj, 'constructor') ||
      Object.prototype.hasOwnProperty.call(criteriaObj, 'prototype')
    ) {
      throw new BadRequestException('Invalid criteria payload.');
    }

    const validated: ValidatedCriteria = {};

    for (const [key, value] of Object.entries(criteriaObj)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (!ALLOWED_CRITERIA_KEYS.has(key)) {
        throw new BadRequestException(
          `Unsupported or forbidden criteria field "${key}". Only whitelisted issue attributes are permitted.`,
        );
      }

      switch (key) {
        case 'status': {
          validated.status = this.validateStatus(value);
          break;
        }
        case 'priority': {
          validated.priority = this.validatePriority(value);
          break;
        }
        case 'type': {
          validated.type = this.validateType(value);
          break;
        }
        case 'supportLevel': {
          validated.supportLevel = this.validateSupportLevel(value);
          break;
        }
        case 'assigneeId': {
          validated.assigneeId = this.validateStringOrMe(value, 'assigneeId');
          break;
        }
        case 'reporterId': {
          validated.reporterId = this.validateStringOrMe(value, 'reporterId');
          break;
        }
        case 'projectId': {
          validated.projectId = this.validateString(value, 'projectId');
          break;
        }
        case 'sprintId': {
          validated.sprintId = this.validateString(value, 'sprintId');
          break;
        }
        case 'epicId': {
          validated.epicId = this.validateString(value, 'epicId');
          break;
        }
        case 'labels': {
          validated.labels = this.validateLabels(value);
          break;
        }
        case 'isEscalated': {
          if (typeof value !== 'boolean') {
            throw new BadRequestException('isEscalated must be a boolean.');
          }
          validated.isEscalated = value;
          break;
        }
        case 'createdDateFrom':
        case 'createdDateTo':
        case 'updatedDateFrom':
        case 'updatedDateTo':
        case 'dueDateFrom':
        case 'dueDateTo': {
          const dateStr = this.validateDate(value, key);
          (validated as Record<string, unknown>)[key] = dateStr;
          break;
        }
        case 'search':
        case 'q': {
          if (typeof value !== 'string') {
            throw new BadRequestException(`${key} must be a string.`);
          }
          const trimmed = value.trim();
          if (trimmed.length > 200) {
            throw new BadRequestException(
              `${key} cannot exceed 200 characters.`,
            );
          }
          if (key === 'search') validated.search = trimmed;
          if (key === 'q') validated.q = trimmed;
          break;
        }
        case 'sortBy': {
          if (typeof value !== 'string') {
            throw new BadRequestException('sortBy must be a string.');
          }
          const allowedSort = ['createdDate', 'updatedDate', 'dueDate', 'priority', 'status', 'title', 'id'];
          if (!allowedSort.includes(value)) {
            throw new BadRequestException(
              `Invalid sortBy field "${value}". Allowed: ${allowedSort.join(', ')}`,
            );
          }
          validated.sortBy = value;
          break;
        }
        case 'sortOrder': {
          if (typeof value !== 'string') {
            throw new BadRequestException('sortOrder must be a string.');
          }
          const normalizedOrder = value.toLowerCase();
          if (normalizedOrder !== 'asc' && normalizedOrder !== 'desc') {
            throw new BadRequestException('sortOrder must be "asc" or "desc".');
          }
          validated.sortOrder = normalizedOrder as 'asc' | 'desc';
          break;
        }
      }
    }

    // Validate date range chronology
    this.validateDateRange(
      validated.createdDateFrom,
      validated.createdDateTo,
      'createdDate',
    );
    this.validateDateRange(
      validated.updatedDateFrom,
      validated.updatedDateTo,
      'updatedDate',
    );
    this.validateDateRange(
      validated.dueDateFrom,
      validated.dueDateTo,
      'dueDate',
    );

    return validated;
  }

  private static validateStatus(
    value: unknown,
  ): IssueStatus | IssueStatus[] | undefined {
    if (value === 'All' || value === 'ALL') return undefined;

    if (Array.isArray(value)) {
      if (value.length === 0) return undefined;
      return value.map((item) => this.parseStatus(item));
    }

    return this.parseStatus(value);
  }

  private static parseStatus(item: unknown): IssueStatus {
    if (typeof item !== 'string') {
      throw new BadRequestException('Status value must be a string.');
    }
    const key = item.trim().toLowerCase();
    const mapped = STATUS_MAP[key];
    if (!mapped) {
      throw new BadRequestException(
        `Invalid status value "${item}". Allowed: ${Object.values(IssueStatus).join(', ')}`,
      );
    }
    return mapped;
  }

  private static validatePriority(
    value: unknown,
  ): Priority | Priority[] | undefined {
    if (value === 'All' || value === 'ALL') return undefined;

    if (Array.isArray(value)) {
      if (value.length === 0) return undefined;
      return value.map((item) => this.parsePriority(item));
    }

    return this.parsePriority(value);
  }

  private static parsePriority(item: unknown): Priority {
    if (typeof item !== 'string') {
      throw new BadRequestException('Priority value must be a string.');
    }
    const key = item.trim().toLowerCase();
    const mapped = PRIORITY_MAP[key];
    if (!mapped) {
      throw new BadRequestException(
        `Invalid priority value "${item}". Allowed: ${Object.values(Priority).join(', ')}`,
      );
    }
    return mapped;
  }

  private static validateType(
    value: unknown,
  ): IssueType | IssueType[] | undefined {
    if (value === 'All' || value === 'ALL') return undefined;

    if (Array.isArray(value)) {
      if (value.length === 0) return undefined;
      return value.map((item) => this.parseType(item));
    }

    return this.parseType(value);
  }

  private static parseType(item: unknown): IssueType {
    if (typeof item !== 'string') {
      throw new BadRequestException('Issue type value must be a string.');
    }
    const key = item.trim().toLowerCase();
    const mapped = TYPE_MAP[key];
    if (!mapped) {
      throw new BadRequestException(
        `Invalid issue type "${item}". Allowed: ${Object.values(IssueType).join(', ')}`,
      );
    }
    return mapped;
  }

  private static validateSupportLevel(
    value: unknown,
  ): SupportLevel | SupportLevel[] | undefined {
    if (value === 'All' || value === 'ALL') return undefined;

    if (Array.isArray(value)) {
      if (value.length === 0) return undefined;
      return value.map((item) => this.parseSupportLevel(item));
    }

    return this.parseSupportLevel(value);
  }

  private static parseSupportLevel(item: unknown): SupportLevel {
    if (typeof item !== 'string') {
      throw new BadRequestException('Support level must be a string.');
    }
    const key = item.trim().toLowerCase();
    const mapped = SUPPORT_LEVEL_MAP[key];
    if (!mapped) {
      throw new BadRequestException(
        `Invalid support level "${item}". Allowed: L1, L2, L3`,
      );
    }
    return mapped;
  }

  private static validateString(value: unknown, fieldName: string): string | undefined {
    if (value === 'All' || value === 'ALL') return undefined;
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string.`);
    }
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${fieldName} cannot be empty.`);
    }
    return trimmed;
  }

  private static validateStringOrMe(
    value: unknown,
    fieldName: string,
  ): string | undefined {
    if (value === 'All' || value === 'ALL') return undefined;
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string.`);
    }
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${fieldName} cannot be empty.`);
    }
    return trimmed;
  }

  private static validateLabels(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((label, idx) => {
        if (typeof label !== 'string' || !label.trim()) {
          throw new BadRequestException(
            `Label at index ${idx} must be a non-empty string.`,
          );
        }
        return label.trim();
      });
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];
      return [trimmed];
    }

    throw new BadRequestException('Labels must be an array of strings or a string.');
  }

  private static validateDate(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be an ISO-8601 date string.`);
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(
        `${fieldName} contains an invalid date format: "${value}". Expected ISO-8601 format.`,
      );
    }
    return date.toISOString();
  }

  private static validateDateRange(
    from: string | undefined,
    to: string | undefined,
    rangeName: string,
  ): void {
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (fromDate > toDate) {
        throw new BadRequestException(
          `Invalid date range for ${rangeName}: ${rangeName}From cannot be after ${rangeName}To.`,
        );
      }
    }
  }

  /**
   * Safely translates validated criteria into QueryIssuesDto for execution.
   */
  static toQueryIssuesDto(
    criteria: ValidatedCriteria,
    currentUserId?: string,
    overrides?: Partial<QueryIssuesDto>,
  ): QueryIssuesDto {
    const query = new QueryIssuesDto();

    query.status = criteria.status;
    query.priority = criteria.priority;
    query.type = criteria.type;
    query.supportLevel = criteria.supportLevel;
    query.assigneeId = criteria.assigneeId === 'me' && currentUserId ? currentUserId : criteria.assigneeId;
    query.reporterId = criteria.reporterId === 'me' && currentUserId ? currentUserId : criteria.reporterId;
    query.projectId = criteria.projectId;
    query.sprintId = criteria.sprintId;
    query.epicId = criteria.epicId;
    query.labels = criteria.labels;
    query.isEscalated = criteria.isEscalated;
    query.createdDateFrom = criteria.createdDateFrom;
    query.createdDateTo = criteria.createdDateTo;
    query.updatedDateFrom = criteria.updatedDateFrom;
    query.updatedDateTo = criteria.updatedDateTo;
    query.dueDateFrom = criteria.dueDateFrom;
    query.dueDateTo = criteria.dueDateTo;
    query.q = criteria.q || criteria.search;
    query.sortBy = criteria.sortBy || 'createdDate';
    query.sortOrder = criteria.sortOrder || 'desc';

    if (overrides) {
      if (overrides.take !== undefined) query.take = overrides.take;
      if (overrides.skip !== undefined) query.skip = overrides.skip;
      if (overrides.sortBy !== undefined) query.sortBy = overrides.sortBy;
      if (overrides.sortOrder !== undefined) query.sortOrder = overrides.sortOrder;
      if (overrides.q !== undefined || overrides.search !== undefined) {
        query.q = overrides.q || overrides.search;
      }
    }

    return query;
  }
}
