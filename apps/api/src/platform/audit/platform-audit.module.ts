import { Module } from '@nestjs/common';

import { PlatformAuditQueryService } from './platform-audit-query.service';
import { PlatformAuditController } from './platform-audit.controller';

@Module({
  controllers: [PlatformAuditController],
  providers: [PlatformAuditQueryService],
})
export class PlatformAuditModule {}
