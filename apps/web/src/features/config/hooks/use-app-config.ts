'use client';

import { useQuery } from '@tanstack/react-query';

import { getInitConfig } from '../services/config.service';

export function useAppConfig() {
  return useQuery({
    queryKey: ['config', 'init'],
    queryFn: getInitConfig,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
