import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PlatformSubscriptionPaymentsService } from './platform-subscription-payments.service';

import type { PlatformIdentity } from '../auth/platform-auth.service';

const SECRET = 'platform_secret_minimo_32_caracteres_aaaa';
const ACTOR: PlatformIdentity = {
  id: 'admin-1',
  username: 'exiadmin',
  name: 'exiadmin',
  sessionId: 's1',
};
const INVOICE = {
  id: 'inv-1',
  status: 'PENDING',
  totalUsd: { toString: () => '25.00' },
  dueAt: new Date('2026-01-01T00:00:00Z'),
};
const PAYMENT_INPUT = {
  currency: 'USD' as const,
  amountPaid: '25',
  rate: null,
  method: 'ZELLE' as const,
  reference: 'ZEL-1',
  paidAt: '2026-10-12T15:00:00.000Z',
  idempotencyKey: 'pago-inv1-0001',
};

function build(confirmedSum: string | null = null) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'inv-1' }]),
    subscriptionInvoice: {
      findFirst: jest.fn().mockResolvedValue(INVOICE),
      update: jest.fn(),
    },
    subscriptionPayment: {
      create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
      aggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { amountUsd: confirmedSum } }),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    platformIdempotencyKey: {
      create: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    platformAuditLog: { create: jest.fn() },
  };
  const prisma = {
    platformIdempotencyKey: { findUnique: jest.fn().mockResolvedValue(null) },
    subscriptionInvoice: { findFirst: tx.subscriptionInvoice.findFirst },
    subscriptionPayment: tx.subscriptionPayment,
    $transaction: jest.fn(async (fn: (c: unknown) => unknown) => fn(tx)),
  };
  return {
    tx,
    prisma,
    service: new PlatformSubscriptionPaymentsService(prisma as never, SECRET),
  };
}

describe('PlatformSubscriptionPaymentsService', () => {
  it('preserves OVERDUE when partially paying a past-due invoice', async () => {
    const { service, tx } = build('0');
    await service.registerPayment(ACTOR, 'tenant-1', 'inv-1', {
      ...PAYMENT_INPUT,
      amountPaid: '10',
    });
    expect(tx.subscriptionInvoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: { status: 'OVERDUE' },
    });
  });

  it('rechecks payment status after locking to reject a competing void', async () => {
    const { service, tx } = build('0');
    tx.subscriptionPayment.findFirst
      .mockResolvedValueOnce({
        id: 'pay-1',
        status: 'CONFIRMED',
        subscriptionInvoiceId: 'inv-1',
      })
      .mockResolvedValueOnce({
        id: 'pay-1',
        status: 'VOIDED',
        subscriptionInvoiceId: 'inv-1',
      });
    await expect(
      service.voidPayment(ACTOR, 'tenant-1', 'pay-1', {
        reason: 'Duplicado',
        idempotencyKey: 'competing-void',
      }),
    ).rejects.toThrow(ConflictException);
    expect(tx.subscriptionPayment.update).not.toHaveBeenCalled();
    expect(tx.platformAuditLog.create).not.toHaveBeenCalled();
  });
  it('registers a confirmed payment under a row lock and marks the invoice PAID', async () => {
    const { service, tx } = build('0');

    await service.registerPayment(ACTOR, 'tenant-1', 'inv-1', PAYMENT_INPUT);

    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.subscriptionPayment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'CONFIRMED',
        amountUsd: '25.00',
        paymentCurrency: 'USD',
        paymentMethod: 'ZELLE',
        idempotencyKey: 'pago-inv1-0001',
      }),
    });
    expect(tx.subscriptionInvoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: { status: 'PAID' },
    });
    expect(tx.platformAuditLog.create).toHaveBeenCalled();
  });

  it('rejects an overpayment before writing anything', async () => {
    const { service, tx } = build('20.00');

    await expect(
      service.registerPayment(ACTOR, 'tenant-1', 'inv-1', {
        ...PAYMENT_INPUT,
        amountPaid: '10',
      }),
    ).rejects.toThrow(ConflictException);
    expect(tx.subscriptionPayment.create).not.toHaveBeenCalled();
  });

  it('refuses payments on voided or foreign invoices', async () => {
    const { service, tx, prisma } = build();
    prisma.subscriptionInvoice.findFirst.mockResolvedValue(null);
    await expect(
      service.registerPayment(ACTOR, 'tenant-otro', 'inv-1', PAYMENT_INPUT),
    ).rejects.toThrow(NotFoundException);

    tx.subscriptionInvoice.findFirst.mockResolvedValue({
      ...INVOICE,
      status: 'VOIDED',
    });
    prisma.subscriptionInvoice.findFirst.mockResolvedValue({
      ...INVOICE,
      status: 'VOIDED',
    });
    await expect(
      service.registerPayment(ACTOR, 'tenant-1', 'inv-1', PAYMENT_INPUT),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects a method that does not match the currency', async () => {
    const { service, tx } = build();

    await expect(
      service.registerPayment(ACTOR, 'tenant-1', 'inv-1', {
        ...PAYMENT_INPUT,
        method: 'PAGO_MOVIL',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(tx.subscriptionPayment.create).not.toHaveBeenCalled();
  });

  it('voids a confirmed payment without deleting it and recalculates the invoice', async () => {
    const { service, tx } = build('0');
    tx.subscriptionPayment.findFirst.mockResolvedValue({
      id: 'pay-1',
      status: 'CONFIRMED',
      amountUsd: { toString: () => '25.00' },
      subscriptionInvoiceId: 'inv-1',
    });

    await service.voidPayment(ACTOR, 'tenant-1', 'pay-1', {
      reason: 'Duplicado',
      idempotencyKey: 'anula-0001',
    });

    expect(tx.subscriptionPayment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: { status: 'VOIDED' },
    });
    expect(tx.platformAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'VOID', reason: 'Duplicado' }),
    });
  });

  it('requires a reason to void', async () => {
    const { service, tx } = build();

    await expect(
      service.voidPayment(ACTOR, 'tenant-1', 'pay-1', {
        reason: ' ',
        idempotencyKey: 'anula-0002',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(tx.subscriptionPayment.update).not.toHaveBeenCalled();
  });
});
