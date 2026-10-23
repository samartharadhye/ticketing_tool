import { Prisma } from '@prisma/client';

/**
 * Standardized, canonical domain activity event types.
 */
export enum ActivityEventType {
  ISSUE_CREATED = 'ISSUE_CREATED',
  ISSUE_UPDATED = 'ISSUE_UPDATED',
  ISSUE_ASSIGNED = 'ISSUE_ASSIGNED',
  ISSUE_REASSIGNED = 'ISSUE_REASSIGNED',
  ISSUE_STATUS_CHANGED = 'ISSUE_STATUS_CHANGED',
  ISSUE_PRIORITY_CHANGED = 'ISSUE_PRIORITY_CHANGED',
  ISSUE_ESCALATED = 'ISSUE_ESCALATED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  COMMENT_UPDATED = 'COMMENT_UPDATED',
  COMMENT_DELETED = 'COMMENT_DELETED',
  ATTACHMENT_ADDED = 'ATTACHMENT_ADDED',
  ATTACHMENT_DELETED = 'ATTACHMENT_DELETED',
  ISSUE_DELETED = 'ISSUE_DELETED',
  SPRINT_CREATED = 'SPRINT_CREATED',
  SPRINT_STARTED = 'SPRINT_STARTED',
  SPRINT_COMPLETED = 'SPRINT_COMPLETED',
  SPRINT_DELETED = 'SPRINT_DELETED',
}

/**
 * Maps high-level event types to legacy/shorthand database action strings.
 */
export const EVENT_TYPE_TO_ACTION: Record<string, string> = {
  ISSUE_CREATED: 'created',
  ISSUE_UPDATED: 'updated',
  ISSUE_ASSIGNED: 'assigned',
  ISSUE_REASSIGNED: 'reassigned',
  ISSUE_STATUS_CHANGED: 'status_changed',
  ISSUE_PRIORITY_CHANGED: 'priority_changed',
  ISSUE_ESCALATED: 'escalated',
  COMMENT_ADDED: 'comment_added',
  COMMENT_UPDATED: 'comment_updated',
  COMMENT_DELETED: 'comment_deleted',
  ATTACHMENT_ADDED: 'attachment_added',
  ATTACHMENT_DELETED: 'attachment_deleted',
  ISSUE_DELETED: 'deleted',
  SPRINT_CREATED: 'sprint_created',
  SPRINT_STARTED: 'sprint_started',
  SPRINT_COMPLETED: 'sprint_completed',
  SPRINT_DELETED: 'sprint_deleted',
};

/**
 * Maps lowercase or legacy action strings to canonical ActivityEventType.
 */
export const ACTION_TO_EVENT_TYPE: Record<string, ActivityEventType> = {
  created: ActivityEventType.ISSUE_CREATED,
  issue_created: ActivityEventType.ISSUE_CREATED,
  updated: ActivityEventType.ISSUE_UPDATED,
  issue_updated: ActivityEventType.ISSUE_UPDATED,
  assigned: ActivityEventType.ISSUE_ASSIGNED,
  issue_assigned: ActivityEventType.ISSUE_ASSIGNED,
  reassigned: ActivityEventType.ISSUE_REASSIGNED,
  issue_reassigned: ActivityEventType.ISSUE_REASSIGNED,
  status_changed: ActivityEventType.ISSUE_STATUS_CHANGED,
  issue_status_changed: ActivityEventType.ISSUE_STATUS_CHANGED,
  priority_changed: ActivityEventType.ISSUE_PRIORITY_CHANGED,
  issue_priority_changed: ActivityEventType.ISSUE_PRIORITY_CHANGED,
  escalated: ActivityEventType.ISSUE_ESCALATED,
  issue_escalated: ActivityEventType.ISSUE_ESCALATED,
  commented: ActivityEventType.COMMENT_ADDED,
  comment_added: ActivityEventType.COMMENT_ADDED,
  comment_updated: ActivityEventType.COMMENT_UPDATED,
  comment_deleted: ActivityEventType.COMMENT_DELETED,
  attachment_added: ActivityEventType.ATTACHMENT_ADDED,
  attachment_deleted: ActivityEventType.ATTACHMENT_DELETED,
  deleted: ActivityEventType.ISSUE_DELETED,
  issue_deleted: ActivityEventType.ISSUE_DELETED,
  sprint_created: ActivityEventType.SPRINT_CREATED,
  sprint_started: ActivityEventType.SPRINT_STARTED,
  sprint_completed: ActivityEventType.SPRINT_COMPLETED,
  sprint_deleted: ActivityEventType.SPRINT_DELETED,
};

/**
 * Projection fields for actor relation in activity queries.
 */
export const SAFE_ACTOR_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  role: true,
  department: true,
} as const;

/**
 * Projection fields for issue relation in activity queries.
 */
export const SAFE_ISSUE_SELECT = {
  id: true,
  title: true,
  projectId: true,
} as const;

/**
 * Projection fields for project relation in activity queries.
 */
export const SAFE_PROJECT_SELECT = {
  id: true,
  key: true,
  name: true,
} as const;

export type ActivityEventWithRelations = Prisma.ActivityEventGetPayload<{
  include: {
    user: { select: typeof SAFE_ACTOR_SELECT };
    issue: { select: typeof SAFE_ISSUE_SELECT };
    project: { select: typeof SAFE_PROJECT_SELECT };
  };
}>;

export interface ActivityActor {
  id: string;
  name: string;
  email?: string;
  avatarUrl: string | null;
  avatar?: string;
  role?: string;
  department?: string;
}

export interface ActivityIssue {
  id: string;
  key: string;
  title: string;
}

export interface ActivityProject {
  id: string;
  key: string;
  name: string;
}

export interface ActivityItemResponse {
  id: string;
  type: ActivityEventType | string;
  action: string;
  summary: string;
  details: string;
  createdAt: string;
  timestamp: string;
  userId: string;
  actor: ActivityActor;
  issueId: string | null;
  issue: ActivityIssue | null;
  projectId: string | null;
  project: ActivityProject | null;
  metadata: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedActivityResponse {
  data: ActivityItemResponse[];
  meta: PaginationMeta;
}

export interface RecordActivityOptions {
  actorId: string;
  type: ActivityEventType | string;
  action?: string;
  summary?: string;
  details?: string;
  issueId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
}
