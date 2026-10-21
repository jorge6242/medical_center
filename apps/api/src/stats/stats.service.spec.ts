import { Prisma } from '@prisma/client';

import { StatsService } from './stats.service';

import type { PrismaService } from '../database/prisma.service';

describe('StatsService.getHomeStats', () => {
  it('counts unique scheduled patients in the Caracas day, while doctors remain paid only', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-20T02:30:00Z'));
    const findMany = jest.fn().mockResolvedValue([
      { patientId: 'a', doctorId: 'paid', status: 'PAID' },
      { patientId: 'a', doctorId: 'scheduled', status: 'SCHEDULED' },
      { patientId: 'b', doctorId: 'pending', status: 'PENDING' },
    ]);
    const prisma = {
      consultation: { findMany },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      expense: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    try {
      const result = await new StatsService(prisma).getHomeStats('tenant-1');
      expect(result).toMatchObject({ patientsToday: 2, doctorsToday: 1 });
      expect(findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          status: { not: 'VOIDED' },
          date: {
            gte: new Date('2026-10-19T04:00:00Z'),
            lt: new Date('2026-10-20T04:00:00Z'),
          },
        },
        select: { patientId: true, doctorId: true, status: true },
      });
      expect(result.alerts[0]?.message).toContain('con consulta hoy');
    } finally {
      jest.useRealTimers();
    }
  });
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
