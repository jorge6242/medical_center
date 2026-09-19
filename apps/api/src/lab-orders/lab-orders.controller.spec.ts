import { LabOrderStatus } from '@prisma/client';

import { LabOrdersController } from './lab-orders.controller';

import type { LabOrderQueryDto } from './dto/lab-order-query.dto';
import type { LabOrdersService } from './lab-orders.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

describe('LabOrdersController', () => {
  const labOrdersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  } as unknown as LabOrdersService;

  const controller = new LabOrdersController(labOrdersService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns paginated lab orders from the service', async () => {
    const response = {
      data: [
        {
          id: 'order-1',
          patientName: 'Ana Perez',
          totalUsd: '45.00',
          status: LabOrderStatus.PENDING,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    (labOrdersService.findAll as jest.Mock).mockResolvedValue(response);

    const result = await controller.findAll(
      { tenantId: 'tenant-1' } as JwtPayload,
      { page: 1, limit: 10 } as LabOrderQueryDto,
    );

    expect(labOrdersService.findAll).toHaveBeenCalledWith('tenant-1', { page: 1, limit: 10 });
    expect(result).toEqual(response);
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
  });
});
