import { SupportLevel } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EscalateIssueDto {
  @IsNotEmpty()
  @IsEnum(SupportLevel)
  toLevel!: SupportLevel;

  @IsNotEmpty()
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  assignedToUserId?: string;
}
