'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  getPlatformTenant,
  listPlatformPlans,
  listPlatformTenants,
  type TenantListParams,
} from '../services/platform-tenants.service';

export function usePlatformTenants(params: TenantListParams) {
  return useQuery({
    queryKey: ['platform', 'tenants', 'list', params],
    queryFn: () => listPlatformTenants(params),
    placeholderData: keepPreviousData,
  });
}

export function usePlatformTenant(id: string) {
  return useQuery({
    queryKey: ['platform', 'tenants', 'detail', id],
    queryFn: () => getPlatformTenant(id),
    enabled: Boolean(id),
  });
}

export function usePlatformPlans() {
  return useQuery({
    queryKey: ['platform', 'plans'],
    queryFn: listPlatformPlans,
    staleTime: 5 * 60 * 1000,
  });
}
