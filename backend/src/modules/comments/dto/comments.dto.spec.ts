import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CommentType } from '@prisma/client';

import { CreateCommentDto, IsNotWhitespaceConstraint } from './create-comment.dto';
import { UpdateCommentDto } from './update-comment.dto';

describe('Comments DTO Validation', () => {
  let targetPipe: ValidationPipe;

  beforeEach(() => {
    targetPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  describe('IsNotWhitespaceConstraint', () => {
    const validator = new IsNotWhitespaceConstraint();

    it('rejects null or non-string values', () => {
      expect(validator.validate(null)).toBe(false);
      expect(validator.validate(undefined)).toBe(false);
      expect(validator.validate(123)).toBe(false);
    });

    it('rejects empty string and whitespace-only strings', () => {
      expect(validator.validate('')).toBe(false);
      expect(validator.validate(' ')).toBe(false);
      expect(validator.validate('   \t   \n  ')).toBe(false);
    });

    it('returns custom default message with and without property argument', () => {
      expect(validator.defaultMessage()).toBe(
        'Field must not be empty or contain only whitespace',
      );
      expect(
        validator.defaultMessage({
          property: 'content',
          value: '',
          targetName: 'CreateCommentDto',
          object: {},
          constraints: [],
        }),
      ).toBe('content must not be empty or contain only whitespace');
    });
  });

  describe('CreateCommentDto', () => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: CreateCommentDto,
    };

    it('Scenario 1 & 2: Valid public and internal comments pass validation', async () => {
      const publicDto = plainToInstance(CreateCommentDto, {
        content: 'Valid public comment content.',
        type: CommentType.public,
      });
      const publicErrors = await validate(publicDto);
      expect(publicErrors.length).toBe(0);

      const internalDto = plainToInstance(CreateCommentDto, {
        content: 'Valid internal note content.',
        type: CommentType.internal,
      });
      const internalErrors = await validate(internalDto);
      expect(internalErrors.length).toBe(0);
    });

    it('Scenario 13: Empty and whitespace-only content are rejected', async () => {
      const emptyDto = plainToInstance(CreateCommentDto, {
        content: '',
      });
      const emptyErrors = await validate(emptyDto);
      expect(emptyErrors.length).toBeGreaterThan(0);
      expect(emptyErrors[0].property).toBe('content');

      const whitespaceDto = plainToInstance(CreateCommentDto, {
        content: '     \t\n   ',
      });
      const whitespaceErrors = await validate(whitespaceDto);
      expect(whitespaceErrors.length).toBeGreaterThan(0);
      expect(whitespaceErrors[0].property).toBe('content');
    });

    it('Scenario 14: Invalid type is rejected', async () => {
      const invalidTypeDto = plainToInstance(CreateCommentDto, {
        content: 'Valid content',
        type: 'secret' as unknown as CommentType,
      });
      const errors = await validate(invalidTypeDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('type');
    });

    it('Scenario 3: ValidationPipe strips/rejects rogue authorId or issueId in payload', async () => {
      const payloadWithRogueFields = {
        content: 'Investigating logs in CloudWatch.',
        type: 'public',
        authorId: 'hacked-author-id',
        issueId: 'hacked-issue-id',
      };

      await expect(
        targetPipe.transform(payloadWithRogueFields, metadata),
      ).rejects.toThrow();
    });
  });

  describe('UpdateCommentDto', () => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: UpdateCommentDto,
    };

    it('valid content passes validation', async () => {
      const dto = plainToInstance(UpdateCommentDto, {
        content: 'Updated investigation notes.',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('Scenario 13: Empty and whitespace-only content are rejected on update', async () => {
      const emptyDto = plainToInstance(UpdateCommentDto, {
        content: '',
      });
      const emptyErrors = await validate(emptyDto);
      expect(emptyErrors.length).toBeGreaterThan(0);

      const whitespaceDto = plainToInstance(UpdateCommentDto, {
        content: '      ',
      });
      const whitespaceErrors = await validate(whitespaceDto);
      expect(whitespaceErrors.length).toBeGreaterThan(0);
    });

    it('rejects unexpected properties such as type, authorId, issueId', async () => {
      const payloadWithExtra = {
        content: 'Valid content',
        type: 'internal',
        authorId: 'different-author',
      };

      await expect(
        targetPipe.transform(payloadWithExtra, metadata),
      ).rejects.toThrow();
    });
  });
});
