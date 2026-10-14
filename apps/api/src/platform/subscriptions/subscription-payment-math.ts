import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export type PaymentCurrency = 'USD' | 'VES';
export type InvoiceStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

// Compatibilidad método-moneda del módulo clínico (sin IGTF ni split en SaaS, design §5).
const USD_METHODS = new Set([
  'CASH_USD',
  'ZELLE',
  'WIRE_TRANSFER_USD',
  'POS_USD_CARD',
]);
const VES_METHODS = new Set(['POS_BS', 'PAGO_MOVIL']);

export function assertMethodMatchesCurrency(
  method: string,
  currency: PaymentCurrency,
): void {
  const valid =
    (currency === 'USD' && USD_METHODS.has(method)) ||
    (currency === 'VES' && VES_METHODS.has(method));
  if (!valid) {
    throw new BadRequestException(
      `El método ${method} no corresponde a la moneda ${currency}`,
    );
  }
}

export function paymentAmountUsd(input: {
  currency: PaymentCurrency;
  amountPaid: string;
  rate: string | null;
}): string {
  const paid = new Prisma.Decimal(input.amountPaid);
  if (!paid.greaterThan(0))
    throw new BadRequestException('amountPaid debe ser positivo');

  if (input.currency === 'USD') {
    if (input.rate !== null && !new Prisma.Decimal(input.rate).equals(1)) {
      throw new BadRequestException(
        'Un pago en USD no admite tasa distinta de 1',
      );
    }
    return paid.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2);
  }

  if (input.rate === null || !new Prisma.Decimal(input.rate).greaterThan(0)) {
    throw new BadRequestException(
      'Un pago en VES requiere tasa positiva (snapshot)',
    );
  }
  return paid
    .div(input.rate)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    .toFixed(2);
}

export function invoiceStatusFor(
  totalUsd: string,
  confirmedUsd: string,
  dueAt?: Date,
  now: Date = new Date(),
): InvoiceStatus {
  const total = new Prisma.Decimal(totalUsd);
  const confirmed = new Prisma.Decimal(confirmedUsd);
  if (confirmed.greaterThanOrEqualTo(total)) return 'PAID';
  if (dueAt && dueAt < now) return 'OVERDUE';
  if (confirmed.greaterThan(0)) return 'PARTIALLY_PAID';
  return 'PENDING';
}

export function remainingUsd(totalUsd: string, confirmedUsd: string): string {
  return new Prisma.Decimal(totalUsd).minus(confirmedUsd).toFixed(2);
}
