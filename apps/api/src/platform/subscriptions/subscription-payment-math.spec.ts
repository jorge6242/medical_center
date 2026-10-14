import { BadRequestException } from '@nestjs/common';

import {
  invoiceStatusFor,
  paymentAmountUsd,
  assertMethodMatchesCurrency,
} from './subscription-payment-math';

describe('paymentAmountUsd', () => {
  it('uses the amount as-is for USD payments without rate', () => {
    expect(
      paymentAmountUsd({ currency: 'USD', amountPaid: '10', rate: null }),
    ).toBe('10.00');
  });

  it('converts VES with the snapshot rate, rounded to two decimals', () => {
    expect(
      paymentAmountUsd({ currency: 'VES', amountPaid: '365', rate: '36.50' }),
    ).toBe('10.00');
    expect(
      paymentAmountUsd({ currency: 'VES', amountPaid: '100', rate: '36.5' }),
    ).toBe('2.74');
  });

  it('requires a positive rate for VES and rejects non-positive amounts', () => {
    expect(() =>
      paymentAmountUsd({ currency: 'VES', amountPaid: '365', rate: null }),
    ).toThrow(BadRequestException);
    expect(() =>
      paymentAmountUsd({ currency: 'VES', amountPaid: '365', rate: '0' }),
    ).toThrow(BadRequestException);
    expect(() =>
      paymentAmountUsd({ currency: 'USD', amountPaid: '0', rate: null }),
    ).toThrow(BadRequestException);
  });
});

describe('assertMethodMatchesCurrency', () => {
  it('matches USD methods to USD and VES methods to VES', () => {
    expect(() => assertMethodMatchesCurrency('ZELLE', 'USD')).not.toThrow();
    expect(() =>
      assertMethodMatchesCurrency('PAGO_MOVIL', 'VES'),
    ).not.toThrow();
    expect(() => assertMethodMatchesCurrency('PAGO_MOVIL', 'USD')).toThrow(
      BadRequestException,
    );
    expect(() => assertMethodMatchesCurrency('ZELLE', 'VES')).toThrow(
      BadRequestException,
    );
  });
});

describe('invoiceStatusFor', () => {
  it('keeps outstanding overdue invoices OVERDUE, including partial payment', () => {
    const statusFor = invoiceStatusFor as (
      total: string,
      confirmed: string,
      dueAt: Date,
      now: Date,
    ) => string;
    const dueAt = new Date('2026-10-01T04:00:00Z');
    const now = new Date('2026-10-12T12:00:00Z');
    expect(statusFor('25', '0', dueAt, now)).toBe('OVERDUE');
    expect(statusFor('25', '10', dueAt, now)).toBe('OVERDUE');
    expect(statusFor('25', '25', dueAt, now)).toBe('PAID');
    expect(statusFor('25', '10', now, now)).toBe('PARTIALLY_PAID');
  });
  it('derives the status from the confirmed balance', () => {
    expect(invoiceStatusFor('25.00', '0')).toBe('PENDING');
    expect(invoiceStatusFor('25.00', '10.00')).toBe('PARTIALLY_PAID');
    expect(invoiceStatusFor('25.00', '25.00')).toBe('PAID');
  });
});
