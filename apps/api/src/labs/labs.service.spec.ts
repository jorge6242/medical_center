import { LabsService } from './labs.service';

import type { PrismaService } from '../database/prisma.service';

describe('LabsService', () => {
  const prisma = {
    labTestCatalog: { count: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const service = new LabsService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('returns a tenant-scoped paginated laboratory test list', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      1,
      [
        {
          id: 'lab-1',
          name: 'Hematología',
          priceUsd: { toString: () => '30.00' },
          isActive: true,
        },
      ],
    ]);

    const result = await service.findAll('tenant-1', {
      page: 2,
      limit: 5,
      search: 'hema',
    });

    expect(prisma.labTestCatalog.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        name: { contains: 'hema', mode: 'insensitive' },
      },
    });
    expect(prisma.labTestCatalog.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        name: { contains: 'hema', mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
      skip: 5,
      take: 5,
      select: { id: true, name: true, priceUsd: true, isActive: true },
    });
    expect(result).toEqual({
      data: [
        {
          id: 'lab-1',
          name: 'Hematología',
          priceUsd: '30.00',
          isActive: true,
        },
      ],
      meta: {
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    });
  });
});
