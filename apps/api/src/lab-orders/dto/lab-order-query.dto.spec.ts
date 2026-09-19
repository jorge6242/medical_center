import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { LabOrderQueryDto } from './lab-order-query.dto';

describe('LabOrderQueryDto', () => {
  it('accepts pagination defaults and optional status', () => {
    const dto = plainToInstance(LabOrderQueryDto, {});
    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
    expect(dto.status).toBeUndefined();
  });

  it('rejects invalid status values', () => {
    const dto = plainToInstance(LabOrderQueryDto, { status: 'INVALID' });

    const errors = validateSync(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
