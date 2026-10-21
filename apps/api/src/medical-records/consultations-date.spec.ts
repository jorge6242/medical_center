import 'reflect-metadata';

import { type ConfigService } from '@nestjs/config';
import { validate } from 'class-validator';

import { ConsultationsQueryDto } from './dto/consultations-query.dto';
import { MedicalRecordsService } from './medical-records.service';

import type { JwtPayload } from '../common/decorators/current-user.decorator';
import type { PrismaService } from '../database/prisma.service';

describe('consultations date filter', () => {
  it.each(['2026-02-30', '2026-10-19T00:00:00Z', 'garbage'])(
    'rejects invalid date %s',
    async (date) => {
      expect(
        await validate(Object.assign(new ConsultationsQueryDto(), { date })),
      ).not.toHaveLength(0);
    },
  );

  it('scopes list and count to tenant, doctor and the selected local day, including unpaid consultations', async () => {
    const count = jest.fn().mockResolvedValue(0);
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      consultation: { count, findMany },
      $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
    } as unknown as PrismaService;
    const config = { get: () => 'America/Caracas' } as unknown as ConfigService;
    const service = new MedicalRecordsService(prisma, undefined, config);
    await service.findPaidConsultations(
      { tenantId: 't1', role: 'doctor', doctorId: 'd1' } as JwtPayload,
      { page: 2, limit: 10, date: '2026-10-19' },
    );
    const where = {
      tenantId: 't1',
      doctorId: 'd1',
      status: { in: ['SCHEDULED', 'PENDING', 'PAID'] },
      date: {
        gte: new Date('2026-10-19T04:00:00Z'),
        lt: new Date('2026-10-20T04:00:00Z'),
      },
    };
    expect(count).toHaveBeenCalledWith({ where });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where, skip: 10 }),
    );
  });
});
