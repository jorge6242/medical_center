import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import { CurrentPlatformAdmin } from './current-platform-admin.decorator';
import { PlatformLoginDto } from './dto/platform-login.dto';
import {
  PLATFORM_ACCESS_COOKIE,
  PLATFORM_SESSION_TTL_MS,
} from './platform-auth.constants';
import { PlatformAuthService } from './platform-auth.service';
import { platformCookieOptions } from './platform-cookie';
import { PlatformCsrfGuard } from './platform-csrf.guard';
import { PlatformRealm } from './platform-realm.decorator';
import { Public } from '../../common/decorators/public.decorator';

import type { PlatformIdentity } from './platform-auth.service';
import type { Request, Response } from 'express';

@Controller('platform/auth')
@UseGuards(PlatformCsrfGuard)
export class PlatformAuthController {
  constructor(private readonly platformAuth: PlatformAuthService) {}

  @Post('login')
  @PlatformRealm()
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: PlatformLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, admin, csrfToken } = await this.platformAuth.login(
      dto.username.trim().toLowerCase(),
      dto.password,
      req.ip ?? 'unknown',
    );
    res.cookie(PLATFORM_ACCESS_COOKIE, token, {
      ...platformCookieOptions(),
      maxAge: PLATFORM_SESSION_TTL_MS,
    });
    return { ...admin, csrfToken };
  }

  @Post('logout')
  @PlatformRealm()
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentPlatformAdmin() identity: PlatformIdentity,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.platformAuth.logout(identity);
    res.clearCookie(PLATFORM_ACCESS_COOKIE, platformCookieOptions());
    return { message: 'Sesión de plataforma cerrada' };
  }

  @Get('me')
  @PlatformRealm()
  me(@CurrentPlatformAdmin() identity: PlatformIdentity) {
    return {
      id: identity.id,
      username: identity.username,
      name: identity.name,
      csrfToken: this.platformAuth.csrfTokenFor(identity),
    };
  }
}
