import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { QueryActivityDto } from './query-activity.dto';

describe('QueryActivityDto', () => {
  it('passes validation with default parameters', async () => {
    const dto = plainToInstance(QueryActivityDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('validates custom positive page and limit within bounds', async () => {
    const dto = plainToInstance(QueryActivityDto, {
      page: '2',
      limit: '50',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(50);
  });

  it('rejects page less than 1', async () => {
    const dto = plainToInstance(QueryActivityDto, {
      page: 0,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('page');
  });

  it('rejects limit exceeding 100', async () => {
    const dto = plainToInstance(QueryActivityDto, {
      limit: 101,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('accepts valid date strings for startDate and endDate', async () => {
    const dto = plainToInstance(QueryActivityDto, {
      startDate: '2026-10-01T00:00:00.000Z',
      endDate: '2026-10-22T23:59:59.000Z',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects malformed date strings', async () => {
    const dto = plainToInstance(QueryActivityDto, {
      startDate: 'not-a-date',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('startDate');
  });

  it('accepts valid filter fields', async () => {
    const dto = plainToInstance(QueryActivityDto, {
      type: 'ISSUE_CREATED',
      action: 'created',
      issueId: 'INB-1001',
      projectId: 'proj-1',
      actorId: 'user-1',
      search: 'SSO login',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
