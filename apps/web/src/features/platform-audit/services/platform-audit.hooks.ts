'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { listPlatformAudit } from '../../platform-subscriptions/services/platform-subscriptions.service';

export function usePlatformAudit(params: Parameters<typeof listPlatformAudit>[0]) {
  return useQuery({
    queryKey: ['platform', 'audit', params],
    queryFn: () => listPlatformAudit(params),
    placeholderData: keepPreviousData,
  });
}
