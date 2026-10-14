import {
  NotFoundException,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { PrismaService } from '../src/database/prisma.service';
import { PlatformAuditQueryService } from '../src/platform/audit/platform-audit-query.service';
import { PlatformAuditController } from '../src/platform/audit/platform-audit.controller';
import {
  PLATFORM_ALLOWED_ORIGINS,
  PLATFORM_JWT_SECRET,
} from '../src/platform/auth/platform-auth.constants';
import { csrfTokenFor } from '../src/platform/auth/platform-csrf';
import { PlatformCsrfGuard } from '../src/platform/auth/platform-csrf.guard';
import { PlatformSubscriptionPaymentsService } from '../src/platform/subscriptions/platform-subscription-payments.service';
import { PlatformSubscriptionsController } from '../src/platform/subscriptions/platform-subscriptions.controller';
import { PlatformSubscriptionsService } from '../src/platform/subscriptions/platform-subscriptions.service';
import { PlatformTenantProvisioningService } from '../src/platform/tenants/platform-tenant-provisioning.service';
import { PlatformTenantsController } from '../src/platform/tenants/platform-tenants.controller';
import { PlatformTenantsService } from '../src/platform/tenants/platform-tenants.service';

const TENANT_ID = 'tenant-demo-001';
const ORIGIN = 'http://localhost:3000';
const SECRET = 'platform_identifier_test_secret';
const actor = {
  id: 'admin',
  username: 'admin',
  name: 'Admin',
  sessionId: 'session',
};
const invoiceId = 'b126ca68-54e6-4b34-9fa0-ea457e41ca93';
const lookup = jest.fn(async (id: string) => {
  if (id !== TENANT_ID) throw new NotFoundException();
  return { id };
});
const update = jest.fn(async (_actor: unknown, id: string) => lookup(id));
const audit = jest.fn(async () => ({ items: [] }));

// Real controllers, parameter pipes, global DTO validation and CSRF. Service
// boundaries are mocked: this verifies HTTP identifier compatibility, not DB writes.
describe('Platform historical tenant identifiers (HTTP)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        PlatformTenantsController,
        PlatformSubscriptionsController,
        PlatformAuditController,
      ],
      providers: [
        PlatformCsrfGuard,
        { provide: PLATFORM_ALLOWED_ORIGINS, useValue: [ORIGIN] },
        { provide: PLATFORM_JWT_SECRET, useValue: SECRET },
        {
          provide: PlatformTenantsService,
          useValue: { findOne: lookup, update, setActivation: update },
        },
        { provide: PlatformTenantProvisioningService, useValue: {} },
        {
          provide: PlatformSubscriptionsService,
          useValue: {
            getContract: lookup,
            updateContract: update,
            changeStatus: update,
            createPeriod: update,
          },
        },
        {
          provide: PlatformSubscriptionPaymentsService,
          useValue: { registerPayment: update, voidPayment: update },
        },
        { provide: PlatformAuditQueryService, useValue: { list: audit } },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalGuards({
      canActivate: (context) => {
        context
          .switchToHttp()
          .getRequest<{ platformAdmin: typeof actor }>().platformAdmin = actor;
        return true;
      },
    });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => app?.close());
  beforeEach(() => jest.clearAllMocks());

  it('reads seeded tenant detail and subscription, and delegates unknown IDs to service 404', async () => {
    for (const suffix of ['', '/subscription']) {
      await request(app.getHttpServer())
        .get(`/platform/tenants/${TENANT_ID}${suffix}`)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/platform/tenants/unknown-tenant${suffix}`)
        .expect(404);
    }
    expect(lookup).toHaveBeenCalledWith(TENANT_ID, expect.anything());
  });

  it.each([
    ['patch', '', { name: 'Demo', expectedVersion: 1 }],
    [
      'post',
      '/activation',
      { isActive: false, reason: 'test', expectedVersion: 1 },
    ],
    [
      'patch',
      '/subscription',
      { agreedPriceUsd: '20', reason: 'test', expectedVersion: 1 },
    ],
    [
      'post',
      '/subscription/status',
      { status: 'ACTIVE', reason: 'test', expectedVersion: 1 },
    ],
    [
      'post',
      '/subscription/periods',
      { planCode: 'basic', startsAt: '2026-01-01', dueAt: '2026-01-01' },
    ],
    [
      'post',
      `/subscription/invoices/${invoiceId}/payments`,
      {
        currency: 'USD',
        amountPaid: '20',
        method: 'CASH',
        paidAt: '2026-01-01',
      },
    ],
    ['post', `/subscription/payments/${invoiceId}/void`, { reason: 'test' }],
  ] as const)(
    'accepts historical ID for %s %s',
    async (method, suffix, body) => {
      await request(app.getHttpServer())
        [method](`/platform/tenants/${TENANT_ID}${suffix}`)
        .set('Origin', ORIGIN)
        .set('x-csrf-token', csrfTokenFor(actor.sessionId, SECRET))
        .set('idempotency-key', 'identifier-test-key')
        .send(body)
        .expect(method === 'post' ? 201 : 200);
      expect(update.mock.calls[0]?.[1]).toBe(TENANT_ID);
    },
  );

  it('accepts historical audit filter', async () => {
    await request(app.getHttpServer())
      .get('/platform/audit')
      .query({ targetTenantId: TENANT_ID })
      .expect(200);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ targetTenantId: TENANT_ID }),
    );
  });

  it.each(['bad id', 'x'.repeat(129)])(
    'rejects malformed or unbounded IDs before service lookup',
    async (id) => {
      await request(app.getHttpServer())
        .get(`/platform/tenants/${encodeURIComponent(id)}`)
        .expect(400);
      await request(app.getHttpServer())
        .get('/platform/audit')
        .query({ targetTenantId: id })
        .expect(400);
      expect(lookup).not.toHaveBeenCalled();
      expect(audit).not.toHaveBeenCalled();
    },
  );

  it('keeps payment UUID validation strict', async () => {
    await request(app.getHttpServer())
      .post(
        `/platform/tenants/${TENANT_ID}/subscription/payments/not-a-uuid/void`,
      )
      .set('Origin', ORIGIN)
      .set('x-csrf-token', csrfTokenFor(actor.sessionId, SECRET))
      .set('idempotency-key', 'identifier-test-key')
      .send({ reason: 'test' })
      .expect(400);
    expect(update).not.toHaveBeenCalled();
  });
});
