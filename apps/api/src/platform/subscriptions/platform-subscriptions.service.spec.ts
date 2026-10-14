import { BadRequestException, ConflictException } from '@nestjs/common';

import { PlatformSubscriptionsService } from './platform-subscriptions.service';

import type { PlatformIdentity } from '../auth/platform-auth.service';

jest.mock('../../common/provisioning/roles.seeder', () => ({
  seedRoles: jest.fn(),
}));

const SECRET = 'platform_secret_minimo_32_caracteres_aaaa';
const ACTOR: PlatformIdentity = {
  id: 'admin-1',
  username: 'exiadmin',
  name: 'exiadmin',
  sessionId: 's1',
};
const CONTRACT = {
  id: 'sub-1',
  tenantId: 'tenant-1',
  status: 'ACTIVE',
  agreedPriceUsd: '25.00',
  gracePeriodDays: 3,
  version: 2,
  subscriptionPeriodId: 'period-2',
};

function buildModels() {
  return {
    $queryRaw: jest.fn(),
    tenant: { findUnique: jest.fn(), updateMany: jest.fn() },
    tenantSubscription: { findUnique: jest.fn(), updateMany: jest.fn() },
    subscriptionPlan: { findFirst: jest.fn() },
    subscriptionPeriod: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    subscriptionInvoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    subscriptionPayment: { findMany: jest.fn(), count: jest.fn() },
    platformIdempotencyKey: { findUnique: jest.fn(), create: jest.fn() },
    platformAuditLog: { create: jest.fn() },
  };
}

function build() {
  const tx = buildModels();
  const base = buildModels();
  const prisma = {
    ...base,
    $transaction: jest.fn(async (fn: (c: unknown) => unknown) => fn(tx)),
  };
  base.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', isActive: true });
  base.tenantSubscription.findUnique.mockResolvedValue(CONTRACT);
  base.subscriptionPlan.findFirst.mockResolvedValue({
    id: 'plan-1',
    code: 'BASIC',
    name: 'Básico',
    features: {},
    limits: {},
  });
  base.platformIdempotencyKey.findUnique.mockResolvedValue(null);
  base.subscriptionPeriod.findMany.mockResolvedValue([]);
  base.subscriptionInvoice.findMany.mockResolvedValue([]);
  base.subscriptionPayment.findMany.mockResolvedValue([]);
  base.subscriptionPeriod.count.mockResolvedValue(0);
  base.subscriptionInvoice.count.mockResolvedValue(0);
  base.subscriptionPayment.count.mockResolvedValue(0);
  base.subscriptionPeriod.findFirst.mockResolvedValue(null);
  tx.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', isActive: true });
  tx.tenantSubscription.findUnique.mockResolvedValue(CONTRACT);
  tx.subscriptionPlan.findFirst.mockResolvedValue({
    id: 'plan-1',
    code: 'BASIC',
    name: 'Básico',
    features: {},
    limits: {},
  });
  tx.subscriptionPeriod.findFirst.mockResolvedValue(null);
  tx.platformIdempotencyKey.findUnique.mockResolvedValue(null);
  tx.tenantSubscription.updateMany.mockResolvedValue({ count: 1 });
  tx.subscriptionPeriod.create.mockResolvedValue({ id: 'period-9' });
  tx.subscriptionInvoice.create.mockResolvedValue({
    id: 'inv-9',
    number: 'SUB-x',
    totalUsd: '25.00',
  });
  return {
    prisma,
    tx,
    base,
    service: new PlatformSubscriptionsService(prisma as never, SECRET),
  };
}

describe('PlatformSubscriptionsService', () => {
  it('snapshots price and contiguity from the locked transaction, not stale reads', async () => {
    const { service, tx, base } = build();
    tx.tenantSubscription.findUnique.mockResolvedValue({
      ...CONTRACT,
      agreedPriceUsd: '40.00',
    });
    await service.createPeriod(ACTOR, 'tenant-1', {
      planCode: 'BASIC',
      startsAt: '2026-11-01T04:00:00Z',
      dueAt: '2026-11-10T04:00:00Z',
      idempotencyKey: 'locked-period',
    });
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.tenantSubscription.findUnique.mock.invocationCallOrder[0]!,
    );
    expect(tx.subscriptionPeriod.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ priceUsdSnapshot: '40.00' }),
    });
    expect(base.subscriptionPeriod.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a contract canceled while waiting for the lock', async () => {
    const { service, tx } = build();
    tx.tenantSubscription.findUnique.mockResolvedValue({
      ...CONTRACT,
      status: 'CANCELED',
    });
    await expect(
      service.createPeriod(ACTOR, 'tenant-1', {
        planCode: 'BASIC',
        startsAt: '2026-11-01T04:00:00Z',
        dueAt: '2026-11-10T04:00:00Z',
        idempotencyKey: 'canceled-period',
      }),
    ).rejects.toThrow(ConflictException);
    expect(tx.subscriptionPeriod.create).not.toHaveBeenCalled();
  });

  it('validates version and audit old values after acquiring the same lock', async () => {
    const { service, tx } = build();
    tx.tenantSubscription.findUnique.mockResolvedValue({
      ...CONTRACT,
      version: 3,
    });
    await expect(
      service.updateContract(ACTOR, 'tenant-1', {
        agreedPriceUsd: '30',
        reason: 'Cambio',
        expectedVersion: 2,
      }),
    ).rejects.toThrow(ConflictException);
    expect(tx.tenantSubscription.updateMany).not.toHaveBeenCalled();
  });

  it('audits the current locked price rather than a stale pre-transaction snapshot', async () => {
    const { service, tx } = build();
    tx.tenantSubscription.findUnique.mockResolvedValue({
      ...CONTRACT,
      agreedPriceUsd: '28.00',
    });
    await service.updateContract(ACTOR, 'tenant-1', {
      agreedPriceUsd: '30',
      reason: 'Cambio',
      expectedVersion: 2,
    });
    expect(tx.platformAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ oldValues: { agreedPriceUsd: '28.00' } }),
    });
  });

  it('validates the current locked status before a state transition', async () => {
    const { service, tx } = build();
    tx.tenantSubscription.findUnique.mockResolvedValue({
      ...CONTRACT,
      status: 'CANCELED',
    });
    await expect(
      service.changeStatus(ACTOR, 'tenant-1', {
        status: 'ACTIVE',
        reason: 'Cambio',
        expectedVersion: 2,
      }),
    ).rejects.toThrow(ConflictException);
    expect(tx.tenantSubscription.updateMany).not.toHaveBeenCalled();
  });
  it('changes the contract with a version guard and never touches tenant.isActive', async () => {
    const { service, tx, base } = build();

    await service.updateContract(ACTOR, 'tenant-1', {
      agreedPriceUsd: '30',
      gracePeriodDays: 5,
      reason: 'Renegociación',
      expectedVersion: 2,
    });

    expect(tx.tenantSubscription.updateMany).toHaveBeenCalledWith({
      where: { id: 'sub-1', version: 2 },
      data: expect.objectContaining({
        agreedPriceUsd: '30.00',
        gracePeriodDays: 5,
        version: { increment: 1 },
      }),
    });
    expect(tx.tenant.updateMany).not.toHaveBeenCalled();
    expect(base.tenant.updateMany).not.toHaveBeenCalled();
    expect(tx.platformAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'UPDATE',
        entity: 'TenantSubscription',
        reason: 'Renegociación',
      }),
    });
  });

  it('returns payments with their invoice and status, never clinical data', async () => {
    const { service, base } = build();
    base.subscriptionPayment.findMany.mockResolvedValue([
      {
        id: 'pay-1',
        subscriptionInvoiceId: 'inv-1',
        status: 'CONFIRMED',
        amountUsd: '25.00',
      },
    ]);

    const detail = await service.getContract('tenant-1');

    expect(detail.payments).toEqual([
      {
        id: 'pay-1',
        subscriptionInvoiceId: 'inv-1',
        status: 'CONFIRMED',
        amountUsd: '25.00',
      },
    ]);
    expect(base.subscriptionPayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          subscriptionInvoice: {
            subscriptionPeriod: { subscriptionId: 'sub-1' },
          },
        },
        take: 20,
      }),
    );
  });

  it('paginates each history independently and returns scoped totals', async () => {
    const { service, base } = build();
    base.subscriptionPeriod.count.mockResolvedValue(61);
    base.subscriptionInvoice.count.mockResolvedValue(45);
    base.subscriptionPayment.count.mockResolvedValue(101);
    const detail = await service.getContract('tenant-1', {
      periodPage: 2,
      invoicePage: 3,
      paymentPage: 4,
      limit: 10,
    });
    expect(base.subscriptionPeriod.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { subscriptionId: 'sub-1' },
        skip: 10,
        take: 10,
        orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(base.subscriptionInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      }),
    );
    expect(base.subscriptionPayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 30,
        take: 10,
      }),
    );
    expect(base.subscriptionPayment.count).toHaveBeenCalledWith({
      where: {
        subscriptionInvoice: {
          subscriptionPeriod: { subscriptionId: 'sub-1' },
        },
      },
    });
    expect(detail.pagination).toEqual({
      periods: { page: 2, limit: 10, total: 61 },
      invoices: { page: 3, limit: 10, total: 45 },
      payments: { page: 4, limit: 10, total: 101 },
    });
  });

  it.each([
    { limit: 101 },
    { periodPage: 0 },
    { invoicePage: 1.5 },
    { paymentPage: -1 },
  ])(
    'rejects invalid pagination without querying histories: %j',
    async (query) => {
      const { service, base } = build();
      await expect(service.getContract('tenant-1', query)).rejects.toThrow(
        BadRequestException,
      );
      expect(base.subscriptionPeriod.findMany).not.toHaveBeenCalled();
    },
  );

  it('rejects a stale contract version without writing', async () => {
    const { service, tx } = build();

    await expect(
      service.updateContract(ACTOR, 'tenant-1', {
        agreedPriceUsd: '30',
        reason: 'x',
        expectedVersion: 1,
      }),
    ).rejects.toThrow(ConflictException);
    expect(tx.tenantSubscription.updateMany).not.toHaveBeenCalled();
  });

  it('changes status only through allowed transitions and leaves the tenant active flag alone', async () => {
    const { service, tx, base } = build();

    await service.changeStatus(ACTOR, 'tenant-1', {
      status: 'SUSPENDED',
      reason: 'Mora',
      expectedVersion: 2,
    });

    expect(tx.tenantSubscription.updateMany).toHaveBeenCalledWith({
      where: { id: 'sub-1', version: 2 },
      data: expect.objectContaining({
        status: 'SUSPENDED',
        version: { increment: 1 },
      }),
    });
    expect(base.tenant.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an invalid status transition without writing', async () => {
    const { service, tx } = build();

    await expect(
      service.changeStatus(ACTOR, 'tenant-1', {
        status: 'TRIALING',
        reason: 'x',
        expectedVersion: 2,
      }),
    ).rejects.toThrow(ConflictException);
    expect(tx.tenantSubscription.updateMany).not.toHaveBeenCalled();
  });

  it('creates a monthly period contiguous with the latest one, with snapshots and one invoice', async () => {
    const { service, tx } = build();
    tx.subscriptionPeriod.findFirst.mockResolvedValue({
      endsAt: new Date('2026-11-01T04:00:00.000Z'),
    });

    await service.createPeriod(ACTOR, 'tenant-1', {
      planCode: 'BASIC',
      startsAt: '2026-11-01T04:00:00.000Z',
      dueAt: '2026-11-10T12:00:00.000Z',
      idempotencyKey: 'periodo-nov-2026-001',
    });

    expect(tx.subscriptionPeriod.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        startsAt: new Date('2026-11-01T04:00:00.000Z'),
        endsAt: new Date('2026-12-01T04:00:00.000Z'),
        priceUsdSnapshot: '25.00',
        planCodeSnapshot: 'BASIC',
      }),
    });
    expect(tx.subscriptionInvoice.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a gap or overlap with the latest period', async () => {
    const { service, tx } = build();
    tx.subscriptionPeriod.findFirst.mockResolvedValue({
      endsAt: new Date('2026-11-01T04:00:00.000Z'),
    });

    await expect(
      service.createPeriod(ACTOR, 'tenant-1', {
        planCode: 'BASIC',
        startsAt: '2026-12-01T04:00:00.000Z',
        dueAt: '2026-12-10T12:00:00.000Z',
        idempotencyKey: 'periodo-dic-2026-001',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(tx.subscriptionPeriod.create).not.toHaveBeenCalled();
  });

  it('refuses to replay a key that was used for another tenant', async () => {
    const { service, tx } = build();
    const { requestFingerprint } = jest.requireActual(
      '../tenants/platform-tenant-provisioning',
    ) as {
      requestFingerprint: (b: object, s: string) => string;
    };
    tx.platformIdempotencyKey.findUnique.mockResolvedValue({
      fingerprint: requestFingerprint(
        {
          tenantId: 'tenant-OTRO',
          planCode: 'BASIC',
          startsAt: '2026-11-01T04:00:00.000Z',
          dueAt: '2026-11-10T12:00:00.000Z',
        },
        SECRET,
      ),
      resultRef: 'period-otro',
    });

    await expect(
      service.createPeriod(ACTOR, 'tenant-1', {
        planCode: 'BASIC',
        startsAt: '2026-11-01T04:00:00.000Z',
        dueAt: '2026-11-10T12:00:00.000Z',
        idempotencyKey: 'periodo-nov-2026-004',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects inactive or unknown plans for new periods', async () => {
    const { service, tx } = build();
    tx.subscriptionPlan.findFirst.mockResolvedValue(null);

    await expect(
      service.createPeriod(ACTOR, 'tenant-1', {
        planCode: 'VIEJO',
        startsAt: '2026-11-01T04:00:00.000Z',
        dueAt: '2026-11-10T12:00:00.000Z',
        idempotencyKey: 'periodo-nov-2026-002',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('replays a period request with the same key and payload without creating again', async () => {
    const { service, tx } = build();
    const { requestFingerprint } = jest.requireActual(
      '../tenants/platform-tenant-provisioning',
    ) as {
      requestFingerprint: (b: object, s: string) => string;
    };
    const body = {
      tenantId: 'tenant-1',
      planCode: 'BASIC',
      startsAt: '2026-11-01T04:00:00.000Z',
      dueAt: '2026-11-10T12:00:00.000Z',
    };
    tx.platformIdempotencyKey.findUnique.mockResolvedValue({
      fingerprint: requestFingerprint(body, SECRET),
      resultRef: 'period-9',
    });

    const input = {
      planCode: body.planCode,
      startsAt: body.startsAt,
      dueAt: body.dueAt,
    };
    const result = await service.createPeriod(ACTOR, 'tenant-1', {
      ...input,
      idempotencyKey: 'periodo-nov-2026-003',
    });

    expect(result.replayed).toBe(true);
    expect(tx.subscriptionPeriod.create).not.toHaveBeenCalled();
  });
});
