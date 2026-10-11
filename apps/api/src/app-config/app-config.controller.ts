import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { AppConfigService } from './app-config.service';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

import type { UploadedLogo } from '../railway-bucket/railway-bucket.service';

@Controller('config')
@UseGuards(JwtAuthGuard)
export class AppConfigController {
  constructor(private readonly service: AppConfigService) {}

  @Get('init')
  getInit(@CurrentUser() user: JwtPayload) {
    return this.service.getInitConfig(user.tenantId);
  }

  @Get('subscription')
  @RequirePermission('tenant_settings', 'update')
  getSubscription(@CurrentUser() user: JwtPayload) {
    return this.service.getSubscription(user.tenantId);
  }

  @Post('logo')
  @RequirePermission('tenant_settings', 'update')
  @UseInterceptors(
    FileInterceptor('logo', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  replaceLogo(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: UploadedLogo | undefined,
  ) {
    if (!file) throw new BadRequestException('Debés adjuntar un logo');

    return this.service.replaceLogo(user.tenantId, file);
  }

  @Patch('tenant')
  @RequirePermission('tenant_settings', 'update')
  updateTenantSettings(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    return this.service.updateTenantSettings(user.tenantId, dto);
  }
}
