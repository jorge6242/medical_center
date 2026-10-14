import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { PlatformSubscriptionsService } from '../src/platform/subscriptions/platform-subscriptions.service';

import type { PrismaService } from '../src/database/prisma.service';

const databaseTests =
  process.env['PLATFORM_DB_TESTS'] === '1' ? describe : describe.skip;

databaseTests('Platform period concurrency (PostgreSQL)', () => {
  let prisma: PrismaClient;
  beforeAll(async () => {
    const url = process.env['DATABASE_URL'];
    if (
      process.env['NODE_ENV'] !== 'test' ||
      !url ||
      new URL(url).hostname !== 'db'
    ) {
      throw new Error('Requires NODE_ENV=test and local Docker db');
    }
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url }),
    });
    await prisma.$connect();
  });
  afterAll(async () => prisma?.$disconnect());

  it.each([true, false])(
    'serializes competing periods (same key: %s)',
    async (sameKey) => {
      const tenantId = randomUUID();
      const adminId = randomUUID();
      const planId = randomUUID();
      const keys = [randomUUID(), randomUUID()];
      if (sameKey) keys[1] = keys[0]!;
      try {
        await prisma.tenant.create({
          data: {
            id: tenantId,
            name: 'Disposable period test',
            slug: tenantId,
          },
        });
        await prisma.platformAdmin.create({
          data: {
            id: adminId,
            username: adminId,
            name: 'Test',
            passwordHash: 'not-login-capable',
          },
        });
        await prisma.subscriptionPlan.create({
          data: {
            id: planId,
            code: planId,
            name: 'Test',
            basePriceUsd: '20.00',
            features: {},
            limits: {},
          },
        });
        await prisma.tenantSubscription.create({
          data: { tenantId, agreedPriceUsd: '20.00' },
        });
        const service = new PlatformSubscriptionsService(
          prisma as unknown as PrismaService,
          'disposable_platform_test_secret_32_chars',
        );
        const actor = {
          id: adminId,
          username: adminId,
          name: 'Test',
          sessionId: randomUUID(),
        };
        const results = await Promise.allSettled(
          keys.map((idempotencyKey) =>
            service.createPeriod(actor, tenantId, {
              planCode: planId,
              startsAt: '2026-11-01T04:00:00Z',
              dueAt: '2026-11-05T04:00:00Z',
              idempotencyKey,
            }),
          ),
        );
        expect(
          results.filter((result) => result.status === 'fulfilled'),
        ).toHaveLength(sameKey ? 2 : 1);
        if (sameKey)
          expect(
            results.filter(
              (result) =>
                result.status === 'fulfilled' && result.value.replayed,
            ),
          ).toHaveLength(1);
        expect(
          await prisma.subscriptionPeriod.count({
            where: { subscription: { tenantId } },
          }),
        ).toBe(1);
        expect(
          await prisma.subscriptionInvoice.count({
            where: { subscriptionPeriod: { subscription: { tenantId } } },
          }),
        ).toBe(1);
        expect(
          await prisma.platformAuditLog.count({
            where: { targetTenantId: tenantId, entity: 'SubscriptionPeriod' },
          }),
        ).toBe(1);
      } finally {
        await prisma.$transaction(async (tx) => {
          await tx.platformAuditLog.deleteMany({
            where: { targetTenantId: tenantId },
          });
          await tx.platformIdempotencyKey.deleteMany({
            where: { scope: 'platform.subscription.period', key: { in: keys } },
          });
          await tx.tenantSubscription.updateMany({
            where: { tenantId },
            data: { subscriptionPeriodId: null },
          });
          await tx.subscriptionInvoice.deleteMany({
            where: { subscriptionPeriod: { subscription: { tenantId } } },
          });
          await tx.subscriptionPeriod.deleteMany({
            where: { subscription: { tenantId } },
          });
          await tx.tenantSubscription.deleteMany({ where: { tenantId } });
          await tx.subscriptionPlan.deleteMany({ where: { id: planId } });
          await tx.platformAdmin.deleteMany({ where: { id: adminId } });
          await tx.tenant.deleteMany({ where: { id: tenantId } });
        });
      }
    },
  );
});
