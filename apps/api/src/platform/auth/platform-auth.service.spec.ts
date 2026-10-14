import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import {
  PLATFORM_JWT_AUDIENCE,
  PLATFORM_JWT_ISSUER,
  PLATFORM_JWT_PURPOSE,
} from './platform-auth.constants';
import { PlatformAuthService } from './platform-auth.service';
import { csrfTokenFor } from './platform-csrf';
import { PlatformLoginLimiter } from './platform-login-limiter';

const PLATFORM_SECRET = 'platform_secret_minimo_32_caracteres_aaaa';
const TENANT_SECRET = 'tenant_secret_minimo_32_caracteres_bbbbb';
const PASSWORD = 'Exirion.05*';

type Mock = jest.Mock;

function buildPrismaMock() {
  const prisma = {
    platformAdmin: { findUnique: jest.fn() as Mock },
    platformSession: {
      create: jest.fn() as Mock,
      findUnique: jest.fn() as Mock,
      updateMany: jest.fn() as Mock,
    },
    platformAuditLog: { create: jest.fn() as Mock },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn(prisma),
  );
  return prisma;
}

describe('PlatformAuthService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let jwt: JwtService;
  let service: PlatformAuthService;
  let passwordHash: string;
  let admin: {
    id: string;
    username: string;
    name: string;
    passwordHash: string;
    isActive: boolean;
    sessionVersion: number;
  };

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
  });

  beforeEach(() => {
    prisma = buildPrismaMock();
    jwt = new JwtService({});
    service = new PlatformAuthService(
      prisma as never,
      jwt,
      PLATFORM_SECRET,
      new PlatformLoginLimiter(),
    );
    admin = {
      id: 'admin-1',
      username: 'exiadmin',
      name: 'exiadmin',
      passwordHash,
      isActive: true,
      sessionVersion: 0,
    };
  });

  async function signPlatformToken(
    sessionId: string,
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    return jwt.signAsync(
      {
        sub: admin.id,
        sid: sessionId,
        sv: admin.sessionVersion,
        purpose: PLATFORM_JWT_PURPOSE,
        ...overrides,
      },
      {
        secret: PLATFORM_SECRET,
        issuer: PLATFORM_JWT_ISSUER,
        audience: PLATFORM_JWT_AUDIENCE,
        expiresIn: '8h',
      },
    );
  }

  describe('login', () => {
    it('creates a revocable session and returns a platform token', async () => {
      prisma.platformAdmin.findUnique.mockResolvedValue(admin);
      prisma.platformSession.create.mockResolvedValue({ id: 'sess-1' });

      const result = await service.login('exiadmin', PASSWORD);

      expect(result.admin).toEqual({
        id: 'admin-1',
        username: 'exiadmin',
        name: 'exiadmin',
      });
      const claims = await jwt.verifyAsync(result.token, {
        secret: PLATFORM_SECRET,
        issuer: PLATFORM_JWT_ISSUER,
        audience: PLATFORM_JWT_AUDIENCE,
      });
      expect(claims).toMatchObject({
        sub: 'admin-1',
        sid: 'sess-1',
        sv: 0,
        purpose: PLATFORM_JWT_PURPOSE,
      });
      expect(claims).not.toHaveProperty('tenantId');
      expect(prisma.platformSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ platformAdminId: 'admin-1' }),
      });
      expect(result.csrfToken).toBe(csrfTokenFor('sess-1', PLATFORM_SECRET));
    });

    it('blocks further attempts after repeated failures for the same account', async () => {
      prisma.platformAdmin.findUnique.mockResolvedValue(admin);

      for (let i = 0; i < 5; i++) {
        await expect(service.login('exiadmin', 'mala-clave-x')).rejects.toThrow(
          UnauthorizedException,
        );
      }
      await expect(service.login('exiadmin', PASSWORD)).rejects.toMatchObject({
        status: 429,
      });
      expect(prisma.platformSession.create).not.toHaveBeenCalled();
    });

    it('rejects a wrong password with a generic message and audits the failure', async () => {
      prisma.platformAdmin.findUnique.mockResolvedValue(admin);

      await expect(service.login('exiadmin', 'otra-clave-x')).rejects.toThrow(
        new UnauthorizedException('Credenciales inválidas'),
      );
      expect(prisma.platformSession.create).not.toHaveBeenCalled();
      expect(prisma.platformAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorKind: 'ANONYMOUS',
          result: 'FAILURE',
          action: 'LOGIN_FAILED',
        }),
      });
    });

    it('returns the same generic error for unknown or inactive admins', async () => {
      prisma.platformAdmin.findUnique.mockResolvedValue(null);
      await expect(service.login('nadie', PASSWORD)).rejects.toThrow(
        'Credenciales inválidas',
      );

      prisma.platformAdmin.findUnique.mockResolvedValue({
        ...admin,
        isActive: false,
      });
      await expect(service.login('exiadmin', PASSWORD)).rejects.toThrow(
        'Credenciales inválidas',
      );
    });
  });

  describe('verifyToken', () => {
    it('accepts a valid token whose session and admin are current', async () => {
      prisma.platformSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        platformAdmin: admin,
      });

      const identity = await service.verifyToken(
        await signPlatformToken('sess-1'),
      );

      expect(identity).toEqual({
        id: 'admin-1',
        username: 'exiadmin',
        name: 'exiadmin',
        sessionId: 'sess-1',
      });
    });

    it('rejects a tenant token signed with another secret', async () => {
      const tenantToken = await jwt.signAsync(
        { sub: 'user-1', tenantId: 'tenant-1' },
        { secret: TENANT_SECRET, expiresIn: '8h' },
      );

      await expect(service.verifyToken(tenantToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects revoked, expired, or version-mismatched sessions', async () => {
      const token = await signPlatformToken('sess-1');

      prisma.platformSession.findUnique.mockResolvedValueOnce({
        id: 'sess-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        platformAdmin: admin,
      });
      await expect(service.verifyToken(token)).rejects.toThrow(
        UnauthorizedException,
      );

      prisma.platformSession.findUnique.mockResolvedValueOnce({
        id: 'sess-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        platformAdmin: admin,
      });
      await expect(service.verifyToken(token)).rejects.toThrow(
        UnauthorizedException,
      );

      prisma.platformSession.findUnique.mockResolvedValueOnce({
        id: 'sess-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        platformAdmin: { ...admin, sessionVersion: 3 },
      });
      await expect(service.verifyToken(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a session whose admin was deactivated', async () => {
      prisma.platformSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        platformAdmin: { ...admin, isActive: false },
      });

      await expect(
        service.verifyToken(await signPlatformToken('sess-1')),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes only the given session and audits the logout', async () => {
      prisma.platformSession.updateMany.mockResolvedValue({ count: 1 });

      await service.logout({
        id: 'admin-1',
        username: 'exiadmin',
        name: 'exiadmin',
        sessionId: 'sess-1',
      });

      expect(prisma.platformSession.updateMany).toHaveBeenCalledWith({
        where: { id: 'sess-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.platformAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorKind: 'PLATFORM_ADMIN',
          platformAdminId: 'admin-1',
          action: 'LOGOUT',
        }),
      });
    });
  });
});
