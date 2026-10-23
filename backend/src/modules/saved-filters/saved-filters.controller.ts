import {
  Body,
  Controller,
  Delete,
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
import { IssueWithRelations, PaginatedIssuesResult } from '../issues/issues.service';
import { ApplyFilterQueryDto } from './dto/apply-filter-query.dto';
import { CreateFilterDto } from './dto/create-filter.dto';
import { QuerySavedFiltersDto } from './dto/query-saved-filters.dto';
import { UpdateFilterDto } from './dto/update-filter.dto';
import {
  SavedFilterResponse,
  SavedFiltersService,
} from './saved-filters.service';

@Controller('saved-filters')
@UseGuards(JwtAuthGuard)
export class SavedFiltersController {
  constructor(private readonly savedFiltersService: SavedFiltersService) {}

  /**
   * POST /api/saved-filters
   * Creates and persists a new saved filter for the authenticated user.
   *
   * @param dto Validated creation DTO.
   * @param user The authenticated user from JWT token.
   * @returns 201 Created with the created filter.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateFilterDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SavedFilterResponse> {
    return this.savedFiltersService.create(dto, user.id);
  }

  /**
   * Alias for create to support diverse testing conventions.
   */
  async createFilter(
    dto: CreateFilterDto,
    user: AuthenticatedUser,
  ): Promise<SavedFilterResponse> {
    return this.create(dto, user);
  }

  /**
   * GET /api/saved-filters
   * Retrieves all saved filters owned by the authenticated user.
   *
   * @param query Optional query pagination or search.
   * @param user The authenticated user from JWT token.
   * @returns 200 OK with the user's saved filters.
   */
  @Get()
  async findAll(
    @Query() query: QuerySavedFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SavedFilterResponse[]> {
    return this.savedFiltersService.findAll(user.id, query);
  }

  /**
   * Alias for findAll.
   */
  async findAllFilters(
    query: QuerySavedFiltersDto,
    user: AuthenticatedUser,
  ): Promise<SavedFilterResponse[]> {
    return this.findAll(query, user);
  }

  /**
   * GET /api/saved-filters/:id
   * Retrieves a single saved filter by ID.
   *
   * @param id The filter identifier.
   * @param user The authenticated user from JWT token.
   * @returns 200 OK with the filter or 404 if not found / unauthorized.
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SavedFilterResponse> {
    return this.savedFiltersService.findOne(id, user.id);
  }

  /**
   * Alias for findOne.
   */
  async findOneFilter(
    id: string,
    user: AuthenticatedUser,
  ): Promise<SavedFilterResponse> {
    return this.findOne(id, user);
  }

  /**
   * PATCH /api/saved-filters/:id
   * Partially updates a saved filter's name or criteria.
   *
   * @param id The filter identifier.
   * @param dto Validated partial update payload.
   * @param user The authenticated user from JWT token.
   * @returns 200 OK with the updated filter.
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFilterDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SavedFilterResponse> {
    return this.savedFiltersService.update(id, dto, user.id);
  }

  /**
   * Alias for update.
   */
  async updateFilter(
    id: string,
    dto: UpdateFilterDto,
    user: AuthenticatedUser,
  ): Promise<SavedFilterResponse> {
    return this.update(id, dto, user);
  }

  /**
   * DELETE /api/saved-filters/:id
   * Deletes a saved filter owned by the authenticated user.
   *
   * @param id The filter identifier.
   * @param user The authenticated user from JWT token.
   * @returns 200 OK with { success: true, id }.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; id: string }> {
    return this.savedFiltersService.remove(id, user.id);
  }

  /**
   * Alias for delete.
   */
  async deleteFilter(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean; id: string }> {
    return this.delete(id, user);
  }

  /**
   * GET /api/saved-filters/:id/apply
   * Applies the saved filter and returns matching issues through existing issue search.
   *
   * @param id The filter identifier.
   * @param query Optional pagination / sorting overrides.
   * @param user The authenticated user from JWT token.
   * @returns 200 OK with matching issues.
   */
  @Get(':id/apply')
  async apply(
    @Param('id') id: string,
    @Query() query: ApplyFilterQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IssueWithRelations[] | PaginatedIssuesResult> {
    return this.savedFiltersService.apply(id, user.id, query);
  }

  /**
   * Alias for apply.
   */
  async applyFilter(
    id: string,
    query: ApplyFilterQueryDto,
    user: AuthenticatedUser,
  ): Promise<IssueWithRelations[] | PaginatedIssuesResult> {
    return this.apply(id, query, user);
  }
}
