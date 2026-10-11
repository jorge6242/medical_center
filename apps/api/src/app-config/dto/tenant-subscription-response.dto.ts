import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

import type {
  TenantSubscriptionSummary,
  SubscriptionPeriodSummary,
} from '@centro-medico/shared/src/subscriptions';

const periodSelect = {
  id: true,
  planNameSnapshot: true,
  startsAt: true,
  endsAt: true,
  priceUsdSnapshot: true,
  invoice: {
    select: {
      number: true,
      status: true,
      totalUsd: true,
      dueAt: true,
      payments: { where: { status: 'CONFIRMED' }, select: { amountUsd: true } },
    },
  },
} satisfies Prisma.SubscriptionPeriodSelect;

export const subscriptionSummarySelect = {
  status: true,
  agreedPriceUsd: true,
  gracePeriodDays: true,
  subscriptionPeriod: { select: periodSelect },
  periods: { take: 1, orderBy: { startsAt: 'desc' }, select: periodSelect },
} satisfies Prisma.TenantSubscriptionSelect;

type SubscriptionRecord = Prisma.TenantSubscriptionGetPayload<{
  select: typeof subscriptionSummarySelect;
}>;
type PeriodRecord = SubscriptionRecord['periods'][number];

export class TenantSubscriptionResponseDto implements TenantSubscriptionSummary {
  status!: TenantSubscriptionSummary['status'];
  agreedPriceUsd!: string;
  gracePeriodDays!: number;
  coverageStatus!: TenantSubscriptionSummary['coverageStatus'];
  currentPeriod!: SubscriptionPeriodSummary | null;
  latestPeriod!: SubscriptionPeriodSummary | null;
}

function mapPeriod(
  period: PeriodRecord | null,
): SubscriptionPeriodSummary | null {
  if (!period) return null;
  const invoice = period.invoice;
  const paid =
    invoice?.payments.reduce(
      (sum, payment) => sum.plus(payment.amountUsd),
      new Prisma.Decimal(0),
    ) ?? new Prisma.Decimal(0);
  return {
    id: period.id,
    planName: period.planNameSnapshot,
    startsAt: period.startsAt.toISOString(),
    endsAt: period.endsAt.toISOString(),
    priceUsd: period.priceUsdSnapshot.toFixed(2),
    invoice: invoice
      ? {
          number: invoice.number,
          status: invoice.status,
          totalUsd: invoice.totalUsd.toFixed(2),
          confirmedPaidUsd: paid.toFixed(2),
          balanceUsd: Prisma.Decimal.max(
            invoice.totalUsd.minus(paid),
            0,
          ).toFixed(2),
          dueAt: invoice.dueAt.toISOString(),
        }
      : null,
  };
}

function coverage(
  record: SubscriptionRecord,
): TenantSubscriptionSummary['coverageStatus'] {
  const period = record.subscriptionPeriod;
  if (!period) return 'UNASSIGNED';
  if (!['ACTIVE', 'TRIALING'].includes(record.status)) return 'RESTRICTED';
  const now = new Date();
  if (period.startsAt > now) return 'SCHEDULED';
  if (period.endsAt <= now) return 'EXPIRED';
  return 'ACTIVE';
}

export function subscriptionResponse(
  record: SubscriptionRecord,
): TenantSubscriptionResponseDto {
  return plainToInstance(TenantSubscriptionResponseDto, {
    status: record.status,
    agreedPriceUsd: record.agreedPriceUsd.toFixed(2),
    gracePeriodDays: record.gracePeriodDays,
    coverageStatus: coverage(record),
    currentPeriod: mapPeriod(record.subscriptionPeriod),
    latestPeriod: mapPeriod(record.periods[0] ?? null),
  } satisfies TenantSubscriptionSummary);
}
