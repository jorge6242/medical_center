'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { getTenantSubscription } from '../services/subscription.service';

export function useTenantSubscription() {
  const userId = useAuthStore((state) => state.userId);
  return useQuery({
    queryKey: ['config', 'subscription', userId],
    queryFn: getTenantSubscription,
    enabled: Boolean(userId),
  });
}
