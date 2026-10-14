import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PlatformTenantsService } from './platform-tenants.service';

import type { PlatformIdentity } from '../auth/platform-auth.service';

const ADMIN: PlatformIdentity = {
  id: 'admin-1',
  username: 'exiadmin',
  name: 'exiadmin',
  sessionId: 'sess-1',
};

const TENANT = {
  id: 'tenant-1',
  name: 'Centro Norte',
  slug: 'centro-norte',
  webSlug: 'norte',
  email: 'contacto@norte.com',
  isActive: true,
  version: 3,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
};

function buildPrismaMock() {
  const prisma = {
    tenant: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    platformAuditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn(prisma),
  );
  return prisma;
}

describe('PlatformTenantsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: PlatformTenantsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new PlatformTenantsService(prisma as never);
  });

  describe('list', () => {
    it('paginates with stable ordering and applies name, slug and status filters', async () => {
      prisma.tenant.findMany.mockResolvedValue([TENANT]);
      prisma.tenant.count.mockResolvedValue(1);

      const result = await service.list({
        page: 2,
        limit: 10,
        name: 'norte',
        slug: 'centro',
        isActive: false,
      });

      expect(prisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          where: {
            name: { contains: 'norte', mode: 'insensitive' },
            slug: { contains: 'centro', mode: 'insensitive' },
            isActive: false,
          },
        }),
      );
      expect(result).toEqual({
        items: [TENANT],
        page: 2,
        limit: 10,
        total: 1,
      });
    });

    it('selects only operational fields, never clinical data', async () => {
      prisma.tenant.findMany.mockResolvedValue([]);
      prisma.tenant.count.mockResolvedValue(0);

      await service.list({ page: 1, limit: 20 });

      const select = prisma.tenant.findMany.mock.calls[0]?.[0]
        ?.select as Record<string, boolean>;
      expect(Object.keys(select).sort()).toEqual(
        [
          'id',
          'name',
          'slug',
          'webSlug',
          'email',
          'isActive',
          'version',
          'createdAt',
          'updatedAt',
        ].sort(),
      );
    });
  });

  describe('findOne', () => {
    it('throws not found for unknown tenants', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects a stale expectedVersion without writing anything', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TENANT);

      await expect(
        service.update(ADMIN, 'tenant-1', {
          name: 'Nuevo',
          expectedVersion: 2,
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.tenant.updateMany).not.toHaveBeenCalled();
      expect(prisma.platformAuditLog.create).not.toHaveBeenCalled();
    });

    it('rejects reserved webSlugs before touching the database', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TENANT);

      await expect(
        service.update(ADMIN, 'tenant-1', {
          webSlug: 'admin',
          expectedVersion: 3,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.tenant.updateMany).not.toHaveBeenCalled();
    });

    it('updates with a version guard, increments version and audits old and new values', async () => {
      prisma.tenant.findUnique
        .mockResolvedValueOnce(TENANT)
        .mockResolvedValueOnce({ ...TENANT, name: 'Centro Nuevo', version: 4 });
      prisma.tenant.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.update(ADMIN, 'tenant-1', {
        name: 'Centro Nuevo',
        expectedVersion: 3,
      });

      expect(prisma.tenant.updateMany).toHaveBeenCalledWith({
        where: { id: 'tenant-1', version: 3 },
        data: { name: 'Centro Nuevo', version: { increment: 1 } },
      });
      expect(result).toMatchObject({ name: 'Centro Nuevo', version: 4 });
      expect(prisma.platformAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorKind: 'PLATFORM_ADMIN',
          platformAdminId: 'admin-1',
          targetTenantId: 'tenant-1',
          entity: 'Tenant',
          entityId: 'tenant-1',
          action: 'UPDATE',
          changedFields: ['name'],
          oldValues: { name: 'Centro Norte' },
          newValues: { name: 'Centro Nuevo' },
        }),
      });
    });

    it('reports a concurrent edit that lost the version race as conflict', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TENANT);
      prisma.tenant.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.update(ADMIN, 'tenant-1', { name: 'X', expectedVersion: 3 }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.platformAuditLog.create).not.toHaveBeenCalled();
    });

    it('maps a duplicate webSlug (Prisma P2002) to conflict', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TENANT);
      prisma.tenant.updateMany.mockRejectedValue(
        Object.assign(new Error('unique'), { code: 'P2002' }),
      );

      await expect(
        service.update(ADMIN, 'tenant-1', {
          webSlug: 'ocupado',
          expectedVersion: 3,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('setActivation', () => {
    it('requires a non-empty reason', async () => {
      await expect(
        service.setActivation(ADMIN, 'tenant-1', {
          isActive: false,
          reason: '   ',
          expectedVersion: 3,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
    });

    it('deactivates with a reason, keeps the data and audits the change', async () => {
      prisma.tenant.findUnique
        .mockResolvedValueOnce(TENANT)
        .mockResolvedValueOnce({ ...TENANT, isActive: false, version: 4 });
      prisma.tenant.updateMany.mockResolvedValue({ count: 1 });

      await service.setActivation(ADMIN, 'tenant-1', {
        isActive: false,
        reason: 'Falta de pago acordada',
        expectedVersion: 3,
      });

      expect(prisma.tenant.updateMany).toHaveBeenCalledWith({
        where: { id: 'tenant-1', version: 3 },
        data: { isActive: false, version: { increment: 1 } },
      });
      expect(prisma.platformAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'DEACTIVATE',
          reason: 'Falta de pago acordada',
          changedFields: ['isActive'],
          oldValues: { isActive: true },
          newValues: { isActive: false },
        }),
      });
    });

    it('rejects a no-op activation so every state change is deliberate', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TENANT);

      await expect(
        service.setActivation(ADMIN, 'tenant-1', {
          isActive: true,
          reason: 'revisión',
          expectedVersion: 3,
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.tenant.updateMany).not.toHaveBeenCalled();
    });
  });
});
