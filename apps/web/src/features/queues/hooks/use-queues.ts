'use client';

import { useQuery } from '@tanstack/react-query';

import { getQueueStatuses } from '../services/queues.service';

export function useQueueStatuses() {
  return useQuery({ queryKey: ['queues'], queryFn: getQueueStatuses });
}
