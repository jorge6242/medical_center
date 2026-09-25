import { Prisma } from '@prisma/client';

import { DoctorPayoutsService } from './doctor-payouts.service';

import type { AuditLogService } from '../audit-log/audit-log.service';
import type { PrismaService } from '../database/prisma.service';

describe('DoctorPayoutsService.findOne', () => {
  it('returns the USD payout total and its BCV equivalent without split percentages', async () => {
    const prisma = {
      doctorPayout: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'payout-1',
          tenantId: 'tenant-1',
          doctorId: 'doctor-1',
          doctorName: 'Dra. Nina Gómez',
          status: 'COMPLETED',
          paymentMethod: 'PAGO_MOVIL',
          currency: 'VES',
          amountUsd: new Prisma.Decimal('1960.00'),
          paidAmount: new Prisma.Decimal('1568980.00'),
          bcvExchangeRate: new Prisma.Decimal('800.5000'),
          referenceNumber: '123456',
          bankName: 'Banesco',
          accountNumber: '01020123456789012345',
          bankPhone: null,
          createdAt: new Date('2026-09-25T12:00:00.000Z'),
          voidReason: null,
          doctor: { documentType: 'V', documentId: '12345678' },
          items: [
            {
              paymentId: 'payment-1',
              totalConsultationUsd: new Prisma.Decimal('100.00'),
              doctorShareUsd: new Prisma.Decimal('70.00'),
              payment: {
                item: {
                  description: 'Consulta - Cardiología',
                  consultation: {
                    date: new Date('2026-09-20T10:00:00.000Z'),
                    patient: {
                      name: 'Juan Pérez',
                      documentType: 'V',
                      documentId: '98765432',
                    },
                    services: [
                      { serviceName: 'Consulta', specialtyName: 'Cardiología' },
                    ],
                  },
                },
              },
            },
          ],
        }),
      },
    } as unknown as PrismaService;
    const auditLog = { log: jest.fn() } as unknown as AuditLogService;
    const service = new DoctorPayoutsService(prisma, auditLog);

    const result = await service.findOne('tenant-1', 'payout-1');

    expect(prisma.doctorPayout.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'payout-1', tenantId: 'tenant-1' },
      }),
    );
    expect(result).toMatchObject({
      amountUsd: '1960.00',
      paidAmount: '1568980.00',
      bcvExchangeRate: '800.5000',
      equivalentBs: '1568980.00',
      doctorDocument: 'V-12345678',
      items: [
        expect.objectContaining({
          patientName: 'Juan Pérez',
          services: [{ serviceName: 'Consulta', specialtyName: 'Cardiología' }],
        }),
      ],
    });
    expect(result).not.toHaveProperty('splitPercentage');
  });
});
