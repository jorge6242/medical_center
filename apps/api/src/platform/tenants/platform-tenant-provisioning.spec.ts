import {
  billingPeriodFor,
  parseAgreedPrice,
  requestFingerprint,
} from './platform-tenant-provisioning';

const SECRET = 'platform_secret_minimo_32_caracteres_aaaa';

describe('billingPeriodFor', () => {
  it('covers the calendar month in America/Caracas containing startsAt', () => {
    // 15-oct 12:00 UTC es 15-oct en Caracas (UTC-4)
    const period = billingPeriodFor('2026-10-15T12:00:00.000Z');

    expect(period.startsAt.toISOString()).toBe('2026-10-01T04:00:00.000Z');
    expect(period.endsAt.toISOString()).toBe('2026-11-01T04:00:00.000Z');
  });

  it('uses the local month when UTC is already in the next month', () => {
    // 1-nov 02:00 UTC todavía es 31-oct en Caracas
    const period = billingPeriodFor('2026-11-01T02:00:00.000Z');

    expect(period.startsAt.toISOString()).toBe('2026-10-01T04:00:00.000Z');
  });
});

describe('parseAgreedPrice', () => {
  it('accepts positive decimals with at most two places and returns a string', () => {
    expect(parseAgreedPrice('25')).toBe('25.00');
    expect(parseAgreedPrice('25.5')).toBe('25.50');
    expect(parseAgreedPrice('19.99')).toBe('19.99');
  });

  it('rejects zero, negatives, floats with more places and non-numeric input', () => {
    for (const value of ['0', '-5', '12.345', 'abc', '']) {
      expect(() => parseAgreedPrice(value)).toThrow('agreedPriceUsd');
    }
  });
});

describe('requestFingerprint', () => {
  const base = {
    name: 'Centro Norte',
    slug: 'centro-norte',
    initialAdmin: {
      name: 'Ana',
      email: 'ana@norte.com',
      password: 'Clave-Secreta-1',
    },
  };

  it('is stable regardless of key order', () => {
    const reordered = {
      initialAdmin: {
        password: 'Clave-Secreta-1',
        email: 'ana@norte.com',
        name: 'Ana',
      },
      slug: 'centro-norte',
      name: 'Centro Norte',
    };

    expect(requestFingerprint(base, SECRET)).toBe(
      requestFingerprint(reordered, SECRET),
    );
  });

  it('changes when the password changes but never contains the password', () => {
    const other = {
      ...base,
      initialAdmin: { ...base.initialAdmin, password: 'Otra-Clave-2' },
    };
    const fingerprint = requestFingerprint(base, SECRET);

    expect(fingerprint).not.toBe(requestFingerprint(other, SECRET));
    expect(fingerprint).not.toContain('Clave-Secreta-1');
  });
});
