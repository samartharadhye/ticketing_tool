import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateIssueDto } from './dto/create-issue.dto';
import { EscalateIssueDto } from './dto/escalate-issue.dto';
import { QueryIssuesDto } from './dto/query-issues.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import {
  IssuesService,
  IssueWithRelations,
  PaginatedIssuesResult,
} from './issues.service';

@Controller('issues')
@UseGuards(JwtAuthGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  /**
   * GET /api/issues
   * Returns list of matching issues with filtering, pagination, and sorting.
   */
  @Get()
  async findAll(
    @Query() query: QueryIssuesDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IssueWithRelations[] | PaginatedIssuesResult> {
    return this.issuesService.findMany(query, user.id);
  }

  /**
   * GET /api/issues/:id
   * Retrieves single issue with relations.
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ): Promise<IssueWithRelations> {
    return this.issuesService.findOne(id);
  }

  /**
   * POST /api/issues
   * Creates a new issue with auto ID and audits ISSUE_CREATED.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateIssueDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IssueWithRelations> {
    return this.issuesService.create(dto, user.id);
  }

  /**
   * PATCH /api/issues/:id
   * Updates issue fields and audits modifications.
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIssueDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IssueWithRelations> {
    return this.issuesService.update(id, dto, user.id);
  }

  /**
   * PATCH /api/issues/:id/status
   * Dedicated status transition (e.g. Kanban drag and drop) and audits ISSUE_STATUS_CHANGED.
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IssueWithRelations> {
    return this.issuesService.updateStatus(id, dto.status, user.id);
  }

  /**
   * POST /api/issues/:id/escalate
   * Support tier escalation with internal note and audits ISSUE_ESCALATED.
   */
  @Post(':id/escalate')
  async escalate(
    @Param('id') id: string,
    @Body() dto: EscalateIssueDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IssueWithRelations> {
    return this.issuesService.escalate(id, dto, user.id);
  }
}

