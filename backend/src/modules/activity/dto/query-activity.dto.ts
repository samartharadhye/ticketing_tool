import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryActivityDto {
  /**
   * Page number for 1-based pagination.
   * @default 1
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Maximum records per page (capped at 100).
   * @default 20
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  /**
   * Filter by activity event type (e.g. ISSUE_CREATED, COMMENT_ADDED).
   */
  @IsOptional()
  @IsString()
  type?: string;

  /**
   * Shorthand/legacy action filter (e.g. created, escalated, status_changed).
   */
  @IsOptional()
  @IsString()
  action?: string;

  /**
   * Filter by affected issue identifier (e.g. INB-1001).
   */
  @IsOptional()
  @IsString()
  issueId?: string;

  /**
   * Filter by associated project identifier (e.g. proj-1).
   */
  @IsOptional()
  @IsString()
  projectId?: string;

  /**
   * Filter by actor user ID.
   */
  @IsOptional()
  @IsString()
  actorId?: string;

  /**
   * Alias for actorId.
   */
  @IsOptional()
  @IsString()
  userId?: string;

  /**
   * Filter activities created on or after this ISO date.
   */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /**
   * Filter activities created on or before this ISO date.
   */
  @IsOptional()
  @IsDateString()
  endDate?: string;

  /**
   * Substring search on activity details/summary.
   */
  @IsOptional()
  @IsString()
  search?: string;
}
