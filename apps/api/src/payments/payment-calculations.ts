import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { PaymentLineDto } from './dto/create-payment.dto';

const USD_METHODS = new Set([
  'CASH_USD',
  'ZELLE',
  'WIRE_TRANSFER_USD',
  'POS_USD_CARD',
]);
const VES_METHODS = new Set(['POS_BS', 'PAGO_MOVIL']);
const IGTF_EXEMPT_METHODS = new Set(['POS_USD_CARD']);

export interface PaymentTotals {
  lines: Array<PaymentLineDto & { appliedIgtfAmount: Prisma.Decimal }>;
  totalPaidUsd: Prisma.Decimal;
  totalPaidUsdEquivalent: Prisma.Decimal;
  totalPaidBs: Prisma.Decimal;
  totalIgtfUsd: Prisma.Decimal;
}

export function calculatePaymentTotals(
  paymentLines: PaymentLineDto[],
  bcvExchangeRate: number,
  igtfRate: number,
): PaymentTotals {
  const rate = new Prisma.Decimal(bcvExchangeRate);
  if (rate.isZero() || rate.isNegative()) {
    throw new BadRequestException('La tasa BCV debe ser mayor que cero');
  }

  const lines = paymentLines.map((line) => {
    validateMethodCurrency(line);
    const amount = new Prisma.Decimal(line.amount);
    const appliedIgtfAmount = isIgtfApplicable(line)
      ? amount.mul(igtfRate)
      : new Prisma.Decimal(0);
    return { ...line, appliedIgtfAmount };
  });
  const totalPaidUsd = sum(lines, (line) =>
    line.currency === 'USD' ? line.amount : 0,
  );
  const totalPaidBs = sum(lines, (line) =>
    line.currency === 'VES' ? line.amount : 0,
  );
  const totalPaidUsdEquivalent = lines.reduce((total, line) => {
    const amount = new Prisma.Decimal(line.amount);
    return total.plus(line.currency === 'VES' ? amount.div(rate) : amount);
  }, new Prisma.Decimal(0));
  const totalIgtfUsd = lines.reduce(
    (total, line) => total.plus(line.appliedIgtfAmount),
    new Prisma.Decimal(0),
  );

  return {
    lines,
    totalPaidUsd,
    totalPaidUsdEquivalent,
    totalPaidBs,
    totalIgtfUsd,
  };
}

export function assertPaymentMatchesService(
  totalPaidUsdEquivalent: Prisma.Decimal,
  totalServiceUsd: Prisma.Decimal,
  totalIgtfUsd: Prisma.Decimal,
): void {
  const expected = totalServiceUsd.plus(totalIgtfUsd).toDecimalPlaces(2);
  const received = totalPaidUsdEquivalent.toDecimalPlaces(2);
  if (!received.equals(expected)) {
    throw new BadRequestException(
      `El pago debe totalizar USD ${expected.toFixed(2)}. Recibido: USD ${received.toFixed(2)}`,
    );
  }
}

function validateMethodCurrency(line: PaymentLineDto): void {
  const expectsUsd = USD_METHODS.has(line.paymentMethod);
  const expectsVes = VES_METHODS.has(line.paymentMethod);
  const isValid =
    (expectsUsd && line.currency === 'USD') ||
    (expectsVes && line.currency === 'VES');
  if (!isValid) {
    throw new BadRequestException(
      `El método ${line.paymentMethod} debe registrarse en la moneda correspondiente`,
    );
  }
}

function isIgtfApplicable(line: PaymentLineDto): boolean {
  return (
    line.currency === 'USD' && !IGTF_EXEMPT_METHODS.has(line.paymentMethod)
  );
}

function sum(
  lines: PaymentLineDto[],
  getAmount: (line: PaymentLineDto) => number,
): Prisma.Decimal {
  return lines.reduce(
    (total, line) => total.plus(new Prisma.Decimal(getAmount(line))),
    new Prisma.Decimal(0),
  );
}
