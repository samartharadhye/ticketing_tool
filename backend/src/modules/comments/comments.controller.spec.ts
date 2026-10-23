import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CommentType, UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CommentsController } from './comments.controller';
import { CommentsService, CommentWithAuthor } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

describe('CommentsController', () => {
  let controller: CommentsController;
  let service: {
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    name: 'Tejas Chauhan',
    email: 'tejas@inbox.io',
    role: UserRole.Developer,
    department: 'Engineering',
    avatar: 'https://example.com/avatar.png',
  };

  const mockComment: CommentWithAuthor = {
    id: 'comm-1',
    issueId: 'INB-1001',
    authorId: mockUser.id,
    content: 'Test content',
    type: CommentType.public,
    createdAt: new Date('2026-10-10T12:00:00.000Z'),
    updatedAt: new Date('2026-10-10T12:00:00.000Z'),
    author: {
      id: mockUser.id,
      name: 'Tejas Chauhan',
      email: mockUser.email,
      role: mockUser.role,
      department: 'Engineering',
      avatar: 'https://example.com/avatar.png',
      timezone: 'UTC',
      status: 'Active',
    },
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        { provide: CommentsService, useValue: service },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CommentsController>(CommentsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Guard Configuration', () => {
    it('Scenario 17: Controller routes require authentication using JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', CommentsController);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThan(0);
      expect(guards).toContain(JwtAuthGuard);
    });
  });

  describe('create() / createComment()', () => {
    const dto: CreateCommentDto = {
      content: 'Investigating logs in CloudWatch.',
      type: CommentType.internal,
    };

    it('delegates creation to service using issueId from param and userId from AuthenticatedUser', async () => {
      service.create.mockResolvedValue(mockComment);

      const result = await controller.create('INB-1001', dto, mockUser);

      expect(service.create).toHaveBeenCalledWith('INB-1001', dto, mockUser.id);
      expect(result).toBe(mockComment);
    });

    it('createComment alias calls service correctly', async () => {
      service.create.mockResolvedValue(mockComment);

      const result = await controller.createComment('INB-1001', dto, mockUser);

      expect(service.create).toHaveBeenCalledWith('INB-1001', dto, mockUser.id);
      expect(result).toBe(mockComment);
    });
  });

  describe('update() / updateComment()', () => {
    const dto: UpdateCommentDto = {
      content: 'Updated investigation notes.',
    };

    it('delegates update to service using commentId from param and AuthenticatedUser', async () => {
      service.update.mockResolvedValue({
        ...mockComment,
        content: 'Updated investigation notes.',
      });

      const result = await controller.update('comm-1', dto, mockUser);

      expect(service.update).toHaveBeenCalledWith('comm-1', dto, mockUser);
      expect(result.content).toBe('Updated investigation notes.');
    });

    it('updateComment alias calls service correctly', async () => {
      service.update.mockResolvedValue({
        ...mockComment,
        content: 'Updated notes.',
      });

      const result = await controller.updateComment('comm-1', dto, mockUser);

      expect(service.update).toHaveBeenCalledWith('comm-1', dto, mockUser);
      expect(result.content).toBe('Updated notes.');
    });
  });

  describe('delete() / deleteComment()', () => {
    it('Scenario 16: Deletion returns exact { success: true } and uses HTTP 200', async () => {
      service.delete.mockResolvedValue({ success: true });

      const result = await controller.delete('comm-1', mockUser);

      expect(service.delete).toHaveBeenCalledWith('comm-1', mockUser);
      expect(result).toEqual({ success: true });

      // Verify @HttpCode(HttpStatus.OK) metadata on delete handler
      const httpCode = Reflect.getMetadata('__httpCode__', controller.delete);
      expect(httpCode).toBe(HttpStatus.OK);
    });

    it('deleteComment alias calls service correctly', async () => {
      service.delete.mockResolvedValue({ success: true });

      const result = await controller.deleteComment('comm-1', mockUser);

      expect(service.delete).toHaveBeenCalledWith('comm-1', mockUser);
      expect(result).toEqual({ success: true });
    });
  });
});
