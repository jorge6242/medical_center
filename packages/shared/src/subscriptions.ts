export interface SubscriptionPeriodSummary {
  id: string;
  planName: string;
  startsAt: string;
  endsAt: string;
  priceUsd: string;
  invoice: {
    number: string;
    status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOIDED';
    totalUsd: string;
    confirmedPaidUsd: string;
    balanceUsd: string;
    dueAt: string;
  } | null;
}

export interface TenantSubscriptionSummary {
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED';
  agreedPriceUsd: string;
  gracePeriodDays: number;
  coverageStatus: 'UNASSIGNED' | 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'RESTRICTED';
  currentPeriod: SubscriptionPeriodSummary | null;
  latestPeriod: SubscriptionPeriodSummary | null;
}
