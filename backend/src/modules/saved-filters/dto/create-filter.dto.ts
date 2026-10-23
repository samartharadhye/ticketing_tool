import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { IsNotWhitespace } from '../../../common/decorators/is-not-whitespace.decorator';

export class CreateFilterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name should not be empty' })
  @IsNotWhitespace({ message: 'name must not be empty or contain only whitespace' })
  @MaxLength(100, { message: 'name cannot exceed 100 characters' })
  name!: string;

  /**
   * Primary structured criteria payload.
   */
  @IsOptional()
  @IsObject({ message: 'criteria must be a valid structured object' })
  criteria?: Record<string, unknown>;

  /**
   * Frontend compatibility alias for criteria.
   */
  @IsOptional()
  @IsObject({ message: 'filters must be a valid structured object' })
  filters?: Record<string, unknown>;

  /**
   * Helper to retrieve the active criteria dictionary regardless of whether
   * the client passed `criteria` or `filters`.
   */
  getCriteria(): Record<string, unknown> {
    return this.criteria || this.filters || {};
  }
}
