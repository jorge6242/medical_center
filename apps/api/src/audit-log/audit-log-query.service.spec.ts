import { AuditLogQueryService } from './audit-log-query.service';

describe('AuditLogQueryService', () => {
  it('always scopes the viewer query to the authenticated tenant', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new AuditLogQueryService(
      { auditLog: { findMany } } as never,
      { requireTenant: () => ({ tenantId: 'tenant-a' }) } as never,
    );

    await service.list({ limit: 25 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-a' }),
      }),
    );
  });

  it('returns a bounded cursor when an extra row exists', async () => {
    const rows = Array.from({ length: 3 }, (_, index) => ({
      id: `audit-${index}`,
    }));
    const service = new AuditLogQueryService(
      { auditLog: { findMany: jest.fn().mockResolvedValue(rows) } } as never,
      { requireTenant: () => ({ tenantId: 'tenant-a' }) } as never,
    );

    await expect(service.list({ limit: 2 })).resolves.toEqual({
      data: [rows[0], rows[1]],
      nextCursor: 'audit-1',
    });
  });
});
