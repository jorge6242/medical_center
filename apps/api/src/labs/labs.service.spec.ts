import { LabsService } from './labs.service';

import type { PrismaService } from '../database/prisma.service';

describe('LabsService', () => {
  const prisma = {
    labTestCatalog: { findMany: jest.fn() },
  } as unknown as PrismaService;
  const service = new LabsService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('returns only public fields for laboratory tests', async () => {
    (prisma.labTestCatalog.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'lab-1',
        name: 'Hematología',
        priceUsd: { toString: () => '30.00' },
        isActive: true,
      },
    ]);

    const result = await service.findAll('tenant-1');

    expect(prisma.labTestCatalog.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, priceUsd: true, isActive: true },
    });
    expect(result[0]).toEqual({
      id: 'lab-1',
      name: 'Hematología',
      priceUsd: '30.00',
      isActive: true,
    });
  });
});
