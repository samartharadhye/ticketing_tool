import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { ActivityEventType, ActivityItemResponse } from './activity.types';
import { QueryActivityDto } from './dto/query-activity.dto';

describe('ActivityController', () => {
  let controller: ActivityController;
  let service: {
    findAll: jest.Mock;
    findRecent: jest.Mock;
    findByIssue: jest.Mock;
    findOne: jest.Mock;
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    name: 'Tejas Chauhan',
    email: 'tejas@inbox.io',
    role: UserRole.Admin,
  };

  const mockItem: ActivityItemResponse = {
    id: 'act-1',
    type: ActivityEventType.ISSUE_CREATED,
    action: 'created',
    summary: 'created ticket INB-1001',
    details: 'created ticket INB-1001',
    createdAt: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    userId: 'user-1',
    actor: {
      id: 'user-1',
      name: 'Tejas Chauhan',
      avatarUrl: null,
    },
    issueId: 'INB-1001',
    issue: {
      id: 'INB-1001',
      key: 'INB-1001',
      title: 'Customer unable to login via Microsoft Azure SSO',
    },
    projectId: 'proj-1',
    project: {
      id: 'proj-1',
      key: 'INB',
      name: 'Inbox Core',
    },
    metadata: {},
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findRecent: jest.fn(),
      findByIssue: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [{ provide: ActivityService, useValue: service }],
    }).compile();

    controller = module.get<ActivityController>(ActivityController);
  });

  describe('findAll()', () => {
    it('delegates to activityService.findAll with query and authenticated user', async () => {
      const mockResult = {
        data: [mockItem],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      service.findAll.mockResolvedValue(mockResult);

      const query: QueryActivityDto = { page: 1, limit: 20 };
      const result = await controller.findAll(query, mockUser);

      expect(service.findAll).toHaveBeenCalledWith(query, mockUser);
      expect(result).toBe(mockResult);
    });
  });

  describe('findRecent()', () => {
    it('delegates to activityService.findRecent', async () => {
      service.findRecent.mockResolvedValue([mockItem]);

      const result = await controller.findRecent(mockUser, 5);

      expect(service.findRecent).toHaveBeenCalledWith(mockUser, 5);
      expect(result).toEqual([mockItem]);
    });
  });

  describe('findByIssue()', () => {
    it('delegates to activityService.findByIssue with issueId and user', async () => {
      service.findByIssue.mockResolvedValue([mockItem]);

      const result = await controller.findByIssue('INB-1001', mockUser);

      expect(service.findByIssue).toHaveBeenCalledWith('INB-1001', mockUser);
      expect(result).toEqual([mockItem]);
    });
  });

  describe('findOne()', () => {
    it('delegates to activityService.findOne with id and user', async () => {
      service.findOne.mockResolvedValue(mockItem);

      const result = await controller.findOne('act-1', mockUser);

      expect(service.findOne).toHaveBeenCalledWith('act-1', mockUser);
      expect(result).toBe(mockItem);
    });
  });
});
