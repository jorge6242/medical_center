import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import {
  PLATFORM_ALLOWED_ORIGINS,
  PLATFORM_JWT_SECRET,
} from './platform-auth.constants';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthGuard } from './platform-auth.guard';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformCsrfGuard } from './platform-csrf.guard';
import { PlatformLoginLimiter } from './platform-login-limiter';

@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [PlatformAuthController],
  providers: [
    PlatformAuthService,
    PlatformAuthGuard,
    PlatformCsrfGuard,
    PlatformLoginLimiter,
    {
      provide: PLATFORM_JWT_SECRET,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.getOrThrow<string>('PLATFORM_JWT_SECRET'),
    },
    {
      provide: PLATFORM_ALLOWED_ORIGINS,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        (
          configService.get<string>('PLATFORM_ALLOWED_ORIGINS') ??
          configService.get<string>('FRONTEND_URL') ??
          'http://localhost:3000'
        )
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
    },
  ],
  exports: [
    PlatformAuthService,
    PlatformAuthGuard,
    PlatformCsrfGuard,
    PLATFORM_JWT_SECRET,
    PLATFORM_ALLOWED_ORIGINS,
  ],
})
export class PlatformAuthModule {}
