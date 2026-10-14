import { BadRequestException, ConflictException } from '@nestjs/common';

import { PlatformTenantProvisioningService } from './platform-tenant-provisioning.service';

import type { TenantCreateInput } from './platform-tenant-provisioning.service';
import type { PlatformIdentity } from '../auth/platform-auth.service';

jest.mock('../../common/provisioning/roles.seeder', () => ({
  seedRoles: jest.fn(),
}));
jest.mock('../../common/provisioning/reminder-config.seeder', () => ({
  seedReminderConfig: jest.fn(),
}));
jest.mock('../../common/provisioning/system-config.seeder', () => ({
  seedSystemConfig: jest.fn(),
}));

const SECRET = 'platform_secret_minimo_32_caracteres_aaaa';
const KEY = 'alta-centro-norte-0001';
const PASSWORD = 'Clave-Inicial-2026';

const ACTOR: PlatformIdentity = {
  id: 'admin-1',
  username: 'exiadmin',
  name: 'exiadmin',
  sessionId: 'sess-1',
};

const INPUT: TenantCreateInput = {
  name: 'Centro Norte',
  slug: 'centro-norte',
  webSlug: 'norte',
  email: 'contacto@norte.com',
  initialAdmin: { name: 'Ana', email: 'Ana@Norte.com', password: PASSWORD },
  initialSubscription: {
    planCode: 'BASIC',
    agreedPriceUsd: '25',
    startsAt: '2026-10-15T12:00:00.000Z',
    dueAt: '2026-10-25T12:00:00.000Z',
    gracePeriodDays: 3,
  },
};

const PLAN = {
  id: 'plan-1',
  code: 'BASIC',
  name: 'Básico',
  isActive: true,
  features: {},
  limits: {},
};

type Models = ReturnType<typeof buildModels>;

function buildModels() {
  return {
    subscriptionPlan: { findFirst: jest.fn() },
    platformIdempotencyKey: { findUnique: jest.fn(), create: jest.fn() },
    tenant: { create: jest.fn(), findUnique: jest.fn() },
    role: { findFirstOrThrow: jest.fn() },
    user: { create: jest.fn() },
    tenantSubscription: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    subscriptionPeriod: { create: jest.fn() },
    subscriptionInvoice: { create: jest.fn(), findFirst: jest.fn() },
    platformAuditLog: { create: jest.fn() },
  };
}

// Las escrituras sólo son válidas dentro de la transacción (tx). Si el servicio
// escribe con el cliente base, el test falla.
function buildPrismaMock() {
  const tx = buildModels();
  const base = buildModels();
  const writeModels: [keyof Models, string[]][] = [
    ['tenant', ['create']],
    ['role', []],
    ['user', ['create']],
    ['tenantSubscription', ['create', 'update']],
    ['subscriptionPeriod', ['create']],
    ['subscriptionInvoice', ['create']],
    ['platformAuditLog', ['create']],
  ];
  for (const [model, methods] of writeModels) {
    for (const method of methods) {
      (base[model] as Record<string, jest.Mock>)[method]?.mockRejectedValue(
        new Error('write outside transaction'),
      );
    }
  }
  base.platformIdempotencyKey.create.mockRejectedValue(
    new Error('write outside transaction'),
  );
  base.tenantSubscription.findUnique = jest.fn().mockResolvedValue({
    id: 'sub-1',
    status: 'ACTIVE',
    agreedPriceUsd: { toString: () => '25.00' },
    subscriptionPeriodId: 'period-1',
  });
  base.subscriptionInvoice.findFirst = jest.fn().mockResolvedValue({
    id: 'inv-1',
    number: 'SUB-x',
    totalUsd: { toString: () => '25.00' },
    dueAt: new Date('2026-10-25T12:00:00.000Z'),
  });
  const prisma = {
    ...base,
    $transaction: jest.fn(async (fn: (client: unknown) => unknown) => fn(tx)),
  };
  base.subscriptionPlan.findFirst.mockResolvedValue(PLAN);
  base.platformIdempotencyKey.findUnique.mockResolvedValue(null);
  tx.tenant.create.mockResolvedValue({ id: 'tenant-1' });
  tx.tenant.findUnique.mockResolvedValue({
    id: 'tenant-1',
    name: 'Centro Norte',
  });
  tx.role.findFirstOrThrow.mockResolvedValue({ id: 'role-admin' });
  tx.user.create.mockResolvedValue({ id: 'user-1' });
  tx.tenantSubscription.create.mockResolvedValue({
    id: 'sub-1',
    status: 'ACTIVE',
    agreedPriceUsd: '25.00',
  });
  tx.subscriptionPeriod.create.mockResolvedValue({ id: 'period-1' });
  tx.subscriptionInvoice.create.mockResolvedValue({
    id: 'inv-1',
    number: 'SUB-x',
    totalUsd: '25.00',
    dueAt: new Date('2026-10-25T12:00:00.000Z'),
  });
  return { prisma, tx, base };
}

describe('PlatformTenantProvisioningService', () => {
  let built: ReturnType<typeof buildPrismaMock>;
  let prisma: ReturnType<typeof buildPrismaMock>['prisma'];
  let tx: Models;
  let service: PlatformTenantProvisioningService;

  beforeEach(() => {
    built = buildPrismaMock();
    prisma = built.prisma;
    tx = built.tx;
    service = new PlatformTenantProvisioningService(prisma as never, SECRET);
  });

  it('creates tenant, admin, subscription, period and invoice in one audited transaction', async () => {
    tx.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      name: 'Centro Norte',
    });

    const result = await service.create(ACTOR, KEY, INPUT);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.tenant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: 'centro-norte', webSlug: 'norte' }),
    });
    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        email: 'ana@norte.com',
        roleId: 'role-admin',
      }),
    });
    expect(tx.subscriptionPeriod.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        priceUsdSnapshot: '25.00',
        planCodeSnapshot: 'BASIC',
      }),
    });
    expect(tx.subscriptionInvoice.create).toHaveBeenCalled();
    expect(tx.platformIdempotencyKey.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        scope: 'platform.tenants.create',
        key: KEY,
        resultRef: 'tenant-1',
      }),
    });
    expect(result.tenant).toMatchObject({ id: 'tenant-1' });
    expect(JSON.stringify(result)).not.toContain(PASSWORD);
  });

  it('never stores the admin password in audit records', async () => {
    tx.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });

    await service.create(ACTOR, KEY, INPUT);

    for (const [call] of tx.platformAuditLog.create.mock.calls as [
      { data: unknown },
    ][]) {
      expect(JSON.stringify(call.data)).not.toContain(PASSWORD);
    }
  });

  it('rejects an unknown or inactive plan before creating anything', async () => {
    prisma.subscriptionPlan.findFirst.mockResolvedValue(null);

    await expect(service.create(ACTOR, KEY, INPUT)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a due date before the start of the contract', async () => {
    await expect(
      service.create(ACTOR, KEY, {
        ...INPUT,
        initialSubscription: {
          ...INPUT.initialSubscription,
          dueAt: '2026-10-01T00:00:00.000Z',
        },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires an Idempotency-Key of 8 to 128 characters', async () => {
    await expect(service.create(ACTOR, 'corta', INPUT)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('replays the same key and payload without creating a second tenant', async () => {
    const { requestFingerprint } = jest.requireActual(
      './platform-tenant-provisioning',
    ) as {
      requestFingerprint: (body: object, secret: string) => string;
    };
    prisma.platformIdempotencyKey.findUnique.mockResolvedValue({
      fingerprint: requestFingerprint(INPUT, SECRET),
      resultRef: 'tenant-1',
    });
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      name: 'Centro Norte',
    });

    const result = await service.create(ACTOR, KEY, INPUT);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(result.replayed).toBe(true);
    expect(result.tenant).toMatchObject({ id: 'tenant-1' });
  });

  it('rejects the same key with a different payload', async () => {
    prisma.platformIdempotencyKey.findUnique.mockResolvedValue({
      fingerprint: 'otra-huella',
      resultRef: 'tenant-1',
    });

    await expect(service.create(ACTOR, KEY, INPUT)).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('maps a duplicate slug or webSlug to conflict and leaves no partial tenant', async () => {
    tx.tenant.create.mockRejectedValue(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    );

    await expect(service.create(ACTOR, KEY, INPUT)).rejects.toThrow(
      ConflictException,
    );
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.platformAuditLog.create).not.toHaveBeenCalled();
  });

  it('propagates a failure in the subscription step so the whole transaction rolls back', async () => {
    tx.subscriptionPeriod.create.mockRejectedValue(new Error('db down'));

    await expect(service.create(ACTOR, KEY, INPUT)).rejects.toThrow('db down');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.platformIdempotencyKey.create).not.toHaveBeenCalled();
  });
});
