import { createHmac } from 'node:crypto';

import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';

// Facturación mensual por mes calendario de Caracas (sin horario de verano).
const BILLING_ZONE = 'America/Caracas';
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

export interface BillingPeriod {
  startsAt: Date;
  endsAt: Date;
}

export function billingPeriodFor(startsAtIso: string): BillingPeriod {
  const start = DateTime.fromISO(startsAtIso, { zone: BILLING_ZONE }).startOf(
    'month',
  );
  return {
    startsAt: start.toJSDate(),
    endsAt: start.plus({ months: 1 }).toJSDate(),
  };
}

export function parseAgreedPrice(value: string): string {
  if (!PRICE_PATTERN.test(value) || Number(value) <= 0) {
    throw new BadRequestException(
      'agreedPriceUsd debe ser un decimal positivo con hasta 2 decimales',
    );
  }
  const [whole, fraction = ''] = value.split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

// Huella HMAC del payload para idempotencia. La clave en claro nunca entra al cálculo:
// se sustituye por su propio HMAC, así tampoco queda en la base.
export function requestFingerprint(body: object, secret: string): string {
  const withPasswordDigest = digestPassword(body, secret);
  const canonical = JSON.stringify(sortKeys(withPasswordDigest));
  return createHmac('sha256', secret).update(canonical).digest('hex');
}

function digestPassword(body: object, secret: string): unknown {
  const copy = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
  const admin = copy['initialAdmin'] as { password?: string } | undefined;
  if (admin && typeof admin.password === 'string') {
    admin.password = createHmac('sha256', secret)
      .update(`password:${admin.password}`)
      .digest('hex');
  }
  return copy;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}
