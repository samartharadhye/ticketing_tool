import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ActivityService } from './activity.service';
import {
  ActivityItemResponse,
  PaginatedActivityResponse,
} from './activity.types';
import { QueryActivityDto } from './dto/query-activity.dto';

@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * GET /api/activity
   * Retrieves a paginated list of domain and audit activities accessible to the authenticated user.
   */
  @Get()
  async findAll(
    @Query() query: QueryActivityDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedActivityResponse> {
    return this.activityService.findAll(query, user);
  }

  /**
   * GET /api/activity/recent
   * Returns recent activities (e.g. for workspace activity pulse widget).
   */
  @Get('recent')
  async findRecent(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
  ): Promise<ActivityItemResponse[]> {
    return this.activityService.findRecent(user, limit ? Number(limit) : 10);
  }

  /**
   * GET /api/activity/issues/:issueId
   * Retrieves activity history for a specific issue/ticket.
   */
  @Get('issues/:issueId')
  async findByIssue(
    @Param('issueId') issueId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ActivityItemResponse[]> {
    return this.activityService.findByIssue(issueId, user);
  }

  /**
   * GET /api/activity/:id
   * Retrieves a specific activity log record by ID.
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ActivityItemResponse> {
    return this.activityService.findOne(id, user);
  }
}
