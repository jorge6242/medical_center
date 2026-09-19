import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { ExpenseQueryDto } from './expense-query.dto';

describe('ExpenseQueryDto', () => {
  it('uses default pagination values', () => {
    const dto = plainToInstance(ExpenseQueryDto, {});
    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
    expect(dto.search).toBeUndefined();
  });

  it('accepts a search string and transforms page and limit', () => {
    const dto = plainToInstance(ExpenseQueryDto, {
      page: '2',
      limit: '25',
      search: 'internet',
    });
    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
    expect(dto.search).toBe('internet');
  });

  it('rejects invalid pagination values', () => {
    const dto = plainToInstance(ExpenseQueryDto, {
      page: '0',
      limit: '101',
    });

    const errors = validateSync(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
