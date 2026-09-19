import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuditLogService } from './audit-log.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
