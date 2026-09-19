import { executeWithAudit } from './prisma-audit.extension';

import type { AuditLogService } from '../audit-log/audit-log.service';
import type { RequestContextService } from '../common/context';
import type { PrismaClient } from '@prisma/client';

describe('executeWithAudit', () => {
  const buildPrisma = (oldValues?: Record<string, unknown>): PrismaClient =>
    ({
      patient: {
        findUnique: jest.fn().mockResolvedValue(oldValues ?? null),
      },
    }) as unknown as PrismaClient;

  const buildRequestContext = (
    context?: { userId: string; tenantId: string },
  ): jest.Mocked<Pick<RequestContextService, 'getStore'>> => ({
    getStore: jest.fn().mockReturnValue(context),
  });

  const buildAuditLog = (): jest.Mocked<Pick<AuditLogService, 'log'>> => ({
    log: jest.fn().mockResolvedValue(undefined),
  });

  it('passes through non-audited models without logging', async () => {
    const auditLog = buildAuditLog();
    const query = jest.fn().mockResolvedValue({ id: 'receipt-1' });

    await executeWithAudit({
      prisma: buildPrisma(),
      requestContext: buildRequestContext({
        userId: 'user-1',
        tenantId: 'tenant-1',
      }) as unknown as RequestContextService,
      auditLogService: auditLog as unknown as AuditLogService,
      model: 'DoctorReceipt',
      operation: 'update',
      args: { where: { id: 'receipt-1' }, data: { status: 'VOIDED' } },
      query,
    });

    expect(query).toHaveBeenCalledWith({
      where: { id: 'receipt-1' },
      data: { status: 'VOIDED' },
    });
    expect(auditLog.log).not.toHaveBeenCalled();
  });

  it('skips logging when request context is absent', async () => {
    const auditLog = buildAuditLog();

    await executeWithAudit({
      prisma: buildPrisma({ id: 'patient-1', name: 'Ana' }),
      requestContext: buildRequestContext() as unknown as RequestContextService,
      auditLogService: auditLog as unknown as AuditLogService,
      model: 'Patient',
      operation: 'update',
      args: { where: { id: 'patient-1' }, data: { name: 'Ana María' } },
      query: jest.fn().mockResolvedValue({ id: 'patient-1', name: 'Ana María' }),
    });

    expect(auditLog.log).not.toHaveBeenCalled();
  });

  it('logs audited update with changed fields and request context', async () => {
    const auditLog = buildAuditLog();

    await executeWithAudit({
      prisma: buildPrisma({ id: 'patient-1', name: 'Ana', phone: '04140000000' }),
      requestContext: buildRequestContext({
        userId: 'user-1',
        tenantId: 'tenant-1',
      }) as unknown as RequestContextService,
      auditLogService: auditLog as unknown as AuditLogService,
      model: 'Patient',
      operation: 'update',
      args: {
        where: { id: 'patient-1' },
        data: { name: 'Ana María', phone: '04140000000' },
      },
      query: jest.fn().mockResolvedValue({ id: 'patient-1', name: 'Ana María' }),
    });

    expect(auditLog.log).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      userId: 'user-1',
      action: 'UPDATE',
      entity: 'Patient',
      entityId: 'patient-1',
      oldValues: { id: 'patient-1', name: 'Ana', phone: '04140000000' },
      newValues: { name: 'Ana María', phone: '04140000000' },
      changedFields: ['name'],
    });
  });

  it('logs Service mutations with the acting request tenant', async () => {
    const auditLog = buildAuditLog();

    await executeWithAudit({
      prisma: buildPrisma(),
      requestContext: buildRequestContext({
        userId: 'user-1',
        tenantId: 'tenant-1',
      }) as unknown as RequestContextService,
      auditLogService: auditLog as unknown as AuditLogService,
      model: 'Service',
      operation: 'create',
      args: { data: { name: 'Consulta' } },
      query: jest.fn().mockResolvedValue({ id: 'service-1', name: 'Consulta' }),
    });

    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        userId: 'user-1',
        entity: 'Service',
        entityId: 'service-1',
      }),
    );
  });
});
