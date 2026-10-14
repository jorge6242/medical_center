import { randomUUID } from 'node:crypto';

import { ConflictException } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { PlatformSubscriptionPaymentsService } from '../src/platform/subscriptions/platform-subscription-payments.service';

import type { PrismaService } from '../src/database/prisma.service';

// Opt-in: these tests commit disposable rows to exercise separate PostgreSQL transactions.
const databaseTests =
  process.env['PLATFORM_DB_TESTS'] === '1' ? describe : describe.skip;

databaseTests('Platform SaaS payment concurrency (PostgreSQL)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = process.env['DATABASE_URL'];
    if (
      process.env['NODE_ENV'] !== 'test' ||
      !databaseUrl ||
      new URL(databaseUrl).hostname !== 'db'
    ) {
      throw new Error('Requires NODE_ENV=test and the local Docker db service');
    }
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    await prisma.$connect();
  });

  afterAll(async () => prisma?.$disconnect());

  it.each([true, false])(
    'serializes concurrent voids (same key: %s)',
    async (sameKey) => {
      const ids = {
        tenant: randomUUID(),
        admin: randomUUID(),
        plan: randomUUID(),
        subscription: randomUUID(),
        period: randomUUID(),
        invoice: randomUUID(),
      };
      const paymentKey = randomUUID();
      const firstVoidKey = randomUUID();
      const secondVoidKey = sameKey ? firstVoidKey : randomUUID();
      const keys = [paymentKey, firstVoidKey, secondVoidKey];
      try {
        await createFixture(prisma, ids);
        const service = new PlatformSubscriptionPaymentsService(
          prisma as unknown as PrismaService,
          'disposable_platform_test_secret_32_chars',
        );
        const actor = {
          id: ids.admin,
          username: `test-${ids.admin}`,
          name: 'Test',
          sessionId: randomUUID(),
        };
        const paid = await service.registerPayment(
          actor,
          ids.tenant,
          ids.invoice,
          {
            currency: 'USD',
            amountPaid: '20.00',
            rate: null,
            method: 'CASH_USD',
            paidAt: '2026-10-12T12:00:00Z',
            idempotencyKey: paymentKey,
          },
        );
        const results = await Promise.allSettled(
          [firstVoidKey, secondVoidKey].map((key) =>
            service.voidPayment(actor, ids.tenant, paid.paymentId!, {
              reason: 'Test correction',
              idempotencyKey: key,
            }),
          ),
        );
        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(
          sameKey ? 2 : 1,
        );
        if (sameKey) {
          expect(
            results.filter((r) => r.status === 'fulfilled' && r.value.replayed),
          ).toHaveLength(1);
        } else {
          const rejected = results.find((r) => r.status === 'rejected');
          expect(
            rejected?.status === 'rejected' && rejected.reason,
          ).toBeInstanceOf(ConflictException);
        }
        expect(
          await prisma.platformAuditLog.count({
            where: { targetTenantId: ids.tenant, action: 'VOID' },
          }),
        ).toBe(1);
        expect(
          (
            await prisma.subscriptionPayment.findUniqueOrThrow({
              where: { id: paid.paymentId! },
            })
          ).status,
        ).toBe('VOIDED');
        expect(
          (
            await prisma.subscriptionInvoice.findUniqueOrThrow({
              where: { id: ids.invoice },
            })
          ).status,
        ).toBe('OVERDUE');
      } finally {
        await removeFixture(prisma, ids, keys);
      }
    },
  );

  it('serializes competing full payments, rejects overpay and safely replays the winner', async () => {
    const ids = {
      tenant: randomUUID(),
      admin: randomUUID(),
      plan: randomUUID(),
      subscription: randomUUID(),
      period: randomUUID(),
      invoice: randomUUID(),
    };
    const keys = [randomUUID(), randomUUID()];
    try {
      await createFixture(prisma, ids);
      const service = new PlatformSubscriptionPaymentsService(
        prisma as unknown as PrismaService,
        'disposable_platform_test_secret_32_chars',
      );
      const actor = {
        id: ids.admin,
        username: `test-${ids.admin}`,
        name: 'Disposable test administrator',
        sessionId: randomUUID(),
      };
      const inputs = keys.map((idempotencyKey) => ({
        currency: 'USD' as const,
        amountPaid: '20.00',
        rate: null,
        method: 'CASH_USD',
        paidAt: '2026-10-12T12:00:00Z',
        idempotencyKey,
      }));
      const results = await Promise.allSettled(
        inputs.map((input) =>
          service.registerPayment(actor, ids.tenant, ids.invoice, input),
        ),
      );
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.find((r) => r.status === 'rejected');
      expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(
        ConflictException,
      );
      if (!rejected || rejected.status !== 'rejected')
        throw new Error('Expected competing payment to be rejected');
      expect((rejected.reason as ConflictException).getStatus()).toBe(409);

      const winner = results.findIndex((r) => r.status === 'fulfilled');
      const replay = await service.registerPayment(
        actor,
        ids.tenant,
        ids.invoice,
        inputs[winner]!,
      );
      expect(replay.replayed).toBe(true);
      const payments = await prisma.subscriptionPayment.findMany({
        where: { subscriptionInvoiceId: ids.invoice },
      });
      expect(payments).toHaveLength(1);
      expect(payments[0]?.amountUsd.toFixed(2)).toBe('20.00');
      expect(payments[0]?.status).toBe('CONFIRMED');
      expect(
        await prisma.platformAuditLog.count({
          where: { targetTenantId: ids.tenant, entity: 'SubscriptionPayment' },
        }),
      ).toBe(1);
      const invoice = await prisma.subscriptionInvoice.findUniqueOrThrow({
        where: { id: ids.invoice },
      });
      expect(invoice.status).toBe('PAID');
    } finally {
      await removeFixture(prisma, ids, keys);
    }
  });
});

interface FixtureIds {
  tenant: string;
  admin: string;
  plan: string;
  subscription: string;
  period: string;
  invoice: string;
}

async function createFixture(prisma: PrismaClient, ids: FixtureIds) {
  await prisma.$transaction(async (tx) => {
    await tx.tenant.create({
      data: {
        id: ids.tenant,
        name: 'Disposable concurrency test',
        slug: ids.tenant,
      },
    });
    await tx.platformAdmin.create({
      data: {
        id: ids.admin,
        username: `test-${ids.admin}`,
        name: 'Disposable test administrator',
        passwordHash: 'not-a-login-capable-hash',
      },
    });
    await tx.subscriptionPlan.create({
      data: {
        id: ids.plan,
        code: ids.plan,
        name: 'Disposable test plan',
        basePriceUsd: '20.00',
        features: {},
        limits: {},
      },
    });
    await tx.tenantSubscription.create({
      data: {
        id: ids.subscription,
        tenantId: ids.tenant,
        agreedPriceUsd: '20.00',
      },
    });
    await tx.subscriptionPeriod.create({
      data: {
        id: ids.period,
        subscriptionId: ids.subscription,
        subscriptionPlanId: ids.plan,
        startsAt: new Date('2026-10-01T04:00:00Z'),
        endsAt: new Date('2026-11-01T04:00:00Z'),
        priceUsdSnapshot: '20.00',
        planCodeSnapshot: ids.plan,
        planNameSnapshot: 'Disposable test plan',
        featuresSnapshot: {},
        limitsSnapshot: {},
      },
    });
    await tx.subscriptionInvoice.create({
      data: {
        id: ids.invoice,
        subscriptionPeriodId: ids.period,
        number: ids.invoice,
        totalUsd: '20.00',
        issuedAt: new Date('2026-10-01T04:00:00Z'),
        dueAt: new Date('2026-10-05T04:00:00Z'),
      },
    });
  });
}

async function removeFixture(
  prisma: PrismaClient,
  ids: FixtureIds,
  keys: string[],
) {
  await prisma.$transaction(async (tx) => {
    await tx.platformAuditLog.deleteMany({
      where: { targetTenantId: ids.tenant },
    });
    await tx.platformIdempotencyKey.deleteMany({
      where: {
        scope: {
          in: [
            'platform.subscription.payment',
            'platform.subscription.payment.void',
          ],
        },
        key: { in: keys },
      },
    });
    await tx.subscriptionPayment.deleteMany({
      where: { subscriptionInvoiceId: ids.invoice },
    });
    await tx.subscriptionInvoice.deleteMany({ where: { id: ids.invoice } });
    await tx.subscriptionPeriod.deleteMany({ where: { id: ids.period } });
    await tx.tenantSubscription.deleteMany({ where: { id: ids.subscription } });
    await tx.subscriptionPlan.deleteMany({ where: { id: ids.plan } });
    await tx.platformAdmin.deleteMany({ where: { id: ids.admin } });
    await tx.tenant.deleteMany({ where: { id: ids.tenant } });
  });
}
