import { Prisma } from '@prisma/client';

import { StatsService } from './stats.service';

import type { PrismaService } from '../database/prisma.service';

describe('StatsService.getHomeStats', () => {
  it('counts only consultation payments still pending doctor honorarios, regardless of month', async () => {
    const consultationFindMany = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const paymentFindMany = jest
      .fn()
      .mockResolvedValueOnce([
        {
          doctorShareUsd: new Prisma.Decimal('70.00'),
          item: { consultation: { doctorId: 'doctor-1' } },
        },
      ])
      .mockResolvedValueOnce([]);
    const prisma = {
      consultation: { findMany: consultationFindMany },
      payment: { findMany: paymentFindMany },
      expense: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const service = new StatsService(prisma);

    const result = await service.getHomeStats('tenant-1');

    const pendingPaymentsWhere = paymentFindMany.mock.calls[0][0].where;
    expect(consultationFindMany).toHaveBeenCalledTimes(1);
    expect(pendingPaymentsWhere).toMatchObject({
      tenantId: 'tenant-1',
      status: 'COMPLETED',
      item: { itemType: 'CONSULTATION' },
      doctorPayoutItems: { none: { payout: { status: 'COMPLETED' } } },
    });
    expect(pendingPaymentsWhere).not.toHaveProperty('createdAt');
    expect(result).toMatchObject({
      pendingPayoutDoctors: 1,
      pendingPayoutAmountUsd: '70.00',
    });
  });
});
