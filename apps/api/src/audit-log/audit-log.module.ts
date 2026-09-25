import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuditLogQueryService } from './audit-log-query.service';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AuditWriter } from './audit-writer';
import { TraceWriter } from './trace-writer';
import { RequestContextModule } from '../common/context';

@Global()
@Module({
  imports: [ConfigModule, RequestContextModule],
  providers: [AuditLogService, AuditWriter, TraceWriter, AuditLogQueryService],
  exports: [AuditLogService, AuditWriter, TraceWriter],
  controllers: [AuditLogController],
})
export class AuditLogModule {}
