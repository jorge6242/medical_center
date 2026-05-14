'use client';

import { useQuery } from '@tanstack/react-query';

import { getHomeStats } from '../services/stats.service';

export function useHomeStats() {
  return useQuery({ queryKey: ['home-stats'], queryFn: getHomeStats });
}
