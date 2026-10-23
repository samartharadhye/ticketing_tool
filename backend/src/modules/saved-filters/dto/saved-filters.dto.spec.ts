import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ApplyFilterQueryDto } from './apply-filter-query.dto';
import { CreateFilterDto } from './create-filter.dto';
import { QuerySavedFiltersDto } from './query-saved-filters.dto';
import { UpdateFilterDto } from './update-filter.dto';

describe('SavedFilters DTO Validation', () => {
  let targetPipe: ValidationPipe;

  beforeEach(() => {
    targetPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    });
  });

  describe('CreateFilterDto', () => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: CreateFilterDto,
    };

    it('passes validation when valid name and criteria are provided', async () => {
      const payload = {
        name: 'Open Critical Bugs',
        criteria: { status: ['Open'], priority: ['High'] },
      };

      const transformed = await targetPipe.transform(payload, metadata);
      expect(transformed).toBeInstanceOf(CreateFilterDto);
      expect(transformed.name).toBe('Open Critical Bugs');
      expect(transformed.getCriteria()).toEqual({ status: ['Open'], priority: ['High'] });
    });

    it('trims leading and trailing whitespace from filter name', async () => {
      const payload = {
        name: '   Spaced Filter Name   ',
        criteria: { status: 'Open' },
      };

      const transformed = await targetPipe.transform(payload, metadata);
      expect(transformed.name).toBe('Spaced Filter Name');
    });

    it('rejects empty string or whitespace-only name', async () => {
      const payload = {
        name: '   ',
        criteria: { status: 'Open' },
      };

      await expect(targetPipe.transform(payload, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects missing name', async () => {
      const payload = {
        criteria: { status: 'Open' },
      };

      await expect(targetPipe.transform(payload, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects names exceeding 100 characters', async () => {
      const payload = {
        name: 'A'.repeat(101),
        criteria: { status: 'Open' },
      };

      await expect(targetPipe.transform(payload, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects non-object criteria', async () => {
      const payload = {
        name: 'Test Filter',
        criteria: 'not-an-object',
      };

      await expect(targetPipe.transform(payload, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects unexpected properties when forbidNonWhitelisted is active', async () => {
      const payload = {
        name: 'Test Filter',
        criteria: { status: 'Open' },
        forbiddenField: 'hacker',
      };

      await expect(targetPipe.transform(payload, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('UpdateFilterDto', () => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: UpdateFilterDto,
    };

    it('supports partial update with name only', async () => {
      const payload = {
        name: 'Renamed Filter',
      };

      const transformed = await targetPipe.transform(payload, metadata);
      expect(transformed).toBeInstanceOf(UpdateFilterDto);
      expect(transformed.name).toBe('Renamed Filter');
      expect(transformed.getCriteria()).toBeUndefined();
    });

    it('supports partial update with criteria only', async () => {
      const payload = {
        criteria: { priority: 'Highest' },
      };

      const transformed = await targetPipe.transform(payload, metadata);
      expect(transformed.name).toBeUndefined();
      expect(transformed.getCriteria()).toEqual({ priority: 'Highest' });
    });

    it('rejects empty name in update', async () => {
      const payload = {
        name: '  ',
      };

      await expect(targetPipe.transform(payload, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects forbidden protected fields such as userId or id', async () => {
      const payload = {
        name: 'Renamed',
        userId: 'other-user',
      };

      await expect(targetPipe.transform(payload, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('QuerySavedFiltersDto', () => {
    it('applies default pagination values', () => {
      const dto = plainToInstance(QuerySavedFiltersDto, {});
      expect(dto.take).toBe(50);
      expect(dto.skip).toBe(0);
    });

    it('validates pagination bounds', async () => {
      const dto = plainToInstance(QuerySavedFiltersDto, { take: 200, skip: -1 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ApplyFilterQueryDto', () => {
    it('validates sortBy allowed values', async () => {
      const validDto = plainToInstance(ApplyFilterQueryDto, { sortBy: 'createdDate' });
      const validErrors = await validate(validDto);
      expect(validErrors.length).toBe(0);

      const invalidDto = plainToInstance(ApplyFilterQueryDto, { sortBy: 'maliciousColumn' });
      const invalidErrors = await validate(invalidDto);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    it('validates sortOrder values', async () => {
      const validDto = plainToInstance(ApplyFilterQueryDto, { sortOrder: 'asc' });
      const validErrors = await validate(validDto);
      expect(validErrors.length).toBe(0);

      const invalidDto = plainToInstance(ApplyFilterQueryDto, { sortOrder: 'random' });
      const invalidErrors = await validate(invalidDto);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });
  });
});
