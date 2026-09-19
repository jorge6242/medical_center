
import { LabOrderStatus, Prisma } from '@prisma/client';

import { LabOrdersService } from './lab-orders.service';

import type { PrismaService } from "../database/prisma.service";
import type { LabOrderQueryDto } from './dto/lab-order-query.dto';

describe('LabOrdersService', () => {
  const prisma = {
    labOrder: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
    },
    patient: {
      findFirst: jest.fn(),
    },
    labTestCatalog: {
      findMany: jest.fn(),
    },
    labOrderTest: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const service = new LabOrdersService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('paginates without filters', async () => {
    const query: LabOrderQueryDto = { page: 1, limit: 10 } as LabOrderQueryDto;
    const orders = [
      {
        id: 'order-1',
        patient: { name: 'Ana Perez' },
        totalUsd: new Prisma.Decimal('45.00'),
        status: LabOrderStatus.PENDING,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ];

    (prisma.$transaction as jest.Mock).mockResolvedValue([1, orders]);

    const result = await service.findAll('tenant-1', query);

    expect(prisma.labOrder.count).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' } });
    expect(prisma.labOrder.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      skip: 0,
      take: 10,
      select: {
        id: true,
        totalUsd: true,
        status: true,
        createdAt: true,
        patient: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(result.data[0]).toEqual({
      id: 'order-1',
      patientName: 'Ana Perez',
      totalUsd: '45',
      status: LabOrderStatus.PENDING,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('builds search and status filters', async () => {
    const query: LabOrderQueryDto = {
      page: 2,
      limit: 5,
      search: 'hemograma',
      status: LabOrderStatus.PAID,
    } as LabOrderQueryDto;

    (prisma.$transaction as jest.Mock).mockResolvedValue([0, []]);

    await service.findAll('tenant-1', query);

    expect(prisma.labOrder.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        status: LabOrderStatus.PAID,
        OR: [
          { id: { contains: 'hemograma', mode: 'insensitive' } },
          { patient: { name: { contains: 'hemograma', mode: 'insensitive' } } },
          { patient: { documentId: { contains: 'hemograma', mode: 'insensitive' } } },
          { tests: { some: { testName: { contains: 'hemograma', mode: 'insensitive' } } } },
        ],
      },
    });
  });

  it('filters by status only', async () => {
    const query: LabOrderQueryDto = {
      page: 1,
      limit: 10,
      status: LabOrderStatus.VOIDED,
    } as LabOrderQueryDto;

    (prisma.$transaction as jest.Mock).mockResolvedValue([0, []]);

    await service.findAll('tenant-1', query);

    expect(prisma.labOrder.count).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', status: LabOrderStatus.VOIDED },
    });
  });

  it('searches without status filter', async () => {
    const query: LabOrderQueryDto = {
      page: 1,
      limit: 10,
      search: 'V123',
    } as LabOrderQueryDto;

    (prisma.$transaction as jest.Mock).mockResolvedValue([0, []]);

    await service.findAll('tenant-1', query);

    expect(prisma.labOrder.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        OR: [
          { id: { contains: 'V123', mode: 'insensitive' } },
          { patient: { name: { contains: 'V123', mode: 'insensitive' } } },
          { patient: { documentId: { contains: 'V123', mode: 'insensitive' } } },
          { tests: { some: { testName: { contains: 'V123', mode: 'insensitive' } } } },
        ],
      },
    });
  });
});
