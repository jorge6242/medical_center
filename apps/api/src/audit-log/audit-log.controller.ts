import { Controller, Get, Query } from '@nestjs/common';

import { type AuditLogQueryService } from './audit-log-query.service';
import { type AuditLogQueryDto } from './dto/audit-log-query.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly queryService: AuditLogQueryService) {}

  @Get()
  @RequirePermission('audit_logs', 'read')
  list(@Query() query: AuditLogQueryDto) {
    return this.queryService.list(query);
  }
}
