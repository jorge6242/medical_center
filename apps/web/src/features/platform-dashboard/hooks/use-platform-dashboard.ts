'use client';

import { useQuery } from '@tanstack/react-query';

import { getPlatformDashboard } from '../services/platform-dashboard.service';

export function usePlatformDashboard() {
  return useQuery({
    queryKey: ['platform', 'dashboard'],
    queryFn: getPlatformDashboard,
  });
}
