import { BadRequestException } from '@nestjs/common';

import { PlatformAuditQueryService } from './platform-audit-query.service';

function buildPrisma() {
  return {
    platformAuditLog: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };
}

describe('PlatformAuditQueryService', () => {
  it('filters by tenant, entity, action and date range, newest first, paginated', async () => {
    const prisma = buildPrisma();
    prisma.platformAuditLog.count.mockResolvedValue(42);

    const result = await new PlatformAuditQueryService(prisma as never).list({
      page: 2,
      limit: 10,
      targetTenantId: 'tenant-1',
      entity: 'Tenant',
      action: 'UPDATE',
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-10-31T23:59:59.000Z',
    });

    const args = prisma.platformAuditLog.findMany.mock.calls[0]?.[0];
    expect(args).toMatchObject({
      skip: 10,
      take: 10,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      where: {
        targetTenantId: 'tenant-1',
        entity: 'Tenant',
        action: 'UPDATE',
        createdAt: {
          gte: new Date('2026-10-01T00:00:00.000Z'),
          lte: new Date('2026-10-31T23:59:59.000Z'),
        },
      },
    });
    expect(result).toEqual({ items: [], page: 2, limit: 10, total: 42 });
  });

  it('never selects credentials or session data', async () => {
    const prisma = buildPrisma();

    await new PlatformAuditQueryService(prisma as never).list({
      page: 1,
      limit: 20,
    });

    const select = prisma.platformAuditLog.findMany.mock.calls[0]?.[0]
      ?.select as Record<string, boolean>;
    for (const forbidden of ['passwordHash', 'token', 'cookie']) {
      expect(
        Object.keys(select).some((key) =>
          key.toLowerCase().includes(forbidden.toLowerCase()),
        ),
      ).toBe(false);
    }
  });

  it('rejects an inverted date range', async () => {
    const prisma = buildPrisma();

    await expect(
      new PlatformAuditQueryService(prisma as never).list({
        page: 1,
        limit: 20,
        from: '2026-10-31T00:00:00.000Z',
        to: '2026-10-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.platformAuditLog.findMany).not.toHaveBeenCalled();
  });
});
