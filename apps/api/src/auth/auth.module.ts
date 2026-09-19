import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RequestContextModule } from '../common/context';
import { OnboardingService } from '../doctors/onboarding.service';
import { MailerModule } from '../mailer/mailer.module';
import { RolesModule } from '../roles/roles.module';
import { AclGuard } from './guards/acl.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '8h'),
        },
      }),
    }),
    RequestContextModule,
    RolesModule,
    MailerModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OnboardingService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AclGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
