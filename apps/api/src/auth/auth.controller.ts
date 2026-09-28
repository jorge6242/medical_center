import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { BootstrapAccessLinkDto } from './dto/bootstrap-access-link.dto';
import { CreateAccessLinkDto } from './dto/create-access-link.dto';
import { LoginDto } from './dto/login.dto';
import { TenantAccessContextDto } from './dto/tenant-access-context.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InternalRequest } from '../common/decorators/internal-request.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PrismaService } from '../database/prisma.service';
import { OnboardingService } from '../doctors/onboarding.service';

import type { AuthResponseDto } from './dto/auth-response.dto';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import type { Response } from 'express';

const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000; // 8h en ms

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly onboardingService: OnboardingService,
    private readonly auditLog: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { token, response } = await this.authService.login(dto);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: process.env['NODE_ENV'] === 'production' ? 'none' : 'strict',
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  }

  @Post('access-context')
  @Public()
  @HttpCode(HttpStatus.OK)
  resolveAccessContext(@Body() dto: TenantAccessContextDto) {
    return this.authService.resolveAccessContext(dto.accessToken);
  }

  @Get('tenant-by-webslug/:webSlug')
  @Public()
  resolveByWebSlug(@Param('webSlug') webSlug: string) {
    return this.authService.resolveByWebSlug(webSlug);
  }

  @Post('access-links/bootstrap')
  @InternalRequest()
  @Public()
  bootstrapAccessLink(@Body() dto: BootstrapAccessLinkDto) {
    return this.authService.bootstrapAccessLink(dto);
  }

  @Post('access-links')
  @RequirePermission('tenant_access_links', 'create')
  async createAccessLink(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAccessLinkDto,
  ) {
    const link = await this.authService.createAccessLink(
      user.tenantId,
      user.sub,
      dto,
    );
    await this.auditLog.log(
      {
        action: 'CREATE',
        entity: 'TenantAccessLink',
        entityId: link.id,
        newValues: { expiresAt: link.expiresAt },
        changedFields: ['created'],
      },
      this.prisma,
    );
    return link;
  }

  @Post('access-links/:id/revoke')
  @RequirePermission('tenant_access_links', 'revoke')
  async revokeAccessLink(
    @CurrentUser() user: JwtPayload,
    @Param('id') linkId: string,
  ) {
    await this.authService.revokeAccessLink(user.tenantId, linkId);
    await this.auditLog.log(
      {
        action: 'DEACTIVATE',
        entity: 'TenantAccessLink',
        entityId: linkId,
        newValues: { revoked: true },
        changedFields: ['revokedAt'],
      },
      this.prisma,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(
    @CurrentUser() user: JwtPayload,
  ): AuthResponseDto & { userId: string; email: string } {
    return {
      userId: user.sub,
      email: user.email,
      role: user.role,
      roleVersion: user.roleVersion,
      doctorId: user.doctorId,
      permissions: user.permissions,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    res.clearCookie('access_token');
    await this.auditLog.log(
      {
        action: 'LOGOUT',
        entity: 'Auth',
        entityId: user.sub,
        newValues: { outcome: 'success' },
        changedFields: ['session'],
      },
      this.prisma,
    );
    return { message: 'Sesión cerrada' };
  }

  @Post('onboarding/:token')
  @Public()
  @HttpCode(HttpStatus.OK)
  async completeOnboarding(
    @Param('token') token: string,
    @Body('password') password: string,
  ): Promise<{ message: string }> {
    await this.onboardingService.completeOnboarding(token, password);
    return { message: 'Cuenta activada exitosamente' };
  }
}
