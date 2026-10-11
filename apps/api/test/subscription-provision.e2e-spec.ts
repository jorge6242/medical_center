import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '@prisma/client';

import { parseSubscriptionCommand } from '../prisma/subscription-command';
import { provisionSubscription } from '../prisma/subscription-provision';

const now = new Date('2026-10-11T12:00:00Z');
const rollbackSignal = new Error('ROLLBACK_SUBSCRIPTION_TEST');

describe('subscription provisioning (database)', () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
  });

  afterAll(async () => prisma.$disconnect());

  async function rollback(
    test: (tx: Prisma.TransactionClient) => Promise<void>,
  ) {
    try {
      await prisma.$transaction(
        async (tx) => {
          await test(tx);
          throw rollbackSignal;
        },
        { timeout: 15000 },
      );
    } catch (error: unknown) {
      if (error !== rollbackSignal) throw error;
    }
  }

  async function fixture(tx: Prisma.TransactionClient) {
    const slug = `subscription-test-${randomUUID()}`;
    const tenant = await tx.tenant.create({
      data: { name: 'Subscription test', slug },
    });
    const command = parseSubscriptionCommand([
      '--tenant',
      slug,
      '--plan',
      slug,
      '--price',
      '20',
      '--start',
      '2026-10-11',
      '--due-date',
      '2026-10-14',
      '--create-plan',
      '--plan-name',
      'Test base',
      '--features',
      '{"allow_doctor_login":false}',
      '--limits',
      '{"max_doctors":5}',
    ]);
    return { tenant, command };
  }

  it('previews without creating a plan, contract, period, invoice or audit', async () =>
    rollback(async (tx) => {
      const { tenant, command } = await fixture(tx);
      const result = await provisionSubscription(tx, command, now);
      expect(result.mode).toBe('preview');
      expect(
        await tx.tenantSubscription.count({ where: { tenantId: tenant.id } }),
      ).toBe(0);
      expect(
        await tx.subscriptionPlan.count({ where: { code: command.planCode } }),
      ).toBe(0);
      expect(await tx.auditLog.count({ where: { tenantId: tenant.id } })).toBe(
        0,
      );
    }));

  it('creates a pending invoice without payment or activating coverage; reruns are idempotent', async () =>
    rollback(async (tx) => {
      const { tenant, command } = await fixture(tx);
      const applied = { ...command, apply: true };
      const first = await provisionSubscription(tx, applied, now);
      const second = await provisionSubscription(tx, applied, now);
      expect(first.mode).toBe('created');
      expect(second.mode).toBe('unchanged');
      expect(second.periodId).toBe(first.periodId);
      const subscription = await tx.tenantSubscription.findUniqueOrThrow({
        where: { tenantId: tenant.id },
      });
      expect(subscription.subscriptionPeriodId).toBeNull();
      expect(
        await tx.subscriptionInvoice.count({
          where: {
            subscriptionPeriod: { subscription: { tenantId: tenant.id } },
          },
        }),
      ).toBe(1);
      expect(
        await tx.subscriptionPayment.count({
          where: {
            subscriptionInvoice: {
              subscriptionPeriod: { subscription: { tenantId: tenant.id } },
            },
          },
        }),
      ).toBe(0);
      expect(await tx.auditLog.count({ where: { tenantId: tenant.id } })).toBe(
        4,
      );
      const invoice = await tx.subscriptionInvoice.findFirstOrThrow({
        where: {
          subscriptionPeriod: { subscription: { tenantId: tenant.id } },
        },
      });
      expect(invoice.status).toBe('PENDING');
      expect(invoice.totalUsd.toString()).toBe('20');
    }));

  it('adds a contiguous month while keeping the previous active period and snapshots', async () =>
    rollback(async (tx) => {
      const { tenant, command } = await fixture(tx);
      const first = await provisionSubscription(
        tx,
        { ...command, apply: true },
        now,
      );
      await tx.tenantSubscription.update({
        where: { tenantId: tenant.id },
        data: { subscriptionPeriodId: first.periodId },
      });
      const subscription = await tx.tenantSubscription.findUniqueOrThrow({
        where: { tenantId: tenant.id },
      });
      const next = parseSubscriptionCommand([
        '--tenant',
        tenant.slug,
        '--plan',
        command.planCode,
        '--price',
        '20',
        '--start',
        '2026-11-11',
        '--due-date',
        '2026-11-14',
        '--apply',
      ]);
      await provisionSubscription(tx, next, now);
      const periods = await tx.subscriptionPeriod.findMany({
        where: { subscription: { tenantId: tenant.id } },
        orderBy: { startsAt: 'asc' },
      });
      expect(periods).toHaveLength(2);
      if (!periods[0] || !periods[1])
        throw new Error('Missing subscription periods');
      expect(periods[0].endsAt).toEqual(periods[1].startsAt);
      expect(periods[0].priceUsdSnapshot.toString()).toBe('20');
      const updated = await tx.tenantSubscription.findUniqueOrThrow({
        where: { tenantId: tenant.id },
      });
      expect(updated.subscriptionPeriodId).toBe(
        subscription.subscriptionPeriodId,
      );
    }));

  it('rejects unknown tenants before creating global plan data', async () =>
    rollback(async (tx) => {
      const { command } = await fixture(tx);
      await expect(
        provisionSubscription(
          tx,
          { ...command, tenantSlug: randomUUID(), apply: true },
          now,
        ),
      ).rejects.toThrow('Active tenant');
      expect(
        await tx.subscriptionPlan.count({ where: { code: command.planCode } }),
      ).toBe(0);
    }));

  it('rejects overlapping periods, changed pricing and suspended contracts', async () =>
    rollback(async (tx) => {
      const { tenant, command } = await fixture(tx);
      await provisionSubscription(tx, { ...command, apply: true }, now);
      await expect(
        provisionSubscription(
          tx,
          {
            ...command,
            startsAt: new Date('2026-10-12T04:00:00Z'),
            apply: true,
          },
          now,
        ),
      ).rejects.toThrow('contiguous');
      await expect(
        provisionSubscription(
          tx,
          { ...command, price: '30', apply: true },
          now,
        ),
      ).rejects.toThrow('price');
      await tx.tenantSubscription.update({
        where: { tenantId: tenant.id },
        data: { status: 'SUSPENDED' },
      });
      await expect(
        provisionSubscription(tx, { ...command, apply: true }, now),
      ).rejects.toThrow('SUSPENDED');
    }));

  it('rejects an unknown plan without explicit configuration', async () =>
    rollback(async (tx) => {
      const { command } = await fixture(tx);
      await expect(
        provisionSubscription(
          tx,
          { ...command, newPlan: undefined, apply: true },
          now,
        ),
      ).rejects.toThrow('--create-plan');
    }));

  it('preserves global plans when provisioning another tenant at a negotiated price', async () =>
    rollback(async (tx) => {
      const { command } = await fixture(tx);
      await provisionSubscription(tx, { ...command, apply: true }, now);
      const { tenant, command: second } = await fixture(tx);
      await provisionSubscription(
        tx,
        {
          ...second,
          planCode: command.planCode,
          price: '25',
          newPlan: undefined,
          apply: true,
        },
        now,
      );
      const plan = await tx.subscriptionPlan.findUniqueOrThrow({
        where: { code: command.planCode },
      });
      expect(plan.basePriceUsd.toString()).toBe('20');
      const subscription = await tx.tenantSubscription.findUniqueOrThrow({
        where: { tenantId: tenant.id },
      });
      expect(subscription.agreedPriceUsd.toString()).toBe('25');
    }));

  it('rejects inactive tenants and expired due dates without writing', async () =>
    rollback(async (tx) => {
      const { tenant, command } = await fixture(tx);
      await expect(
        provisionSubscription(
          tx,
          { ...command, dueAt: new Date('2026-10-10'), apply: true },
          now,
        ),
      ).rejects.toThrow('--due-date');
      await tx.tenant.update({
        where: { id: tenant.id },
        data: { isActive: false },
      });
      await expect(
        provisionSubscription(tx, { ...command, apply: true }, now),
      ).rejects.toThrow('Active tenant');
      expect(
        await tx.subscriptionPlan.count({ where: { code: command.planCode } }),
      ).toBe(0);
    }));

  it('rolls back provisioned records and audit together on transaction failure', async () => {
    let tenantId = '';
    let planCode = '';
    await expect(
      prisma.$transaction(
        async (tx) => {
          const { tenant, command } = await fixture(tx);
          tenantId = tenant.id;
          planCode = command.planCode;
          await provisionSubscription(tx, { ...command, apply: true }, now);
          throw new Error('Simulated provisioning failure');
        },
        { timeout: 15000 },
      ),
    ).rejects.toThrow('Simulated provisioning failure');
    expect(await prisma.tenantSubscription.count({ where: { tenantId } })).toBe(
      0,
    );
    expect(
      await prisma.subscriptionPlan.count({ where: { code: planCode } }),
    ).toBe(0);
    expect(await prisma.auditLog.count({ where: { tenantId } })).toBe(0);
    expect(await prisma.tenant.count({ where: { id: tenantId } })).toBe(0);
  });
});
