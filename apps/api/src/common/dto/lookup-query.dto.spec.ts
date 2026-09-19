import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { LookupQueryDto } from './lookup-query.dto';

describe('LookupQueryDto', () => {
  it('uses a batch of 20 by default', () => {
    const dto = plainToInstance(LookupQueryDto, { q: 'ana' });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.limit).toBe(20);
  });

  it('rejects short queries and oversized batches', () => {
    const dto = plainToInstance(LookupQueryDto, { q: 'a', limit: 51 });

    expect(validateSync(dto).length).toBeGreaterThan(0);
  });
});
