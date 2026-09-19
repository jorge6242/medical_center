import { Prisma } from '@prisma/client';

import { ReportGroupBy, ReportType } from './dto/query-reports.dto';
import { ReportsService } from './reports.service';

import type { PrismaService } from '../database/prisma.service';

describe('ReportsService', () => {
  const prisma = {
    payment: {
      findMany: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
    },
    generatedReport: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
  } as unknown as PrismaService;

  const service = new ReportsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('paginates filtered detail rows and reports the filtered total', async () => {
    (prisma.payment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'pay-1',
        createdAt: new Date('2026-01-10T10:00:00.000Z'),
        status: 'COMPLETED',
        totalServiceUsd: new Prisma.Decimal('40.00'),
        totalPaidBs: new Prisma.Decimal('1600.00'),
        totalIgtfUsd: new Prisma.Decimal('0.00'),
        item: {
          itemType: 'CONSULTATION',
          description: 'Consulta de control',
          consultation: {
            patient: { name: 'Maria Lopez' },
            doctor: { name: 'Dr. Gomez' },
            services: [],
          },
          labOrder: null,
        },
        details: [
          {
            paymentMethod: 'CASH',
            currency: 'USD',
            amount: new Prisma.Decimal('40.00'),
          },
        ],
      },
      {
        id: 'pay-2',
        createdAt: new Date('2026-01-08T10:00:00.000Z'),
        status: 'COMPLETED',
        totalServiceUsd: new Prisma.Decimal('55.00'),
        totalPaidBs: new Prisma.Decimal('2200.00'),
        totalIgtfUsd: new Prisma.Decimal('0.00'),
        item: {
          itemType: 'CONSULTATION',
          description: 'Chequeo de rutina',
          consultation: {
            patient: { name: 'Ana Perez' },
            doctor: { name: 'Dr. Ruiz' },
            services: [],
          },
          labOrder: null,
        },
        details: [
          {
            paymentMethod: 'CASH',
            currency: 'USD',
            amount: new Prisma.Decimal('55.00'),
          },
        ],
      },
    ]);
    (prisma.expense.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'exp-1',
        createdAt: new Date('2026-01-09T10:00:00.000Z'),
        status: 'ACTIVE',
        description: 'Papeleria',
        categoryName: 'Insumos',
        amountUsd: new Prisma.Decimal('10.00'),
        amountBs: new Prisma.Decimal('400.00'),
      },
    ]);

    const result = await service.getDetail('tenant-1', {
      page: 2,
      limit: 1,
      search: '',
      from: '2026-01-01',
      to: '2026-01-31',
      groupBy: ReportGroupBy.DAY,
      type: ReportType.ALL,
    } as never);

    expect(result.meta).toEqual({
      total: 3,
      page: 2,
      limit: 1,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: 'exp-1',
      recordType: 'EXPENSE',
      description: 'Papeleria',
      categoryName: 'Insumos',
      amountUsd: 10,
      amountBs: 400,
    });
  });

  it('filters detail rows by search text before paginating', async () => {
    (prisma.payment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'pay-1',
        createdAt: new Date('2026-01-10T10:00:00.000Z'),
        status: 'COMPLETED',
        totalServiceUsd: new Prisma.Decimal('40.00'),
        totalPaidBs: new Prisma.Decimal('1600.00'),
        totalIgtfUsd: new Prisma.Decimal('0.00'),
        item: {
          itemType: 'CONSULTATION',
          description: 'Consulta de control',
          consultation: {
            patient: { name: 'Maria Lopez' },
            doctor: { name: 'Dr. Gomez' },
            services: [],
          },
          labOrder: null,
        },
        details: [
          {
            paymentMethod: 'CASH',
            currency: 'USD',
            amount: new Prisma.Decimal('40.00'),
          },
        ],
      },
    ]);
    (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.getDetail('tenant-1', {
      page: 1,
      limit: 10,
      search: 'maria',
      from: '2026-01-01',
      to: '2026-01-31',
      groupBy: ReportGroupBy.DAY,
      type: ReportType.ALL,
    } as never);

    expect(result.meta.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      patientName: 'Maria Lopez',
      doctorName: 'Dr. Gomez',
      description: 'Consulta de control',
    });
  });

  it('groups consolidated rows before paginating them', async () => {
    (prisma.payment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'pay-1',
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        status: 'COMPLETED',
        totalServiceUsd: new Prisma.Decimal('20.00'),
        totalPaidBs: new Prisma.Decimal('800.00'),
        totalIgtfUsd: new Prisma.Decimal('0.00'),
        item: { itemType: 'CONSULTATION' },
        details: [],
      },
      {
        id: 'pay-2',
        createdAt: new Date('2026-01-01T12:00:00.000Z'),
        status: 'COMPLETED',
        totalServiceUsd: new Prisma.Decimal('30.00'),
        totalPaidBs: new Prisma.Decimal('1200.00'),
        totalIgtfUsd: new Prisma.Decimal('0.00'),
        item: { itemType: 'LAB' },
        details: [],
      },
      {
        id: 'pay-3',
        createdAt: new Date('2026-01-02T10:00:00.000Z'),
        status: 'COMPLETED',
        totalServiceUsd: new Prisma.Decimal('50.00'),
        totalPaidBs: new Prisma.Decimal('2000.00'),
        totalIgtfUsd: new Prisma.Decimal('0.00'),
        item: { itemType: 'CONSULTATION' },
        details: [],
      },
    ]);
    (prisma.expense.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'exp-1',
        createdAt: new Date('2026-01-01T14:00:00.000Z'),
        status: 'ACTIVE',
        description: 'Agua',
        categoryName: 'Servicios',
        amountUsd: new Prisma.Decimal('5.00'),
        amountBs: new Prisma.Decimal('200.00'),
      },
    ]);

    const result = await service.getConsolidated('tenant-1', {
      page: 1,
      limit: 1,
      search: '',
      from: '2026-01-01',
      to: '2026-01-31',
      groupBy: ReportGroupBy.DAY,
      type: ReportType.ALL,
    } as never);

    expect(result.meta).toEqual({
      total: 2,
      page: 1,
      limit: 1,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false,
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      period: '2026-01-01',
      income: {
        consultationsUsd: 20,
        laboratoriesUsd: 30,
        totalUsd: 50,
        totalBs: 2000,
        igtfUsd: 0,
        transactionCount: 2,
      },
      expenses: {
        totalUsd: 5,
        totalBs: 200,
        transactionCount: 1,
      },
      net: {
        usd: 45,
        bs: 1800,
      },
    });
  });

  it('creates a completed report job inline for PDF format', async () => {
    (prisma.generatedReport.create as jest.Mock).mockResolvedValue({
      id: 'report-1',
    });

    const result = await service.createJob('tenant-1', 'user-1', {
      from: '2026-01-01',
      to: '2026-01-31',
      type: ReportType.ALL,
      format: 'pdf',
      groupBy: ReportGroupBy.DAY,
    } as never);

    expect(prisma.generatedReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          status: 'completed',
          format: 'pdf',
          mimeType: 'application/pdf',
        }),
      }),
    );
    expect(result).toMatchObject({
      status: 'completed',
      progress: 100,
      format: 'pdf',
    });
  });

  it('creates a completed report job inline for Excel format', async () => {
    (prisma.generatedReport.create as jest.Mock).mockResolvedValue({
      id: 'report-2',
    });

    const result = await service.createJob('tenant-1', 'user-1', {
      from: '2026-01-01',
      to: '2026-01-31',
      type: ReportType.EXPENSE,
      format: 'excel',
      groupBy: ReportGroupBy.DAY,
    } as never);

    expect(result).toMatchObject({
      status: 'completed',
      progress: 100,
      format: 'excel',
    });
  });
});
