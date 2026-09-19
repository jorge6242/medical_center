import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import {
  ConsolidatedReportsQueryDto,
  DetailReportsQueryDto,
  ReportGroupBy,
  ReportType,
} from './query-reports.dto';

describe('QueryReportsDto', () => {
  it('uses pagination and filter defaults', () => {
    const dto = plainToInstance(DetailReportsQueryDto, {});
    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
    expect(dto.search).toBeUndefined();
    expect(dto.from).toBe('');
    expect(dto.to).toBe('');
    expect(dto.groupBy).toBe(ReportGroupBy.DAY);
    expect(dto.type).toBe(ReportType.ALL);
  });

  it('accepts explicit values for consolidated queries', () => {
    const dto = plainToInstance(ConsolidatedReportsQueryDto, {
      page: '2',
      limit: '25',
      search: 'maria',
      from: '2026-01-01',
      to: '2026-01-31',
      groupBy: 'month',
      type: 'expense',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
    expect(dto.search).toBe('maria');
    expect(dto.from).toBe('2026-01-01');
    expect(dto.to).toBe('2026-01-31');
    expect(dto.groupBy).toBe(ReportGroupBy.MONTH);
    expect(dto.type).toBe(ReportType.EXPENSE);
  });

  it('rejects invalid pagination and enum values', () => {
    const dto = plainToInstance(DetailReportsQueryDto, {
      page: '0',
      limit: '101',
      groupBy: 'year',
      type: 'other',
    });

    const errors = validateSync(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
