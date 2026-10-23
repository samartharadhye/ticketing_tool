import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  IssueStatus,
  IssueType,
  Priority,
  SupportLevel,
} from '@prisma/client';

export class QueryIssuesDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'All' || value === 'ALL') return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.includes(',')) return value.split(',').map((s) => s.trim());
    return value;
  })
  status?: IssueStatus | IssueStatus[];

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'All' || value === 'ALL') return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.includes(',')) return value.split(',').map((s) => s.trim());
    return value;
  })
  priority?: Priority | Priority[];

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'All' || value === 'ALL') return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.includes(',')) return value.split(',').map((s) => s.trim());
    return value;
  })
  type?: IssueType | IssueType[];

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'All' || value === 'ALL') return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.includes(',')) return value.split(',').map((s) => s.trim());
    return value;
  })
  supportLevel?: SupportLevel | SupportLevel[];

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  reporterId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  sprintId?: string;

  @IsOptional()
  @IsString()
  epicId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((s) => s.trim());
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isEscalated?: boolean;

  @IsOptional()
  @IsDateString()
  createdDateFrom?: string;

  @IsOptional()
  @IsDateString()
  createdDateTo?: string;

  @IsOptional()
  @IsDateString()
  updatedDateFrom?: string;

  @IsOptional()
  @IsDateString()
  updatedDateTo?: string;

  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @IsIn(['createdDate', 'updatedDate', 'dueDate', 'priority', 'status', 'title', 'id'])
  sortBy?: string = 'createdDate';

  @IsOptional()
  @IsIn(['asc', 'desc', 'ASC', 'DESC'])
  sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC' = 'desc';
}
