import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CommentType } from '@prisma/client';

/**
 * Custom validator constraint that rejects empty strings or strings
 * consisting only of whitespace characters.
 */
@ValidatorConstraint({ name: 'isNotWhitespace', async: false })
export class IsNotWhitespaceConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, _args?: ValidationArguments): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  defaultMessage(args?: ValidationArguments): string {
    const property = args?.property || 'Field';
    return `${property} must not be empty or contain only whitespace`;
  }
}

/**
 * Decorator to ensure a string property is not empty or whitespace-only.
 */
export function IsNotWhitespace(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotWhitespaceConstraint,
    });
  };
}

export class CreateCommentDto {
  @IsString({ message: 'content must be a string' })
  @IsNotEmpty({ message: 'content should not be empty' })
  @IsNotWhitespace({ message: 'content must not be empty or contain only whitespace' })
  content!: string;

  @IsEnum(CommentType, {
    message: 'type must be either public or internal',
  })
  @IsOptional()
  type?: CommentType = CommentType.public;
}
