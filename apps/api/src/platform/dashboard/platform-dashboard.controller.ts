import { Controller, Get, UseGuards } from '@nestjs/common';

import { PlatformDashboardService } from './platform-dashboard.service';
import { PlatformCsrfGuard } from '../auth/platform-csrf.guard';
import { PlatformRealm } from '../auth/platform-realm.decorator';

@Controller('platform')
@PlatformRealm()
@UseGuards(PlatformCsrfGuard)
export class PlatformDashboardController {
  constructor(private readonly dashboard: PlatformDashboardService) {}

  @Get('dashboard')
  summary() {
    return this.dashboard.summary();
  }
}
