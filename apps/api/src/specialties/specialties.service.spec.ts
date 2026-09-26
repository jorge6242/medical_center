import { SpecialtiesService } from './specialties.service';

import type { AuditLogService } from '../audit-log/audit-log.service';
import type { PrismaService } from '../database/prisma.service';

describe('SpecialtiesService', () => {
  it('returns a tenant-scoped paginated specialty list', async () => {
    const prisma = {
      specialty: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest
        .fn()
        .mockResolvedValue([
          1,
          [{ id: 'specialty-1', name: 'Medicina Ocupacional', isActive: true }],
        ]),
    } as unknown as PrismaService;
    const service = new SpecialtiesService(prisma);

    const result = await service.findAll('tenant-1', {
      page: 1,
      limit: 10,
      search: 'ocupacional',
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result).toEqual({
      data: [
        { id: 'specialty-1', name: 'Medicina Ocupacional', isActive: true },
      ],
      meta: expect.objectContaining({ total: 1, page: 1, limit: 10 }),
    });
  });

  it('audits specialty creation as CREATE', async () => {
    const prisma = {
      specialty: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'specialty-1',
          name: 'Medicina Ocupacional',
          isActive: true,
        }),
      },
    } as unknown as PrismaService;
    const auditLog = { log: jest.fn() } as unknown as AuditLogService;
    const service = new SpecialtiesService(prisma, auditLog);

    await service.create('tenant-1', { name: 'Medicina Ocupacional' });

    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        tenantId: 'tenant-1',
        entity: 'Specialty',
      }),
      prisma,
    );
  });

  it('rejects permanent deletion when the specialty has related doctors or consultations', async () => {
    const prisma = {
      specialty: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'specialty-1',
          name: 'Medicina Ocupacional',
          isActive: true,
        }),
      },
      doctor: { count: jest.fn().mockResolvedValue(2) },
      doctorService: { count: jest.fn().mockResolvedValue(0) },
      consultationService: { count: jest.fn().mockResolvedValue(3) },
    } as unknown as PrismaService;
    const service = new SpecialtiesService(prisma);

    await expect(
      service.permanentlyDelete('tenant-1', 'specialty-1'),
    ).rejects.toThrow(
      'No se puede eliminar Medicina Ocupacional: está asociada a 2 doctores y 3 consultas',
    );
  });
});
