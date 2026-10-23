import { Test, TestingModule } from '@nestjs/testing';
import { IssueStatus, IssueType, Priority, SupportLevel } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { QueryIssuesDto } from './dto/query-issues.dto';
import { IssuesService } from './issues.service';

describe('IssuesService', () => {
  let service: IssuesService;
  let prisma: {
    issue: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  const mockIssue = {
    id: 'INB-1001',
    title: 'Payment gateway timeout',
    description: 'Failing on checkout',
    type: IssueType.Bug,
    status: IssueStatus.Open,
    priority: Priority.High,
    supportLevel: SupportLevel.L1,
    assigneeId: 'user-1',
    reporterId: 'user-2',
    projectId: 'proj-1',
    sprintId: 'sprint-1',
    epicId: 'epic-1',
    labels: ['payment', 'checkout'],
    isEscalated: false,
    createdDate: new Date('2026-10-10T10:00:00.000Z'),
    updatedDate: new Date('2026-10-10T10:00:00.000Z'),
    dueDate: new Date('2026-10-20T10:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      issue: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<IssuesService>(IssuesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findMany()', () => {
    it('executes issue search with where clause and pagination', async () => {
      prisma.issue.findMany.mockResolvedValue([mockIssue]);

      const query: QueryIssuesDto = {
        q: 'Payment',
        status: IssueStatus.Open,
        priority: Priority.High,
        take: 10,
        skip: 0,
      };

      const result = await service.findMany(query, 'user-1');

      expect(prisma.issue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 0,
          orderBy: { createdDate: 'desc' },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('INB-1001');
    });

    it('resolves assigneeId: "me" to the current user ID', async () => {
      prisma.issue.findMany.mockResolvedValue([mockIssue]);

      const query: QueryIssuesDto = {
        assigneeId: 'me',
      };

      await service.findMany(query, 'user-1');

      expect(prisma.issue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { assigneeId: 'user-1' },
            ]),
          }),
        }),
      );
    });

    it('handles unassigned issues properly', async () => {
      prisma.issue.findMany.mockResolvedValue([mockIssue]);

      const query: QueryIssuesDto = {
        assigneeId: 'unassigned',
      };

      await service.findMany(query, 'user-1');

      expect(prisma.issue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { assigneeId: null },
            ]),
          }),
        }),
      );
    });

    it('handles sprint backlog filtering properly', async () => {
      prisma.issue.findMany.mockResolvedValue([mockIssue]);

      const query: QueryIssuesDto = {
        sprintId: 'backlog',
      };

      await service.findMany(query, 'user-1');

      expect(prisma.issue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { sprintId: null },
            ]),
          }),
        }),
      );
    });
  });

  describe('findManyWithCount()', () => {
    it('returns both matching items and total count', async () => {
      prisma.issue.findMany.mockResolvedValue([mockIssue]);
      prisma.issue.count.mockResolvedValue(1);

      const query: QueryIssuesDto = { take: 20, skip: 0 };
      const result = await service.findManyWithCount(query, 'user-1');

      expect(result.items).toEqual([mockIssue]);
      expect(result.total).toBe(1);
      expect(result.take).toBe(20);
      expect(result.skip).toBe(0);
    });
  });
});
