import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  assertPaymentMatchesService,
  calculatePaymentTotals,
} from './payment-calculations';

import type { PaymentLineDto } from './dto/create-payment.dto';

const line = (overrides: Partial<PaymentLineDto>): PaymentLineDto => ({
  paymentMethod: 'CASH_USD',
  currency: 'USD',
  amount: 100,
  ...overrides,
});

describe('payment calculations', () => {
  it('converts VES lines into the canonical USD equivalent', () => {
    const totals = calculatePaymentTotals(
      [
        line({ amount: 40 }),
        line({ paymentMethod: 'PAGO_MOVIL', currency: 'VES', amount: 2190 }),
      ],
      36.5,
      0,
    );

    expect(totals.totalPaidUsd.toString()).toBe('40');
    expect(totals.totalPaidBs.toString()).toBe('2190');
    expect(totals.totalPaidUsdEquivalent.toString()).toBe('100');
  });

  it('rejects a payment that does not match the service total', () => {
    expect(() =>
      assertPaymentMatchesService(
        new Prisma.Decimal(99.99),
        new Prisma.Decimal(100),
        new Prisma.Decimal(0),
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects a method registered with the wrong currency', () => {
    expect(() =>
      calculatePaymentTotals([line({ paymentMethod: 'PAGO_MOVIL' })], 36.5, 0),
    ).toThrow(BadRequestException);
  });
});
