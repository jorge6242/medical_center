import { Module } from '@nestjs/common';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  imports: [AuditLogModule, ReceiptsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
