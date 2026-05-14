import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { RECEIPT_EMAIL_QUEUE, RECEIPT_GENERATION_QUEUE } from '@centro-medico/shared/queues';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';

import type { Queue } from 'bullmq';

@Injectable()
export class BullBoardService {
  private readonly serverAdapter: ExpressAdapter;

  constructor(
    @InjectQueue(RECEIPT_GENERATION_QUEUE)
    receiptGenerationQueue: Queue,
    @InjectQueue(RECEIPT_EMAIL_QUEUE)
    receiptEmailQueue: Queue,
  ) {
    this.serverAdapter = new ExpressAdapter();
    this.serverAdapter.setBasePath('/queues/bull-board');

    createBullBoard({
      queues: [new BullMQAdapter(receiptGenerationQueue), new BullMQAdapter(receiptEmailQueue)],
      serverAdapter: this.serverAdapter,
    });
  }

  getRouter() {
    return this.serverAdapter.getRouter();
  }
}
