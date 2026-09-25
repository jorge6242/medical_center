import { Prisma } from '@prisma/client';

import { redact } from './audit-redactor';

describe('audit redaction', () => {
  it('removes nested credentials and identifiers while preserving safe fields', () => {
    const result = redact({
      name: 'Ana',
      passwordHash: 'hash',
      nested: [{ token: 'jwt', city: 'Caracas' }],
    });
    expect(result).toEqual({ name: 'Ana', nested: [{ city: 'Caracas' }] });
  });

  it('redacts bearer strings and sensitive keys inside arrays', () => {
    const result = redact({
      values: ['Bearer abc', { accountNumber: '123', status: 'ok' }],
    });
    expect(result).toEqual({ values: ['[REDACTED]', { status: 'ok' }] });
  });

  it('serializes Prisma decimals for JSON audit values', () => {
    const result = redact({ amount: new Prisma.Decimal('30.00') });

    expect(result).toEqual({ amount: '30' });
  });
});
