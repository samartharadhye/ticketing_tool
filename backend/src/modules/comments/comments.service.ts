import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CommentType, Prisma, UserRole } from '@prisma/client';

import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityEventType } from '../activity/activity.types';
import { ActivityService } from '../activity/activity.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

/**
 * Safe projection fields for author relation, strictly excluding password hash.
 */
export const SAFE_AUTHOR_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  avatar: true,
  timezone: true,
  status: true,
} as const;

export type CommentWithAuthor = Prisma.CommentGetPayload<{
  include: {
    author: {
      select: typeof SAFE_AUTHOR_SELECT;
    };
  };
}>;

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly activityService?: ActivityService,
  ) {}

  /**
   * Creates a new comment or internal note on an existing issue.
   *
   * @param issueId The target issue CUID or identifier.
   * @param dto Validated comment creation payload containing content and optional type.
   * @param authorId The ID of the authenticated user posting the comment.
   * @returns The created comment entity including safe author details.
   * @throws NotFoundException if the referenced issue does not exist.
   */
  async create(
    issueId: string,
    dto: CreateCommentDto,
    authorId: string,
  ): Promise<CommentWithAuthor> {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID "${issueId}" not found`);
    }

    const comment = await this.prisma.comment.create({
      data: {
        issueId,
        authorId,
        content: dto.content.trim(),
        type: dto.type ?? CommentType.public,
      },
      include: {
        author: {
          select: SAFE_AUTHOR_SELECT,
        },
      },
    });

    this.logger.log(
      `Created ${comment.type} comment ${comment.id} on issue ${issueId} by user ${authorId}`,
    );

    // Record audit activity event
    if (this.activityService) {
      try {
        const commentPhrase =
          comment.type === CommentType.internal
            ? 'an internal note'
            : 'a public comment';
        await this.activityService.recordActivity({
          actorId: authorId,
          type: ActivityEventType.COMMENT_ADDED,
          action: 'commented',
          summary: `added ${commentPhrase} on ${issueId}`,
          details: `added ${commentPhrase} on ${issueId}`,
          issueId,
          projectId: issue.projectId,
          metadata: {
            commentId: comment.id,
            commentType: comment.type,
            isPublic: comment.type === CommentType.public,
          },
        });
      } catch (err: unknown) {
        this.logger.warn(`Failed to record comment activity event: ${err}`);
      }
    }

    return comment;
  }

  /**
   * Updates an existing comment's text content.
   * Only the original author or a user with Admin role is permitted to update.
   *
   * @param commentId The unique identifier of the comment to update.
   * @param dto Validated update payload containing new content.
   * @param user The authenticated user requesting the update.
   * @returns The updated comment entity including safe author details.
   * @throws NotFoundException if the comment does not exist.
   * @throws ForbiddenException if the user is neither the author nor an Admin.
   */
  async update(
    commentId: string,
    dto: UpdateCommentDto,
    user: AuthenticatedUser,
  ): Promise<CommentWithAuthor> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID "${commentId}" not found`);
    }

    const isAuthor = comment.authorId === user.id;
    const isAdmin = user.role === UserRole.Admin;

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to update this comment',
      );
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        content: dto.content.trim(),
      },
      include: {
        author: {
          select: SAFE_AUTHOR_SELECT,
        },
      },
    });

    this.logger.log(`Updated comment ${commentId} by user ${user.id}`);

    if (this.activityService) {
      try {
        await this.activityService.recordActivity({
          actorId: user.id,
          type: ActivityEventType.COMMENT_UPDATED,
          action: 'comment_updated',
          summary: `updated a comment on ${comment.issueId}`,
          details: `updated a comment on ${comment.issueId}`,
          issueId: comment.issueId,
          metadata: { commentId },
        });
      } catch (err: unknown) {
        this.logger.warn(`Failed to record comment update activity: ${err}`);
      }
    }

    return updatedComment;
  }

  /**
   * Deletes an existing comment.
   * Only the original author or a user with Admin role is permitted to delete.
   *
   * @param commentId The unique identifier of the comment to remove.
   * @param user The authenticated user requesting the deletion.
   * @returns Confirmation payload { success: true }.
   * @throws NotFoundException if the comment does not exist.
   * @throws ForbiddenException if the user is neither the author nor an Admin.
   */
  async delete(
    commentId: string,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID "${commentId}" not found`);
    }

    const isAuthor = comment.authorId === user.id;
    const isAdmin = user.role === UserRole.Admin;

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to delete this comment',
      );
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    this.logger.log(`Deleted comment ${commentId} by user ${user.id}`);

    if (this.activityService) {
      try {
        await this.activityService.recordActivity({
          actorId: user.id,
          type: ActivityEventType.COMMENT_DELETED,
          action: 'comment_deleted',
          summary: `deleted a comment on ${comment.issueId}`,
          details: `deleted a comment on ${comment.issueId}`,
          issueId: comment.issueId,
          metadata: { commentId },
        });
      } catch (err: unknown) {
        this.logger.warn(`Failed to record comment deletion activity: ${err}`);
      }
    }

    return { success: true };
  }
}
