import { IssueStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateStatusDto {
  @IsNotEmpty()
  @IsEnum(IssueStatus)
  status!: IssueStatus;
}
