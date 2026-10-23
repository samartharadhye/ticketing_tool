import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

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
