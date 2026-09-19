import { ExpenseStatus, Prisma } from '@prisma/client';

import { ExpensesService } from './expenses.service';

import type { PrismaService } from '../database/prisma.service';
import type { ExpenseQueryDto } from './dto/expense-query.dto';

describe('ExpensesService', () => {
  const prisma = {
    expense: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    expenseCategory: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const service = new ExpensesService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('paginates and searches by categoryName or description', async () => {
    const query: ExpenseQueryDto = { page: 2, limit: 5, search: 'internet' } as ExpenseQueryDto;
    const expenses = [
      {
        id: '1',
        categoryId: 'cat-1',
        categoryName: 'Servicios',
        description: 'Pago mensual de internet',
        amountUsd: new Prisma.Decimal('25.00'),
        amountBs: new Prisma.Decimal('900.00'),
        status: ExpenseStatus.ACTIVE,
        voidedBy: null,
        voidReason: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ];

    (prisma.$transaction as jest.Mock).mockResolvedValue([1, expenses]);

    const result = await service.findAll('tenant-1', query);

    expect(prisma.expense.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        OR: [
          { categoryName: { contains: 'internet', mode: 'insensitive' } },
          { description: { contains: 'internet', mode: 'insensitive' } },
        ],
      },
    });
    expect(prisma.expense.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        OR: [
          { categoryName: { contains: 'internet', mode: 'insensitive' } },
          { description: { contains: 'internet', mode: 'insensitive' } },
        ],
      },
      skip: 5,
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
    expect(result.meta).toEqual({
      total: 1,
      page: 2,
      limit: 5,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: true,
    });
    expect(result.data[0]).toMatchObject({
      id: '1',
      categoryName: 'Servicios',
      description: 'Pago mensual de internet',
      status: 'ACTIVE',
    });
  });
});
