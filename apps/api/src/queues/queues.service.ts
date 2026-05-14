import {
  RECEIPT_EMAIL_QUEUE,
  RECEIPT_GENERATION_QUEUE,
} from '@centro-medico/shared/queues';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';

import type { QueueStatusDto } from './dto/queue-status.dto';
import type { Queue } from 'bullmq';



@Injectable()
export class QueuesService {
  constructor(
    @InjectQueue(RECEIPT_GENERATION_QUEUE)
    private readonly receiptGenerationQueue: Queue,
    @InjectQueue(RECEIPT_EMAIL_QUEUE)
    private readonly receiptEmailQueue: Queue,
  ) {}

  async getStatuses(): Promise<QueueStatusDto[]> {
    return Promise.all([
      this.mapQueue(RECEIPT_GENERATION_QUEUE, this.receiptGenerationQueue),
      this.mapQueue(RECEIPT_EMAIL_QUEUE, this.receiptEmailQueue),
    ]);
  }

  private async mapQueue(name: string, queue: Queue): Promise<QueueStatusDto> {
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');

    return {
      name,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      paused: (await queue.isPaused()) ? 1 : 0,
    };
  }
}
