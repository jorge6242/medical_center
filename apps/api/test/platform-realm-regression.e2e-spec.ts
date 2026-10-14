import {
  Controller,
  Get,
  UnauthorizedException,
  type INestApplication,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { RequestContextService } from '../src/common/context';
import { PrismaService } from '../src/database/prisma.service';
import {
  PLATFORM_ALLOWED_ORIGINS,
  PLATFORM_JWT_SECRET,
} from '../src/platform/auth/platform-auth.constants';
import { PlatformAuthController } from '../src/platform/auth/platform-auth.controller';
import { PlatformAuthGuard } from '../src/platform/auth/platform-auth.guard';
import { PlatformAuthService } from '../src/platform/auth/platform-auth.service';
import { csrfTokenFor } from '../src/platform/auth/platform-csrf';
import { PlatformCsrfGuard } from '../src/platform/auth/platform-csrf.guard';

const TENANT_SECRET = 'tenant_regression_secret_32_characters';
const PLATFORM_SECRET = 'platform_regression_secret_32_characters';
const ORIGIN = 'http://localhost:3000';
const actor = {
  id: 'platform-test',
  username: 'test',
  name: 'Test',
  sessionId: 'session-test',
};

@Controller('tenant-regression')
class TenantProbeController {
  @Get()
  read() {
    return { realm: 'tenant' };
  }
}

// Only database/auth-service boundaries are mocked. Real HTTP cookie parsing,
// JwtAuthGuard dispatch, tenant JWT strategy, platform cookie guard and CSRF run.
describe('Platform and tenant realms (isolated HTTP regression)', () => {
  let app: INestApplication;
  let tenantToken: string;
  const verifyToken = jest.fn(async (token: string) => {
    if (token !== 'valid-platform-session') throw new UnauthorizedException();
    return actor;
  });
  const logout = jest.fn(async () => undefined);
  const findFirst = jest.fn(async () => ({ id: 'tenant-user' }));

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [PlatformAuthController, TenantProbeController],
      providers: [
        JwtAuthGuard,
        JwtStrategy,
        PlatformAuthGuard,
        PlatformCsrfGuard,
        { provide: PLATFORM_ALLOWED_ORIGINS, useValue: [ORIGIN] },
        { provide: PLATFORM_JWT_SECRET, useValue: PLATFORM_SECRET },
        {
          provide: ConfigService,
          useValue: new ConfigService({ JWT_SECRET: TENANT_SECRET }),
        },
        { provide: PrismaService, useValue: { user: { findFirst } } },
        { provide: RequestContextService, useValue: { enterWith: jest.fn() } },
        {
          provide: PlatformAuthService,
          useValue: {
            verifyToken,
            logout,
            csrfTokenFor: () => csrfTokenFor(actor.sessionId, PLATFORM_SECRET),
            login: jest.fn(async () => ({
              token: 'valid-platform-session',
              admin: actor,
              csrfToken: csrfTokenFor(actor.sessionId, PLATFORM_SECRET),
            })),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalGuards(module.get(JwtAuthGuard));
    await app.init();
    tenantToken = new JwtService({ secret: TENANT_SECRET }).sign({
      sub: 'tenant-user',
      email: 'test@example.invalid',
      tenantId: 'tenant-test',
      role: 'admin',
      roleVersion: 1,
    });
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app?.close());

  it('rejects each realm cookie at the opposite realm', async () => {
    await request(app.getHttpServer())
      .get('/platform/auth/me')
      .set('Cookie', `access_token=${tenantToken}`)
      .expect(401);
    await request(app.getHttpServer())
      .get('/tenant-regression')
      .set('Cookie', 'platform_access_token=valid-platform-session')
      .expect(401);
    expect(findFirst).not.toHaveBeenCalled();
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('accepts both cookies independently on localhost without mixing identities', async () => {
    const cookies = `access_token=${tenantToken}; platform_access_token=valid-platform-session`;
    await request(app.getHttpServer())
      .get('/tenant-regression')
      .set('Cookie', cookies)
      .expect(200);
    const result = await request(app.getHttpServer())
      .get('/platform/auth/me')
      .set('Cookie', cookies)
      .expect(200);
    expect(result.body.id).toBe(actor.id);
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(verifyToken).toHaveBeenCalledWith('valid-platform-session');
  });

  it('rejects forged session CSRF and allows logout without clearing tenant cookie', async () => {
    const cookies = `access_token=${tenantToken}; platform_access_token=valid-platform-session`;
    await request(app.getHttpServer())
      .post('/platform/auth/logout')
      .set('Cookie', cookies)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', 'forged')
      .expect(403);
    expect(logout).not.toHaveBeenCalled();
    const result = await request(app.getHttpServer())
      .post('/platform/auth/logout')
      .set('Cookie', cookies)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', csrfTokenFor(actor.sessionId, PLATFORM_SECRET))
      .expect(200);
    const clearedCookies = result.headers['set-cookie'] as unknown as string[];
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]).toMatch(/^platform_access_token=/);
    expect(logout).toHaveBeenCalledWith(actor);
    await request(app.getHttpServer())
      .get('/tenant-regression')
      .set('Cookie', `access_token=${tenantToken}`)
      .expect(200);
  });

  it('protects public platform login with origin/header and sets only platform cookie', async () => {
    await request(app.getHttpServer())
      .post('/platform/auth/login')
      .send({ username: 'test', password: 'test-password' })
      .expect(403);
    const result = await request(app.getHttpServer())
      .post('/platform/auth/login')
      .set('Origin', ORIGIN)
      .set('x-platform-request', '1')
      .send({ username: 'test', password: 'test-password' })
      .expect(200);
    const cookies = result.headers['set-cookie'] as unknown as string[];
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatch(/^platform_access_token=/);
    expect(cookies[0]).toContain('HttpOnly');
    expect(cookies[0]).toContain('SameSite=Lax');
    expect(cookies[0]).not.toContain('Domain=');
  });
});
