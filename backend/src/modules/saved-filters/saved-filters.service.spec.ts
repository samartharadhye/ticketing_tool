import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IssueStatus, IssueType, Priority, SupportLevel } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { IssuesService } from '../issues/issues.service';
import { CreateFilterDto } from './dto/create-filter.dto';
import { QuerySavedFiltersDto } from './dto/query-saved-filters.dto';
import { UpdateFilterDto } from './dto/update-filter.dto';
import { SavedFiltersService } from './saved-filters.service';

describe('SavedFiltersService', () => {
  let service: SavedFiltersService;
  let prisma: {
    savedFilter: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let issuesService: {
    findMany: jest.Mock;
    findManyWithCount: jest.Mock;
  };

  const userId1 = 'user-1';
  const userId2 = 'user-2';

  const mockFilter1 = {
    id: 'filter-101',
    name: 'Critical Bugs',
    criteria: {
      status: [IssueStatus.Open, IssueStatus.In_Progress],
      priority: [Priority.High, Priority.Highest],
      type: IssueType.Bug,
    },
    userId: userId1,
    createdAt: new Date('2026-10-10T10:00:00.000Z'),
    updatedAt: new Date('2026-10-10T12:00:00.000Z'),
  };

  const mockFilter2 = {
    id: 'filter-102',
    name: 'My Assigned Tickets',
    criteria: {
      assigneeId: 'me',
      status: IssueStatus.Open,
    },
    userId: userId1,
    createdAt: new Date('2026-10-11T10:00:00.000Z'),
    updatedAt: new Date('2026-10-11T14:00:00.000Z'),
  };

  const mockFilterUser2 = {
    id: 'filter-201',
    name: 'User 2 Private Filter',
    criteria: {
      supportLevel: SupportLevel.L3,
    },
    userId: userId2,
    createdAt: new Date('2026-10-12T10:00:00.000Z'),
    updatedAt: new Date('2026-10-12T10:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      savedFilter: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    issuesService = {
      findMany: jest.fn(),
      findManyWithCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedFiltersService,
        { provide: PrismaService, useValue: prisma },
        { provide: IssuesService, useValue: issuesService },
      ],
    }).compile();

    service = module.get<SavedFiltersService>(SavedFiltersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('successfully creates a filter with valid criteria', async () => {
      const dto: CreateFilterDto = {
        name: '  Open High Priority Bugs  ',
        criteria: {
          status: ['Open', 'In Progress'],
          priority: ['High', 'Highest'],
          type: 'Bug',
        },
        getCriteria() {
          return this.criteria || {};
        },
      };

      prisma.savedFilter.create.mockResolvedValue(mockFilter1);

      const result = await service.create(dto, userId1);

      expect(prisma.savedFilter.create).toHaveBeenCalledWith({
        data: {
          name: 'Open High Priority Bugs',
          criteria: {
            status: [IssueStatus.Open, IssueStatus.In_Progress],
            priority: [Priority.High, Priority.Highest],
            type: IssueType.Bug,
          },
          userId: userId1,
        },
      });

      expect(result.id).toBe(mockFilter1.id);
      expect(result.name).toBe(mockFilter1.name);
      expect(result.criteria).toBeDefined();
      expect(result.filters).toBeDefined();
    });

    it('creates a filter using frontend filters alias', async () => {
      const dto: CreateFilterDto = {
        name: 'Technical L2 Queue',
        filters: {
          supportLevel: 'L2',
          status: 'Open',
        },
        getCriteria() {
          return this.filters || {};
        },
      };

      prisma.savedFilter.create.mockResolvedValue({
        id: 'filter-103',
        name: 'Technical L2 Queue',
        criteria: { supportLevel: SupportLevel.L2, status: IssueStatus.Open },
        userId: userId1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(dto, userId1);

      expect(prisma.savedFilter.create).toHaveBeenCalled();
      expect(result.name).toBe('Technical L2 Queue');
    });

    it('rejects criteria with unwhitelisted or forbidden fields', async () => {
      const dto: CreateFilterDto = {
        name: 'Exploit Filter',
        criteria: {
          maliciousField: 'drop table users',
          status: 'Open',
        },
        getCriteria() {
          return this.criteria || {};
        },
      };

      await expect(service.create(dto, userId1)).rejects.toThrow(BadRequestException);
      expect(prisma.savedFilter.create).not.toHaveBeenCalled();
    });

    it('rejects invalid enum values in criteria', async () => {
      const dto: CreateFilterDto = {
        name: 'Invalid Status Filter',
        criteria: {
          status: 'NON_EXISTENT_STATUS',
        },
        getCriteria() {
          return this.criteria || {};
        },
      };

      await expect(service.create(dto, userId1)).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid date range where from is after to', async () => {
      const dto: CreateFilterDto = {
        name: 'Inverted Date Range',
        criteria: {
          createdDateFrom: '2026-10-20T00:00:00.000Z',
          createdDateTo: '2026-10-10T00:00:00.000Z',
        },
        getCriteria() {
          return this.criteria || {};
        },
      };

      await expect(service.create(dto, userId1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll()', () => {
    it('retrieves only filters belonging to the authenticated user', async () => {
      prisma.savedFilter.findMany.mockResolvedValue([mockFilter1, mockFilter2]);

      const result = await service.findAll(userId1);

      expect(prisma.savedFilter.findMany).toHaveBeenCalledWith({
        where: { userId: userId1 },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        skip: 0,
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockFilter1.id);
      expect(result[1].id).toBe(mockFilter2.id);
    });

    it('supports search query filter by name', async () => {
      prisma.savedFilter.findMany.mockResolvedValue([mockFilter1]);

      const query: QuerySavedFiltersDto = { search: 'Bugs', take: 10, skip: 0 };
      const result = await service.findAll(userId1, query);

      expect(prisma.savedFilter.findMany).toHaveBeenCalledWith({
        where: {
          userId: userId1,
          name: {
            contains: 'Bugs',
            mode: 'insensitive',
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        skip: 0,
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('findOne()', () => {
    it('retrieves a filter owned by the authenticated user', async () => {
      prisma.savedFilter.findFirst.mockResolvedValue(mockFilter1);

      const result = await service.findOne(mockFilter1.id, userId1);

      expect(prisma.savedFilter.findFirst).toHaveBeenCalledWith({
        where: { id: mockFilter1.id, userId: userId1 },
      });
      expect(result.id).toBe(mockFilter1.id);
    });

    it('rejects access to a filter belonging to another user with 404', async () => {
      // Scoped query returns null when userId does not match
      prisma.savedFilter.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockFilterUser2.id, userId1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when filter does not exist', async () => {
      prisma.savedFilter.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id', userId1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update()', () => {
    it('updates filter name successfully', async () => {
      prisma.savedFilter.findFirst.mockResolvedValue(mockFilter1);
      prisma.savedFilter.update.mockResolvedValue({
        ...mockFilter1,
        name: 'Updated Filter Name',
      });

      const dto: UpdateFilterDto = {
        name: 'Updated Filter Name',
        getCriteria() {
          return undefined;
        },
      };

      const result = await service.update(mockFilter1.id, dto, userId1);

      expect(prisma.savedFilter.findFirst).toHaveBeenCalledWith({
        where: { id: mockFilter1.id, userId: userId1 },
      });
      expect(prisma.savedFilter.update).toHaveBeenCalledWith({
        where: { id: mockFilter1.id },
        data: { name: 'Updated Filter Name' },
      });
      expect(result.name).toBe('Updated Filter Name');
    });

    it('updates criteria successfully', async () => {
      prisma.savedFilter.findFirst.mockResolvedValue(mockFilter1);
      const newCriteria = { status: 'Closed' };
      prisma.savedFilter.update.mockResolvedValue({
        ...mockFilter1,
        criteria: { status: IssueStatus.Closed },
      });

      const dto: UpdateFilterDto = {
        criteria: newCriteria,
        getCriteria() {
          return this.criteria;
        },
      };

      const result = await service.update(mockFilter1.id, dto, userId1);

      expect(prisma.savedFilter.update).toHaveBeenCalledWith({
        where: { id: mockFilter1.id },
        data: { criteria: { status: IssueStatus.Closed } },
      });
      expect(result).toBeDefined();
    });

    it('rejects empty or whitespace-only name update', async () => {
      prisma.savedFilter.findFirst.mockResolvedValue(mockFilter1);

      const dto: UpdateFilterDto = {
        name: '   ',
        getCriteria() {
          return undefined;
        },
      };

      await expect(service.update(mockFilter1.id, dto, userId1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects updating another user filter with 404', async () => {
      prisma.savedFilter.findFirst.mockResolvedValue(null);

      const dto: UpdateFilterDto = {
        name: 'Hacked Name',
        getCriteria() {
          return undefined;
        },
      };

      await expect(
        service.update(mockFilterUser2.id, dto, userId1),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.savedFilter.update).not.toHaveBeenCalled();
    });
  });

  describe('remove() / delete()', () => {
    it('deletes an owned filter successfully', async () => {
      prisma.savedFilter.findFirst.mockResolvedValue(mockFilter1);
      prisma.savedFilter.delete.mockResolvedValue(mockFilter1);

      const result = await service.remove(mockFilter1.id, userId1);

      expect(prisma.savedFilter.findFirst).toHaveBeenCalledWith({
        where: { id: mockFilter1.id, userId: userId1 },
      });
      expect(prisma.savedFilter.delete).toHaveBeenCalledWith({
        where: { id: mockFilter1.id },
      });
      expect(result).toEqual({ success: true, id: mockFilter1.id });
    });

    it('rejects deletion of another user filter with 404', async () => {
      prisma.savedFilter.findFirst.mockResolvedValue(null);

      await expect(service.remove(mockFilterUser2.id, userId1)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.savedFilter.delete).not.toHaveBeenCalled();
    });
  });

  describe('apply()', () => {
    const mockIssues = [
      {
        id: 'INB-1001',
        title: 'Payment gateway bug',
        status: IssueStatus.Open,
        priority: Priority.High,
        type: IssueType.Bug,
      },
    ];

    it('loads filter, translates criteria, and delegates to IssuesService', async () => {
      prisma.savedFilter.findFirst.mockResolvedValue(mockFilter1);
      issuesService.findMany.mockResolvedValue(mockIssues);

      const result = await service.apply(mockFilter1.id, userId1);

      expect(prisma.savedFilter.findFirst).toHaveBeenCalledWith({
        where: { id: mockFilter1.id, userId: userId1 },
      });
      expect(issuesService.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockIssues);
    });

    it('resolves assigneeId: "me" to the authenticated user ID', async () => {
      prisma.savedFilter.findFirst.mockResolvedValue(mockFilter2);
      issuesService.findMany.mockResolvedValue(mockIssues);

      await service.apply(mockFilter2.id, userId1);

      expect(issuesService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          assigneeId: userId1,
        }),
        userId1,
      );
    });

    it('merges pagination and sorting overrides into search query', async () => {
      prisma.savedFilter.findFirst.mockResolvedValue(mockFilter1);
      issuesService.findMany.mockResolvedValue(mockIssues);

      await service.apply(mockFilter1.id, userId1, {
        take: 20,
        skip: 10,
        sortBy: 'priority',
        sortOrder: 'asc',
      });

      expect(issuesService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 10,
          sortBy: 'priority',
          sortOrder: 'asc',
        }),
        userId1,
      );
    });

    it('rejects applying another user filter with 404', async () => {
      prisma.savedFilter.findFirst.mockResolvedValue(null);

      await expect(service.apply(mockFilterUser2.id, userId1)).rejects.toThrow(
        NotFoundException,
      );
      expect(issuesService.findMany).not.toHaveBeenCalled();
    });

    it('throws BadRequestException if stored criteria are malformed or corrupted', async () => {
      const corruptFilter = {
        ...mockFilter1,
        criteria: 'not-an-object',
      };
      prisma.savedFilter.findFirst.mockResolvedValue(corruptFilter);

      await expect(service.apply(corruptFilter.id, userId1)).rejects.toThrow(
        BadRequestException,
      );
      expect(issuesService.findMany).not.toHaveBeenCalled();
    });
  });

  describe('delete() alias', () => {
    it('successfully calls remove via delete alias', async () => {
      prisma.savedFilter.findFirst.mockResolvedValue(mockFilter1);
      prisma.savedFilter.delete.mockResolvedValue(mockFilter1);

      const result = await service.delete(mockFilter1.id, userId1);
      expect(result).toEqual({ success: true, id: mockFilter1.id });
    });
  });

  describe('applyWithCount()', () => {
    it('applies saved filter and delegates to issuesService.findManyWithCount', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      prisma.savedFilter.findFirst.mockResolvedValue(mockFilter1);
      issuesService.findManyWithCount.mockResolvedValue(mockResult);

      const result = await service.applyWithCount(mockFilter1.id, userId1, {
        take: 10,
        skip: 0,
      });

      expect(prisma.savedFilter.findFirst).toHaveBeenCalledWith({
        where: { id: mockFilter1.id, userId: userId1 },
      });
      expect(issuesService.findManyWithCount).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });

    it('throws NotFoundException if filter is not found for user', async () => {
      prisma.savedFilter.findFirst.mockResolvedValue(null);

      await expect(service.applyWithCount('non-existent', userId1)).rejects.toThrow(
        NotFoundException,
      );
      expect(issuesService.findManyWithCount).not.toHaveBeenCalled();
    });
  });
});
