import { RECEIPT_EMAIL_QUEUE, type ReceiptEmailJobData } from '@centro-medico/shared/queues';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';

import { ReceiptsService } from './receipts.service';
import { MailerService } from '../mailer/mailer.service';

import type { Job } from 'bullmq';



@Injectable()
@Processor(RECEIPT_EMAIL_QUEUE)
export class ReceiptEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(ReceiptEmailProcessor.name);

  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly mailerService: MailerService,
  ) {
    super();
  }

  async process(job: Job<ReceiptEmailJobData>): Promise<void> {
    const receipt = await this.receiptsService.findByPayment(job.data.tenantId, job.data.paymentId);
    const { subject, html, template } = this.mailerService.renderTemplate('receiptEmail', {
      receiptNumber: receipt.receiptNumber,
      doctorName: receipt.doctorName,
      doctorShare: receipt.doctorShare,
      paymentId: receipt.paymentId,
    });

    await this.mailerService.sendReceiptEmail(job.data.recipientEmail, subject, html);
    this.logger.log(
      `Receipt email sent for payment ${job.data.paymentId} using ${template.name}.v${template.version} (${template.category}/${template.audience})`,
    );
  }
}
