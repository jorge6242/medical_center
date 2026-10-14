import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { PlatformAuditQueryDto } from './dto/platform-audit-query.dto';
import { PlatformAuditQueryService } from './platform-audit-query.service';
import { PlatformCsrfGuard } from '../auth/platform-csrf.guard';
import { PlatformRealm } from '../auth/platform-realm.decorator';

@Controller('platform')
@PlatformRealm()
@UseGuards(PlatformCsrfGuard)
export class PlatformAuditController {
  constructor(private readonly audit: PlatformAuditQueryService) {}

  @Get('audit')
  list(@Query() query: PlatformAuditQueryDto) {
    return this.audit.list({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      targetTenantId: query.targetTenantId,
      entity: query.entity,
      action: query.action,
      from: query.from,
      to: query.to,
    });
  }
}
