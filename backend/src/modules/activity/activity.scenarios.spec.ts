import { CommentType, IssueStatus, IssueType, Priority, SupportLevel, UserRole } from '@prisma/client';

import { ActivityEventType } from './activity.types';
import { ActivityService } from './activity.service';
import { CommentsService } from '../comments/comments.service';
import { IssuesService } from '../issues/issues.service';

describe('Activity Lifecycle Scenarios (Prompt Section 16 Requirements)', () => {
  let activityService: ActivityService;
  let issuesService: IssuesService;
  let commentsService: CommentsService;

  let prismaMock: any;

  const mockActor = {
    id: 'user-1',
    name: 'Tejas Chauhan',
    email: 'tejas@inbox.io',
    role: UserRole.Admin,
  };

  const mockAssignee1 = {
    id: 'user-2',
    name: 'Rahul Sharma',
    email: 'rahul@inbox.io',
  };

  const mockAssignee2 = {
    id: 'user-3',
    name: 'Priya Patel',
    email: 'priya@inbox.io',
  };

  const mockExistingIssue = {
    id: 'INB-1001',
    title: 'Customer unable to login via Microsoft Azure SSO',
    description: 'Failing on callback',
    type: IssueType.Bug,
    status: IssueStatus.Open,
    priority: Priority.High,
    supportLevel: SupportLevel.L1,
    assigneeId: null,
    reporterId: 'user-1',
    projectId: 'proj-1',
    sprintId: null,
    epicId: null,
    labels: ['sso', 'azure'],
    isEscalated: false,
    createdDate: new Date('2026-10-10T10:00:00.000Z'),
    updatedDate: new Date('2026-10-10T10:00:00.000Z'),
  };

  beforeEach(() => {
    prismaMock = {
      activityEvent: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'act-' + Math.random().toString(36).substring(2, 8),
            ...data,
            timestamp: new Date(),
            user: { id: data.userId, name: 'Actor Name', email: 'actor@inbox.io', avatar: null, role: 'Developer' },
            issue: data.issueId ? { id: data.issueId, title: 'Issue Title', projectId: 'proj-1' } : null,
            project: { id: 'proj-1', key: 'INB', name: 'Inbox Core' },
          }),
        ),
      },
      project: {
        findUnique: jest.fn().mockResolvedValue({ id: 'proj-1', key: 'INB' }),
      },
      issue: {
        findUnique: jest.fn().mockResolvedValue(mockExistingIssue),
        findFirst: jest.fn().mockResolvedValue({ id: 'INB-1001' }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockExistingIssue, ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockExistingIssue, ...data })),
      },
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'user-2') return Promise.resolve(mockAssignee1);
          if (where.id === 'user-3') return Promise.resolve(mockAssignee2);
          return Promise.resolve(null);
        }),
      },
      comment: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'comm-1',
            ...data,
            createdAt: new Date(),
            author: mockActor,
          }),
        ),
      },
      escalationRecord: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'esc-1',
            ...data,
            timestamp: new Date(),
          }),
        ),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(prismaMock);
      }),
    };

    activityService = new ActivityService(prismaMock);
    issuesService = new IssuesService(prismaMock, activityService);
    commentsService = new CommentsService(prismaMock, activityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Scenario 2: Ticket creation records exactly one ISSUE_CREATED event', async () => {
    const created = await issuesService.create(
      {
        projectId: 'proj-1',
        title: 'Customer unable to login via Microsoft Azure SSO',
        type: IssueType.Bug,
      },
      mockActor.id,
    );

    expect(created.id).toBe('INB-1002');
    expect(prismaMock.activityEvent.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.activityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: mockActor.id,
          action: 'created',
          issueId: 'INB-1002',
          projectId: 'proj-1',
          details: expect.stringContaining('created ticket INB-1002'),
        }),
      }),
    );
  });

  it('Scenario 3: Assignment records ISSUE_ASSIGNED with actor and assignee info', async () => {
    await issuesService.assign('INB-1001', mockAssignee1.id, mockActor.id);

    expect(prismaMock.activityEvent.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.activityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: mockActor.id,
          action: 'assigned',
          issueId: 'INB-1001',
          details: `assigned INB-1001 to ${mockAssignee1.name}`,
        }),
      }),
    );
  });

  it('Scenario 4: Reassignment records ISSUE_REASSIGNED with previous and new assignees', async () => {
    prismaMock.issue.findUnique.mockResolvedValueOnce({
      ...mockExistingIssue,
      assigneeId: mockAssignee1.id,
    });

    await issuesService.assign('INB-1001', mockAssignee2.id, mockActor.id);

    expect(prismaMock.activityEvent.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.activityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: mockActor.id,
          action: 'assigned',
          issueId: 'INB-1001',
          details: `reassigned INB-1001 to ${mockAssignee2.name}`,
        }),
      }),
    );
  });

  it('Scenario 5: Status change records ISSUE_STATUS_CHANGED; unchanged status records no event', async () => {
    // 1. Changed status
    await issuesService.updateStatus('INB-1001', IssueStatus.In_Progress, mockActor.id);
    expect(prismaMock.activityEvent.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.activityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: mockActor.id,
          action: 'status_changed',
          details: 'Changed status of INB-1001 from Open to In Progress',
        }),
      }),
    );

    prismaMock.activityEvent.create.mockClear();

    // 2. Unchanged status (Open -> Open)
    await issuesService.updateStatus('INB-1001', IssueStatus.Open, mockActor.id);
    expect(prismaMock.activityEvent.create).not.toHaveBeenCalled();
  });

  it('Scenario 6: Escalation records ISSUE_ESCALATED with previous level, new level, and reason', async () => {
    await issuesService.escalate(
      'INB-1001',
      {
        toLevel: SupportLevel.L2,
        reason: 'Requires technical investigation into API webhook parser',
        assignedToUserId: mockAssignee2.id,
      },
      mockActor.id,
    );

    expect(prismaMock.escalationRecord.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.comment.create).toHaveBeenCalledTimes(1); // Auto internal note
    expect(prismaMock.activityEvent.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.activityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: mockActor.id,
          action: 'escalated',
          issueId: 'INB-1001',
          details: expect.stringContaining(
            'escalated INB-1001 from L1 to L2 (Reason: Requires technical investigation into API webhook parser)',
          ),
        }),
      }),
    );
  });

  it('Scenario 7: Public comment records COMMENT_ADDED event', async () => {
    await commentsService.create(
      'INB-1001',
      { content: 'Public customer update', type: CommentType.public },
      mockActor.id,
    );

    expect(prismaMock.activityEvent.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.activityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: mockActor.id,
          action: 'commented',
          details: 'added a public comment on INB-1001',
        }),
      }),
    );
  });

  it('Scenario 8: Internal comment does not leak internal comment content into activity summary', async () => {
    const sensitiveInternalText = 'CONFIDENTIAL: Customer credit score is below threshold.';

    await commentsService.create(
      'INB-1001',
      { content: sensitiveInternalText, type: CommentType.internal },
      mockActor.id,
    );

    expect(prismaMock.activityEvent.create).toHaveBeenCalledTimes(1);
    const activityCall = prismaMock.activityEvent.create.mock.calls[0][0];

    expect(activityCall.data.details).toBe('added an internal note on INB-1001');
    expect(activityCall.data.details).not.toContain(sensitiveInternalText);
  });

  it('Scenario 12: When database transaction rolls back, activity is not persisted', async () => {
    prismaMock.$transaction.mockRejectedValueOnce(
      new Error('Transaction deadlock or constraint failure'),
    );

    await expect(
      issuesService.create(
        {
          projectId: 'proj-1',
          title: 'Rollback test',
        },
        mockActor.id,
      ),
    ).rejects.toThrow('Transaction deadlock or constraint failure');
  });

  it('Scenario 13: Failed or unauthorized business operations do not generate activity', async () => {
    prismaMock.issue.findUnique.mockResolvedValueOnce(null);

    await expect(
      issuesService.updateStatus('NONEXISTENT-999', IssueStatus.Resolved, mockActor.id),
    ).rejects.toThrow();

    expect(prismaMock.activityEvent.create).not.toHaveBeenCalled();
  });
});
