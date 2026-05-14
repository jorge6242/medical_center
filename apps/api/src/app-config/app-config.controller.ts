import { Controller, Get, UseGuards } from '@nestjs/common';

import { AppConfigService } from './app-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';


@Controller('config')
@UseGuards(JwtAuthGuard)
export class AppConfigController {
  constructor(private readonly service: AppConfigService) {}

  @Get('init')
  getInit(@CurrentUser() user: JwtPayload) {
    return this.service.getInitConfig(user.tenantId);
  }
}
