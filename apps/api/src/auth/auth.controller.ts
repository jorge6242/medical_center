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
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
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
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    res.clearCookie('access_token');
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
