'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/auth.store';

import { getInitConfig } from '../services/config.service';

export function useAppConfig() {
  const email = useAuthStore((state) => state.email);

  return useQuery({
    queryKey: ['config', 'init', email],
    queryFn: getInitConfig,
    enabled: Boolean(email),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
