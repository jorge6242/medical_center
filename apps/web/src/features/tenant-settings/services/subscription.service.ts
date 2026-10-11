import type { TenantSubscriptionSummary } from '@centro-medico/shared/src/subscriptions';
import { apiJson } from '@/config/api';

export const getTenantSubscription = (): Promise<TenantSubscriptionSummary | null> =>
  apiJson('/config/subscription');
