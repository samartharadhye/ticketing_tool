import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { IsNotWhitespace } from '../../../common/decorators/is-not-whitespace.decorator';

export class UpdateFilterDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name should not be empty' })
  @IsNotWhitespace({ message: 'name must not be empty or contain only whitespace' })
  @MaxLength(100, { message: 'name cannot exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsObject({ message: 'criteria must be a valid structured object' })
  criteria?: Record<string, unknown>;

  @IsOptional()
  @IsObject({ message: 'filters must be a valid structured object' })
  filters?: Record<string, unknown>;

  getCriteria(): Record<string, unknown> | undefined {
    return this.criteria !== undefined
      ? this.criteria
      : this.filters !== undefined
        ? this.filters
        : undefined;
  }
}
