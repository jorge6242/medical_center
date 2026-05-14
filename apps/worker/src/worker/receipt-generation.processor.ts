import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { RECEIPT_GENERATION_QUEUE, type ReceiptGenerationJobData } from '@centro-medico/shared/queues';

@Injectable()
@Processor(RECEIPT_GENERATION_QUEUE)
export class ReceiptGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReceiptGenerationProcessor.name);

  async process(job: Job<ReceiptGenerationJobData>): Promise<void> {
    const apiUrl = process.env['API_INTERNAL_URL'] ?? 'http://api:3001';
    const { paymentId } = job.data;

    const response = await fetch(`${apiUrl}/receipts/${paymentId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': job.data.tenantId,
        'x-generated-by-id': job.data.generatedById,
        'x-internal-secret': process.env['API_INTERNAL_SECRET'] ?? '',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Receipt job failed for ${paymentId}: ${response.status} ${body}`);
      throw new Error(`Receipt generation failed for ${paymentId}`);
    }

    this.logger.log(`Receipt generated for payment ${paymentId}`);
  }
}
