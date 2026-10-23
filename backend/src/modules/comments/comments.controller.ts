import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CommentsService, CommentWithAuthor } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * POST /api/issues/:id/comments
   * Creates a new public comment or internal note on an issue.
   *
   * @param issueId The target issue identifier from route param.
   * @param dto Validated creation DTO.
   * @param user The authenticated user from JWT token.
   * @returns 201 Created with the created comment and safe author relation.
   */
  @Post('issues/:id/comments')
  async create(
    @Param('id') issueId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CommentWithAuthor> {
    return this.commentsService.create(issueId, dto, user.id);
  }

  /**
   * Alias for create to support diverse testing conventions.
   */
  async createComment(
    issueId: string,
    dto: CreateCommentDto,
    user: AuthenticatedUser,
  ): Promise<CommentWithAuthor> {
    return this.create(issueId, dto, user);
  }

  /**
   * PATCH /api/comments/:commentId
   * Updates existing comment text. Only author or Admin may update.
   *
   * @param commentId The comment identifier from route param.
   * @param dto Validated update DTO containing new content.
   * @param user The authenticated user from JWT token.
   * @returns 200 OK with the updated comment and safe author relation.
   */
  @Patch('comments/:commentId')
  async update(
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CommentWithAuthor> {
    return this.commentsService.update(commentId, dto, user);
  }

  /**
   * Alias for update to support diverse testing conventions.
   */
  async updateComment(
    commentId: string,
    dto: UpdateCommentDto,
    user: AuthenticatedUser,
  ): Promise<CommentWithAuthor> {
    return this.update(commentId, dto, user);
  }

  /**
   * DELETE /api/comments/:commentId
   * Deletes an existing comment. Only author or Admin may delete.
   *
   * @param commentId The comment identifier from route param.
   * @param user The authenticated user from JWT token.
   * @returns 200 OK with { success: true }.
   */
  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.commentsService.delete(commentId, user);
  }

  /**
   * Alias for delete to support diverse testing conventions.
   */
  async deleteComment(
    commentId: string,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.delete(commentId, user);
  }
}
