import { Module } from '@nestjs/common';

import { ReceiptEmailProcessor } from './receipt-email.processor';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [MailerModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, ReceiptEmailProcessor],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
