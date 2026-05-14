import { apiJson } from '@/config/api';

export interface QueueStatus {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export const getQueueStatuses = (): Promise<QueueStatus[]> => apiJson('/queues');
