import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import {
  PLATFORM_JWT_AUDIENCE,
  PLATFORM_JWT_ISSUER,
  PLATFORM_JWT_PURPOSE,
  PLATFORM_JWT_SECRET,
  PLATFORM_SESSION_TTL,
  PLATFORM_SESSION_TTL_MS,
} from './platform-auth.constants';
import { csrfTokenFor } from './platform-csrf';
import { PlatformLoginLimiter } from './platform-login-limiter';
import { PrismaService } from '../../database/prisma.service';
import { platformAuditTrace } from '../audit/platform-audit-context';

const BCRYPT_ROUNDS = 12;
const INVALID_CREDENTIALS = 'Credenciales inválidas';

export interface PlatformAdminProfile {
  id: string;
  username: string;
  name: string;
}

export interface PlatformIdentity extends PlatformAdminProfile {
  sessionId: string;
}

interface PlatformClaims {
  sub: string;
  sid: string;
  sv: number;
  purpose: string;
}

@Injectable()
export class PlatformAuthService {
  private readonly dummyHash = bcrypt.hash('timing-equalizer', BCRYPT_ROUNDS);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(PLATFORM_JWT_SECRET) private readonly secret: string,
    private readonly limiter: PlatformLoginLimiter,
  ) {}

  csrfTokenFor(identity: PlatformIdentity): string {
    return csrfTokenFor(identity.sessionId, this.secret);
  }

  async login(
    username: string,
    password: string,
    clientIp = 'unknown',
  ): Promise<{
    token: string;
    admin: PlatformAdminProfile;
    csrfToken: string;
  }> {
    const keys = [`ip:${clientIp}`, `user:${username}`];
    this.limiter.assertAllowed(keys);

    const admin = await this.prisma.platformAdmin.findUnique({
      where: { username },
    });
    const hash = admin?.passwordHash ?? (await this.dummyHash);
    const passwordValid = await bcrypt.compare(password, hash);

    if (!admin || !admin.isActive || !passwordValid) {
      this.limiter.recordFailure(keys);
      await this.auditFailedLogin();
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    this.limiter.reset([`user:${username}`]);

    const session = await this.prisma.platformSession.create({
      data: {
        platformAdminId: admin.id,
        expiresAt: new Date(Date.now() + PLATFORM_SESSION_TTL_MS),
      },
    });

    const token = await this.jwt.signAsync(
      {
        sub: admin.id,
        sid: session.id,
        sv: admin.sessionVersion,
        purpose: PLATFORM_JWT_PURPOSE,
      },
      {
        secret: this.secret,
        issuer: PLATFORM_JWT_ISSUER,
        audience: PLATFORM_JWT_AUDIENCE,
        expiresIn: PLATFORM_SESSION_TTL,
      },
    );

    return {
      token,
      admin: { id: admin.id, username: admin.username, name: admin.name },
      csrfToken: csrfTokenFor(session.id, this.secret),
    };
  }

  async verifyToken(token: string): Promise<PlatformIdentity> {
    const claims = await this.verifyClaims(token);

    const session = await this.prisma.platformSession.findUnique({
      where: { id: claims.sid },
      include: { platformAdmin: true },
    });
    const admin = session?.platformAdmin;
    const isCurrent =
      session !== null &&
      session.revokedAt === null &&
      session.expiresAt.getTime() > Date.now() &&
      admin !== undefined &&
      admin.isActive &&
      admin.id === claims.sub &&
      admin.sessionVersion === claims.sv;

    if (!isCurrent || !session || !admin) {
      throw new UnauthorizedException();
    }

    return {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      sessionId: session.id,
    };
  }

  async logout(identity: PlatformIdentity): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.platformSession.updateMany({
        where: { id: identity.sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.platformAuditLog.create({
        data: {
          actorKind: 'PLATFORM_ADMIN',
          ...platformAuditTrace(),
          platformAdminId: identity.id,
          entity: 'PlatformSession',
          entityId: identity.sessionId,
          action: 'LOGOUT',
          changedFields: ['revokedAt'],
        },
      });
    });
  }

  private async verifyClaims(token: string): Promise<PlatformClaims> {
    let claims: PlatformClaims;
    try {
      claims = await this.jwt.verifyAsync<PlatformClaims>(token, {
        secret: this.secret,
        issuer: PLATFORM_JWT_ISSUER,
        audience: PLATFORM_JWT_AUDIENCE,
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException();
    }
    if (claims.purpose !== PLATFORM_JWT_PURPOSE || !claims.sid) {
      throw new UnauthorizedException();
    }
    return claims;
  }

  private async auditFailedLogin(): Promise<void> {
    await this.prisma.platformAuditLog.create({
      data: {
        actorKind: 'ANONYMOUS',
        ...platformAuditTrace(),
        entity: 'PlatformAuth',
        entityId: 'login',
        action: 'LOGIN_FAILED',
        result: 'FAILURE',
        reason: 'invalid_credentials',
      },
    });
  }
}
