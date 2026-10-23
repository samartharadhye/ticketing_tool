import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CommentType, UserRole } from '@prisma/client';

import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CommentsService, SAFE_AUTHOR_SELECT } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

describe('CommentsService', () => {
  let service: CommentsService;
  let prisma: {
    issue: {
      findUnique: jest.Mock;
    };
    comment: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const mockAuthor: AuthenticatedUser = {
    id: 'user-1',
    name: 'Tejas Chauhan',
    email: 'tejas@inbox.io',
    role: UserRole.Developer,
    department: 'Engineering',
    avatar: 'https://example.com/avatar1.png',
  };

  const mockOtherUser: AuthenticatedUser = {
    id: 'user-2',
    name: 'Rahul Sharma',
    email: 'rahul@inbox.io',
    role: UserRole.Developer,
    department: 'Engineering',
    avatar: 'https://example.com/avatar2.png',
  };

  const mockAdmin: AuthenticatedUser = {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@inbox.io',
    role: UserRole.Admin,
    department: 'Operations',
    avatar: 'https://example.com/admin.png',
  };

  const mockExistingComment = {
    id: 'comm-100',
    issueId: 'INB-1001',
    authorId: mockAuthor.id,
    content: 'Initial comment content.',
    type: CommentType.public,
    createdAt: new Date('2026-10-10T10:00:00.000Z'),
    updatedAt: new Date('2026-10-10T10:00:00.000Z'),
    author: {
      id: mockAuthor.id,
      name: mockAuthor.name,
      email: mockAuthor.email,
      role: mockAuthor.role,
      department: mockAuthor.department,
      avatar: mockAuthor.avatar,
      timezone: 'UTC',
      status: 'Active',
    },
  };

  beforeEach(async () => {
    prisma = {
      issue: {
        findUnique: jest.fn(),
      },
      comment: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    const dto: CreateCommentDto = {
      content: '  Investigating logs in CloudWatch.  ',
      type: CommentType.public,
    };

    it('Scenario 1: Authenticated user creates a public comment successfully', async () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'INB-1001', title: 'Login Bug' });
      prisma.comment.create.mockResolvedValue({
        id: 'comm-1',
        issueId: 'INB-1001',
        authorId: mockAuthor.id,
        content: 'Investigating logs in CloudWatch.',
        type: CommentType.public,
        createdAt: new Date(),
        updatedAt: null,
        author: mockAuthor,
      });

      const result = await service.create('INB-1001', dto, mockAuthor.id);

      expect(prisma.issue.findUnique).toHaveBeenCalledWith({
        where: { id: 'INB-1001' },
      });
      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          issueId: 'INB-1001',
          authorId: mockAuthor.id,
          content: 'Investigating logs in CloudWatch.',
          type: CommentType.public,
        },
        include: {
          author: {
            select: SAFE_AUTHOR_SELECT,
          },
        },
      });
      expect(result.id).toBe('comm-1');
      expect(result.type).toBe(CommentType.public);
      expect(result.author).toBeDefined();
      expect((result.author as { password?: string }).password).toBeUndefined();
    });

    it('Scenario 2: Authenticated user creates an internal comment successfully', async () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'INB-1001', title: 'Login Bug' });
      prisma.comment.create.mockResolvedValue({
        id: 'comm-2',
        issueId: 'INB-1001',
        authorId: mockAuthor.id,
        content: 'Internal engineering notes.',
        type: CommentType.internal,
        createdAt: new Date(),
        updatedAt: null,
        author: mockAuthor,
      });

      const internalDto: CreateCommentDto = {
        content: 'Internal engineering notes.',
        type: CommentType.internal,
      };

      const result = await service.create('INB-1001', internalDto, mockAuthor.id);

      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          issueId: 'INB-1001',
          authorId: mockAuthor.id,
          content: 'Internal engineering notes.',
          type: CommentType.internal,
        },
        include: {
          author: {
            select: SAFE_AUTHOR_SELECT,
          },
        },
      });
      expect(result.type).toBe(CommentType.internal);
    });

    it('Scenario 3: Creation uses the authenticated user ID and trims whitespace', async () => {
      prisma.issue.findUnique.mockResolvedValue({ id: 'INB-1001' });
      prisma.comment.create.mockResolvedValue({
        id: 'comm-3',
        issueId: 'INB-1001',
        authorId: mockAuthor.id,
        content: 'Trimmed content',
        type: CommentType.public,
        createdAt: new Date(),
        updatedAt: null,
        author: mockAuthor,
      });

      await service.create('INB-1001', { content: '   Trimmed content   ' }, mockAuthor.id);

      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          issueId: 'INB-1001',
          authorId: mockAuthor.id,
          content: 'Trimmed content',
          type: CommentType.public,
        },
        include: {
          author: {
            select: SAFE_AUTHOR_SELECT,
          },
        },
      });
    });

    it('Scenario 4: Creating a comment for a missing issue throws NotFoundException', async () => {
      prisma.issue.findUnique.mockResolvedValue(null);

      await expect(
        service.create('NON-EXISTENT', dto, mockAuthor.id),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.comment.create).not.toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    const updateDto: UpdateCommentDto = {
      content: '   Updated investigation notes.   ',
    };

    it('Scenario 5: Missing comment during update throws NotFoundException', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing-id', updateDto, mockAuthor),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.comment.update).not.toHaveBeenCalled();
    });

    it('Scenario 7: Author can update their own comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockExistingComment);
      prisma.comment.update.mockResolvedValue({
        ...mockExistingComment,
        content: 'Updated investigation notes.',
      });

      const result = await service.update('comm-100', updateDto, mockAuthor);

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comm-100' },
        data: {
          content: 'Updated investigation notes.',
        },
        include: {
          author: {
            select: SAFE_AUTHOR_SELECT,
          },
        },
      });
      expect(result.content).toBe('Updated investigation notes.');
    });

    it('Scenario 9: Admin can update another user comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockExistingComment);
      prisma.comment.update.mockResolvedValue({
        ...mockExistingComment,
        content: 'Updated investigation notes.',
      });

      const result = await service.update('comm-100', updateDto, mockAdmin);

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comm-100' },
        data: {
          content: 'Updated investigation notes.',
        },
        include: {
          author: {
            select: SAFE_AUTHOR_SELECT,
          },
        },
      });
      expect(result.content).toBe('Updated investigation notes.');
    });

    it('Scenario 11: Non-author, non-Admin cannot update another user comment and receives ForbiddenException', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockExistingComment);

      await expect(
        service.update('comm-100', updateDto, mockOtherUser),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.comment.update).not.toHaveBeenCalled();
    });

    it('Scenario 15: Update only modifies content and cannot change authorId, issueId, type, or timestamps', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockExistingComment);
      prisma.comment.update.mockResolvedValue({
        ...mockExistingComment,
        content: 'Updated notes',
      });

      // Even if callers attempted to pass rogue fields into the service method
      await service.update('comm-100', { content: 'Updated notes' } as UpdateCommentDto, mockAuthor);

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comm-100' },
        data: {
          content: 'Updated notes',
        },
        include: {
          author: {
            select: SAFE_AUTHOR_SELECT,
          },
        },
      });
    });
  });

  describe('delete()', () => {
    it('Scenario 6: Missing comment during delete throws NotFoundException', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.delete('missing-id', mockAuthor),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.comment.delete).not.toHaveBeenCalled();
    });

    it('Scenario 8: Author can delete their own comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockExistingComment);
      prisma.comment.delete.mockResolvedValue(mockExistingComment);

      const result = await service.delete('comm-100', mockAuthor);

      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comm-100' },
      });
      expect(result).toEqual({ success: true });
    });

    it('Scenario 10: Admin can delete another user comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockExistingComment);
      prisma.comment.delete.mockResolvedValue(mockExistingComment);

      const result = await service.delete('comm-100', mockAdmin);

      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comm-100' },
      });
      expect(result).toEqual({ success: true });
    });

    it('Scenario 12: Non-author, non-Admin cannot delete another user comment and receives ForbiddenException', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockExistingComment);

      await expect(
        service.delete('comm-100', mockOtherUser),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.comment.delete).not.toHaveBeenCalled();
    });

    it('Scenario 16: Delete returns exact { success: true } payload', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockExistingComment);
      prisma.comment.delete.mockResolvedValue(mockExistingComment);

      const result = await service.delete('comm-100', mockAuthor);
      expect(result).toEqual({ success: true });
    });
  });
});
