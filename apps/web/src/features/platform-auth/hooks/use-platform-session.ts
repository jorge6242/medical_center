'use client';

import { useQuery } from '@tanstack/react-query';

import { platformMe, type PlatformSession } from '../services/platform-auth.service';

export const PLATFORM_SESSION_KEY = ['platform', 'session'] as const;

export function usePlatformSession() {
  return useQuery<PlatformSession>({
    queryKey: PLATFORM_SESSION_KEY,
    queryFn: platformMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
