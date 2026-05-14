import { Controller, Get, UseGuards } from '@nestjs/common';

import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

import type { HomeStatsDto } from './dto/home-stats.dto';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('home')
  @RequirePermission('payments', 'read')
  getHome(@CurrentUser() user: JwtPayload): Promise<HomeStatsDto> {
    return this.statsService.getHomeStats(user.tenantId);
  }
}
