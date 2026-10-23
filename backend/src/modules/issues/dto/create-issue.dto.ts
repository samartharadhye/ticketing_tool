import { IssueStatus, IssueType, Priority, SupportLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateIssueDto {
  @IsNotEmpty()
  @IsString()
  projectId!: string;

  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(IssueType)
  type?: IssueType = IssueType.Task;

  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus = IssueStatus.Open;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority = Priority.Medium;

  @IsOptional()
  @IsEnum(SupportLevel)
  supportLevel?: SupportLevel = SupportLevel.L1;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  sprintId?: string;

  @IsOptional()
  @IsString()
  epicId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  storyPoints?: number;

  @IsOptional()
  @IsString()
  estimatedTime?: string;
}
