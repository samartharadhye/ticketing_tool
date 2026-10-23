import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from './activity.service';
import {
  ActivityEventType,
  ActivityEventWithRelations,
} from './activity.types';
import { QueryActivityDto } from './dto/query-activity.dto';

describe('ActivityService', () => {
  let service: ActivityService;
  let prisma: {
    activityEvent: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      count: jest.Mock;
    };
    issue: {
      findUnique: jest.Mock;
    };
  };

  const mockAdminUser: AuthenticatedUser = {
    id: 'admin-1',
    name: 'Tejas Chauhan',
    email: 'tejas@inbox.io',
    role: UserRole.Admin,
    department: 'Engineering',
    avatar: 'https://example.com/avatar1.png',
  };

  const mockRegularUser: AuthenticatedUser = {
    id: 'user-2',
    name: 'Rahul Sharma',
    email: 'rahul@inbox.io',
    role: UserRole.Developer,
    department: 'Engineering',
    avatar: 'https://example.com/avatar2.png',
  };

  const mockActivityRow: ActivityEventWithRelations = {
    id: 'act-101',
    userId: 'user-2',
    action: 'created',
    details: 'created ticket INB-1001 "Customer unable to login via Microsoft Azure SSO"',
    issueId: 'INB-1001',
    projectId: 'proj-1',
    timestamp: new Date('2026-10-22T06:00:00.000Z'),
    user: {
      id: 'user-2',
      name: 'Rahul Sharma',
      email: 'rahul@inbox.io',
      avatar: 'https://example.com/avatar2.png',
      role: UserRole.Developer,
      department: 'Engineering',
    },
    issue: {
      id: 'INB-1001',
      title: 'Customer unable to login via Microsoft Azure SSO',
      projectId: 'proj-1',
    },
    project: {
      id: 'proj-1',
      key: 'INB',
      name: 'Inbox Core',
    },
  };

  beforeEach(async () => {
    prisma = {
      activityEvent: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      issue: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll()', () => {
    it('Scenario 1: returns valid empty response when timeline has no records', async () => {
      prisma.activityEvent.findMany.mockResolvedValue([]);
      prisma.activityEvent.count.mockResolvedValue(0);

      const query: QueryActivityDto = { page: 1, limit: 20 };
      const result = await service.findAll(query, mockAdminUser);

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      });
      expect(prisma.activityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        }),
      );
    });

    it('Scenario 9: calculates pagination offsets and metadata accurately', async () => {
      prisma.activityEvent.findMany.mockResolvedValue([mockActivityRow]);
      prisma.activityEvent.count.mockResolvedValue(45);

      const query: QueryActivityDto = { page: 2, limit: 10 };
      const result = await service.findAll(query, mockAdminUser);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 45,
        totalPages: 5,
      });
      expect(prisma.activityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('Scenario 11: non-admin attempting to filter by another actor ID is rejected', async () => {
      const query: QueryActivityDto = {
        actorId: 'other-user-999',
      };

      await expect(service.findAll(query, mockRegularUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows admin or project manager to filter by any actor ID', async () => {
      prisma.activityEvent.findMany.mockResolvedValue([mockActivityRow]);
      prisma.activityEvent.count.mockResolvedValue(1);

      const query: QueryActivityDto = {
        actorId: 'other-user-999',
      };

      const result = await service.findAll(query, mockAdminUser);
      expect(result.data).toHaveLength(1);
    });

    it('filters by canonical event type or legacy action', async () => {
      prisma.activityEvent.findMany.mockResolvedValue([mockActivityRow]);
      prisma.activityEvent.count.mockResolvedValue(1);

      const query: QueryActivityDto = {
        type: ActivityEventType.ISSUE_CREATED,
      };

      await service.findAll(query, mockAdminUser);

      expect(prisma.activityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: [
                  { action: ActivityEventType.ISSUE_CREATED },
                  { action: 'created' },
                  { action: 'created' },
                ],
              }),
            ]),
          }),
        }),
      );
    });

    it('filters by issueId and projectId', async () => {
      prisma.activityEvent.findMany.mockResolvedValue([mockActivityRow]);
      prisma.activityEvent.count.mockResolvedValue(1);

      const query: QueryActivityDto = {
        issueId: 'INB-1001',
        projectId: 'proj-1',
      };

      await service.findAll(query, mockAdminUser);

      expect(prisma.activityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { issueId: 'INB-1001' },
              {
                OR: [
                  { projectId: 'proj-1' },
                  { issue: { projectId: 'proj-1' } },
                ],
              },
            ]),
          }),
        }),
      );
    });
  });

  describe('findRecent()', () => {
    it('retrieves bounded recent activities with default limit', async () => {
      prisma.activityEvent.findMany.mockResolvedValue([mockActivityRow]);

      const result = await service.findRecent(mockAdminUser);

      expect(result).toHaveLength(1);
      expect(prisma.activityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        }),
      );
    });
  });

  describe('findByIssue()', () => {
    it('returns activity history for existing issue', async () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'INB-1001' });
      prisma.activityEvent.findMany.mockResolvedValue([mockActivityRow]);

      const result = await service.findByIssue('INB-1001', mockAdminUser);

      expect(result).toHaveLength(1);
      expect(result[0].issue?.key).toBe('INB-1001');
    });

    it('throws NotFoundException if issue does not exist', async () => {
      prisma.issue.findUnique.mockResolvedValue(null);

      await expect(
        service.findByIssue('NONEXISTENT-999', mockAdminUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne()', () => {
    it('returns formatted activity record when found', async () => {
      prisma.activityEvent.findUnique.mockResolvedValue(mockActivityRow);

      const result = await service.findOne('act-101', mockAdminUser);

      expect(result.id).toBe('act-101');
      expect(result.type).toBe(ActivityEventType.ISSUE_CREATED);
      expect(result.actor.name).toBe('Rahul Sharma');
    });

    it('throws NotFoundException when activity record not found', async () => {
      prisma.activityEvent.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('act-nonexistent', mockAdminUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordActivity()', () => {
    it('persists activity and auto-resolves projectId from issue if omitted', async () => {
      prisma.issue.findUnique.mockResolvedValue({
        id: 'INB-1001',
        projectId: 'proj-1',
        title: 'Customer unable to login via Microsoft Azure SSO',
      });
      prisma.activityEvent.create.mockResolvedValue(mockActivityRow);

      const result = await service.recordActivity({
        actorId: 'user-2',
        type: ActivityEventType.ISSUE_CREATED,
        summary: 'created ticket INB-1001',
        issueId: 'INB-1001',
      });

      expect(prisma.activityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-2',
            action: 'created',
            issueId: 'INB-1001',
            projectId: 'proj-1',
          }),
        }),
      );
      expect(result.id).toBe('act-101');
    });

    it('uses provided transaction client when passed', async () => {
      const mockTx = {
        issue: { findUnique: jest.fn() },
        activityEvent: { create: jest.fn().mockResolvedValue(mockActivityRow) },
      };

      await service.recordActivity({
        actorId: 'user-2',
        type: ActivityEventType.ISSUE_STATUS_CHANGED,
        summary: 'status changed',
        issueId: 'INB-1001',
        projectId: 'proj-1',
        tx: mockTx as any,
      });

      expect(mockTx.activityEvent.create).toHaveBeenCalled();
      expect(prisma.activityEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('formatActivity()', () => {
    it('strictly redacts sensitive secret and password keys from metadata', () => {
      const rowWithSecrets: ActivityEventWithRelations = {
        ...mockActivityRow,
        details: JSON.stringify({
          summary: 'User profile updated',
          passwordHash: 'secret-hash',
          jwtToken: 'bearer-token',
          safeField: 'normal-value',
        }),
      };

      const formatted = service.formatActivity(rowWithSecrets);

      expect(formatted.summary).toBe('User profile updated');
      expect(formatted.metadata).toHaveProperty('safeField', 'normal-value');
      expect(formatted.metadata).not.toHaveProperty('passwordHash');
      expect(formatted.metadata).not.toHaveProperty('jwtToken');
    });
  });
});
