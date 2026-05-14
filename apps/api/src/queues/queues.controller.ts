import { Controller, Get, UseGuards } from '@nestjs/common';

import { QueuesService } from './queues.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

import type { QueueStatusDto } from './dto/queue-status.dto';

@Controller('queues')
@UseGuards(JwtAuthGuard, AclGuard)
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Get()
  @RequirePermission('roles', 'read')
  getStatuses(): Promise<QueueStatusDto[]> {
    return this.queuesService.getStatuses();
  }
}
