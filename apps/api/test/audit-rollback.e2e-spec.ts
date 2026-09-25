import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { AuditWriter } from '../src/audit-log/audit-writer';

describe('Audit financial rollback (e2e)', () => {
  let prisma: PrismaClient;
  const correlationId = `rollback-${Date.now()}`;

  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
    });
    await prisma.$connect();
  });

  afterAll(async () => prisma.$disconnect());

  it('rolls back the expense and its AuditLog together', async () => {
    const tenant = await prisma.tenant.findFirstOrThrow();
    const category = await prisma.expenseCategory.findFirstOrThrow();
    const writer = new AuditWriter();

    await expect(
      prisma.$transaction(async (tx) => {
        const expense = await tx.expense.create({
          data: {
            tenantId: tenant.id,
            categoryId: category.id,
            categoryName: category.name,
            description: `rollback-${correlationId}`,
            amountUsd: 1,
            status: 'ACTIVE',
          },
        });
        await writer.write(
          {
            tenantId: tenant.id,
            action: 'CREATE',
            entity: 'Expense',
            entityId: expense.id,
            correlationId,
            newValues: { amountUsd: '1.00', status: 'ACTIVE' },
            changedFields: ['amountUsd', 'status'],
          },
          tx,
        );
        throw new Error('rollback test');
      }),
    ).rejects.toThrow('rollback test');

    await expect(
      prisma.expense.findFirst({
        where: { description: `rollback-${correlationId}` },
      }),
    ).resolves.toBeNull();
    await expect(
      prisma.auditLog.findFirst({ where: { correlationId } }),
    ).resolves.toBeNull();
  });

  it('rolls back the payment and its AuditLog together', async () => {
    const tenant = await prisma.tenant.findFirstOrThrow();
    const writer = new AuditWriter();
    const idempotencyKey = `rollback-payment-${Date.now()}`;

    await expect(
      prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            tenantId: tenant.id,
            idempotencyKey,
            totalServiceUsd: 1,
            bcvExchangeRate: 1,
            totalPaidUsd: 1,
            totalPaidUsdEquivalent: 1,
            totalPaidBs: 0,
            totalIgtfUsd: 0,
            doctorShareUsd: 0,
            centerShareUsd: 1,
            status: 'COMPLETED',
          },
        });
        await writer.write(
          {
            tenantId: tenant.id,
            action: 'COMPLETE',
            entity: 'Payment',
            entityId: payment.id,
            correlationId: idempotencyKey,
            newValues: { status: 'COMPLETED', totalServiceUsd: '1.00' },
            changedFields: ['status', 'totalServiceUsd'],
          },
          tx,
        );
        throw new Error('payment rollback test');
      }),
    ).rejects.toThrow('payment rollback test');

    await expect(
      prisma.payment.findUnique({ where: { idempotencyKey } }),
    ).resolves.toBeNull();
    await expect(
      prisma.auditLog.findFirst({ where: { correlationId: idempotencyKey } }),
    ).resolves.toBeNull();
  });
});
