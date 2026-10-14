import { PaymentsService } from './payments.service';
import { MailerService } from '../mailer/mailer.service';

import type { PaymentItemDto } from './dto/create-payment.dto';
import type { AuditLogService } from '../audit-log/audit-log.service';
import type { PrismaService } from '../database/prisma.service';
import type { ReceiptsService } from '../receipts/receipts.service';

describe('PaymentsService receipt side effects', () => {
  const prisma = {} as PrismaService;
  const receiptsService = {
    createForPayment: jest.fn(),
    findByPayment: jest.fn().mockResolvedValue({
      receiptNumber: 'CM-2026-1',
      doctorName: 'Dra. Ana',
      doctorShare: '67.50',
      paymentId: 'payment-1',
    }),
  } as unknown as ReceiptsService;
  const sendReceiptEmail = jest
    .spyOn(MailerService.prototype, 'sendReceiptEmail')
    .mockResolvedValue(undefined);

  const auditLog = { log: jest.fn() } as unknown as AuditLogService;
  const service = new PaymentsService(prisma, receiptsService, auditLog);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    sendReceiptEmail.mockRestore();
  });

  it('generates a receipt inline without emailing the doctor', async () => {
    (receiptsService.createForPayment as jest.Mock).mockResolvedValue({
      id: 'receipt-1',
      receiptNumber: 'CM-2026-1',
      doctorName: 'Dra. Ana',
      doctorShare: '67.50',
      paymentId: 'payment-1',
    });

    const result = await service.processReceiptSideEffects(
      'tenant-1',
      'payment-1',
      'user-1',
    );

    expect(receiptsService.createForPayment).toHaveBeenCalledWith(
      'tenant-1',
      'payment-1',
      'user-1',
    );
    expect(sendReceiptEmail).not.toHaveBeenCalled();
    expect(receiptsService.findByPayment).not.toHaveBeenCalled();
    expect(result).toEqual({
      receiptId: 'receipt-1',
      emailDeliveryStatus: 'skipped',
      warnings: [],
    });
  });

  it('returns a warning when receipt generation fails and skips email delivery', async () => {
    (receiptsService.createForPayment as jest.Mock).mockRejectedValue(
      new Error('doctor data missing'),
    );

    const result = await service.processReceiptSideEffects(
      'tenant-1',
      'payment-1',
      'user-1',
    );

    expect(sendReceiptEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      receiptId: undefined,
      emailDeliveryStatus: 'failed',
      warnings: ['Receipt generation failed: doctor data missing'],
    });
  });
});

describe('PaymentsService doctor service pricing contract', () => {
  it('uses doctorServiceIds as the consultation pricing identifiers', () => {
    const item: PaymentItemDto = {
      itemType: 'CONSULTATION',
      description: 'Consulta',
      doctorId: 'doctor-1',
      doctorServiceIds: ['doctor-service-1'],
    };

    expect(item.doctorServiceIds).toEqual(['doctor-service-1']);
  });
});
