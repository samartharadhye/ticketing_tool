import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateFilterDto } from './dto/create-filter.dto';
import { QuerySavedFiltersDto } from './dto/query-saved-filters.dto';
import { UpdateFilterDto } from './dto/update-filter.dto';
import { SavedFiltersController } from './saved-filters.controller';
import {
  SavedFilterResponse,
  SavedFiltersService,
} from './saved-filters.service';

describe('SavedFiltersController', () => {
  let controller: SavedFiltersController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    apply: jest.Mock;
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    name: 'Tejas Chauhan',
    email: 'tejas@inbox.io',
    role: UserRole.Developer,
    department: 'Engineering',
    avatar: 'https://example.com/avatar.png',
  };

  const mockFilter: SavedFilterResponse = {
    id: 'filter-101',
    name: 'High Priority Bugs',
    criteria: { status: 'Open', priority: 'High' },
    filters: { status: 'Open', priority: 'High' },
    createdAt: new Date('2026-10-10T12:00:00.000Z'),
    updatedAt: new Date('2026-10-10T12:00:00.000Z'),
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      apply: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavedFiltersController],
      providers: [
        { provide: SavedFiltersService, useValue: service },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SavedFiltersController>(SavedFiltersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Guard Configuration', () => {
    it('SavedFiltersController routes require authentication using JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', SavedFiltersController);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThan(0);
      expect(guards).toContain(JwtAuthGuard);
    });
  });

  describe('create() / createFilter()', () => {
    const dto: CreateFilterDto = {
      name: 'High Priority Bugs',
      criteria: { status: 'Open', priority: 'High' },
      getCriteria() {
        return this.criteria || {};
      },
    };

    it('delegates creation to service using userId from AuthenticatedUser', async () => {
      service.create.mockResolvedValue(mockFilter);

      const result = await controller.create(dto, mockUser);

      expect(service.create).toHaveBeenCalledWith(dto, mockUser.id);
      expect(result).toBe(mockFilter);
    });

    it('createFilter alias delegates creation properly', async () => {
      service.create.mockResolvedValue(mockFilter);

      const result = await controller.createFilter(dto, mockUser);

      expect(service.create).toHaveBeenCalledWith(dto, mockUser.id);
      expect(result).toBe(mockFilter);
    });
  });

  describe('findAll() / findAllFilters()', () => {
    const query: QuerySavedFiltersDto = { take: 20, skip: 0 };

    it('delegates list retrieval to service with userId and query', async () => {
      service.findAll.mockResolvedValue([mockFilter]);

      const result = await controller.findAll(query, mockUser);

      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, query);
      expect(result).toEqual([mockFilter]);
    });

    it('findAllFilters alias calls service correctly', async () => {
      service.findAll.mockResolvedValue([mockFilter]);

      const result = await controller.findAllFilters(query, mockUser);

      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, query);
      expect(result).toEqual([mockFilter]);
    });
  });

  describe('findOne() / findOneFilter()', () => {
    it('delegates single filter retrieval to service with id and userId', async () => {
      service.findOne.mockResolvedValue(mockFilter);

      const result = await controller.findOne(mockFilter.id, mockUser);

      expect(service.findOne).toHaveBeenCalledWith(mockFilter.id, mockUser.id);
      expect(result).toBe(mockFilter);
    });

    it('findOneFilter alias calls service correctly', async () => {
      service.findOne.mockResolvedValue(mockFilter);

      const result = await controller.findOneFilter(mockFilter.id, mockUser);

      expect(service.findOne).toHaveBeenCalledWith(mockFilter.id, mockUser.id);
      expect(result).toBe(mockFilter);
    });
  });

  describe('update() / updateFilter()', () => {
    const dto: UpdateFilterDto = {
      name: 'Updated Filter',
      getCriteria() {
        return undefined;
      },
    };

    it('delegates update to service with id, dto, and userId', async () => {
      service.update.mockResolvedValue({ ...mockFilter, name: 'Updated Filter' });

      const result = await controller.update(mockFilter.id, dto, mockUser);

      expect(service.update).toHaveBeenCalledWith(mockFilter.id, dto, mockUser.id);
      expect(result.name).toBe('Updated Filter');
    });

    it('updateFilter alias calls service correctly', async () => {
      service.update.mockResolvedValue({ ...mockFilter, name: 'Updated Filter' });

      const result = await controller.updateFilter(mockFilter.id, dto, mockUser);

      expect(service.update).toHaveBeenCalledWith(mockFilter.id, dto, mockUser.id);
      expect(result.name).toBe('Updated Filter');
    });
  });

  describe('delete() / deleteFilter()', () => {
    it('delegates deletion to service with id and userId', async () => {
      service.remove.mockResolvedValue({ success: true, id: mockFilter.id });

      const result = await controller.delete(mockFilter.id, mockUser);

      expect(service.remove).toHaveBeenCalledWith(mockFilter.id, mockUser.id);
      expect(result).toEqual({ success: true, id: mockFilter.id });
    });

    it('deleteFilter alias calls service correctly', async () => {
      service.remove.mockResolvedValue({ success: true, id: mockFilter.id });

      const result = await controller.deleteFilter(mockFilter.id, mockUser);

      expect(service.remove).toHaveBeenCalledWith(mockFilter.id, mockUser.id);
      expect(result).toEqual({ success: true, id: mockFilter.id });
    });
  });

  describe('apply() / applyFilter()', () => {
    const query = { take: 10, skip: 0 };
    const mockIssues = [{ id: 'INB-1001', title: 'Sample' }];

    it('delegates apply to service with id, userId, and query overrides', async () => {
      service.apply.mockResolvedValue(mockIssues);

      const result = await controller.apply(mockFilter.id, query, mockUser);

      expect(service.apply).toHaveBeenCalledWith(mockFilter.id, mockUser.id, query);
      expect(result).toBe(mockIssues);
    });

    it('applyFilter alias calls service correctly', async () => {
      service.apply.mockResolvedValue(mockIssues);

      const result = await controller.applyFilter(mockFilter.id, query, mockUser);

      expect(service.apply).toHaveBeenCalledWith(mockFilter.id, mockUser.id, query);
      expect(result).toBe(mockIssues);
    });
  });
});
