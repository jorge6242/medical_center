import { PaymentsService } from './payments.service';

import type { PrismaService } from '../database/prisma.service';
import type { MailerService } from '../mailer/mailer.service';
import type { ReceiptsService } from '../receipts/receipts.service';

describe('PaymentsService receipt side effects', () => {
  const prisma = {} as PrismaService;
  const receiptsService = {
    createForPayment: jest.fn(),
  } as unknown as ReceiptsService;
  const mailerService = {
    renderTemplate: jest.fn(),
    sendReceiptEmail: jest.fn(),
  } as unknown as MailerService;

  const service = new PaymentsService(prisma, receiptsService, mailerService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates a receipt inline and sends the receipt email when the doctor has email', async () => {
    (receiptsService.createForPayment as jest.Mock).mockResolvedValue({
      id: 'receipt-1',
      receiptNumber: 'CM-2026-1',
      doctorName: 'Dra. Ana',
      doctorShare: '67.50',
      paymentId: 'payment-1',
    });
    (mailerService.renderTemplate as jest.Mock).mockReturnValue({
      subject: 'Recibo CM-2026-1',
      html: '<p>Recibo</p>',
      template: {
        name: 'receipt-generated',
        version: 1,
        category: 'receipt',
        audience: 'doctor',
      },
    });

    const result = await service.processReceiptSideEffects(
      'tenant-1',
      'payment-1',
      'user-1',
      'doctor@example.com',
    );

    expect(receiptsService.createForPayment).toHaveBeenCalledWith(
      'tenant-1',
      'payment-1',
      'user-1',
    );
    expect(mailerService.sendReceiptEmail).toHaveBeenCalledWith(
      'doctor@example.com',
      'Recibo CM-2026-1',
      '<p>Recibo</p>',
    );
    expect(result).toEqual({
      receiptId: 'receipt-1',
      emailDeliveryStatus: 'sent',
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
      'doctor@example.com',
    );

    expect(mailerService.sendReceiptEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      emailDeliveryStatus: 'skipped',
      warnings: ['Receipt generation failed: doctor data missing'],
    });
  });

  it('keeps the receipt valid and returns an email warning when SMTP delivery fails', async () => {
    (receiptsService.createForPayment as jest.Mock).mockResolvedValue({
      id: 'receipt-1',
      receiptNumber: 'CM-2026-1',
      doctorName: 'Dra. Ana',
      doctorShare: '67.50',
      paymentId: 'payment-1',
    });
    (mailerService.renderTemplate as jest.Mock).mockReturnValue({
      subject: 'Recibo CM-2026-1',
      html: '<p>Recibo</p>',
      template: {
        name: 'receipt-generated',
        version: 1,
        category: 'receipt',
        audience: 'doctor',
      },
    });
    (mailerService.sendReceiptEmail as jest.Mock).mockRejectedValue(
      new Error('SMTP unreachable'),
    );

    const result = await service.processReceiptSideEffects(
      'tenant-1',
      'payment-1',
      'user-1',
      'doctor@example.com',
    );

    expect(result).toEqual({
      receiptId: 'receipt-1',
      emailDeliveryStatus: 'failed',
      warnings: ['Receipt email failed: SMTP unreachable'],
    });
  });
});
