import { Module } from '@nestjs/common';

import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [MailerModule, AuditLogModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
