import { Prisma } from '@prisma/client';

export const subscriptionPeriodFixture = {
  id: 'period-1',
  planNameSnapshot: 'Base',
  startsAt: new Date('2026-10-01T04:00:00Z'),
  endsAt: new Date('2026-11-01T04:00:00Z'),
  priceUsdSnapshot: new Prisma.Decimal('20'),
  invoice: {
    number: 'SUB-1',
    status: 'PARTIALLY_PAID' as const,
    totalUsd: new Prisma.Decimal('20'),
    dueAt: new Date('2026-10-05T04:00:00Z'),
    payments: [{ amountUsd: new Prisma.Decimal('7.50') }],
  },
};

export const subscriptionFixture = {
  status: 'ACTIVE' as const,
  agreedPriceUsd: new Prisma.Decimal('20'),
  gracePeriodDays: 3,
  subscriptionPeriod: subscriptionPeriodFixture,
  periods: [subscriptionPeriodFixture],
};
