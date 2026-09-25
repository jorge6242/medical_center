import { Injectable, UnauthorizedException } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { type PrismaService } from '../../database/prisma.service';

import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const token = req.cookies?.['access_token'] as string | undefined;
          return token ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.email || !payload.tenantId) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        isActive: true,
        tenant: { isActive: true },
        role: {
          isActive: true,
          tenantId: payload.tenantId,
          name: payload.role,
          version: { version: payload.roleVersion },
        },
      },
      select: { id: true },
    });

    if (!user) throw new UnauthorizedException();

    return payload;
  }
}
