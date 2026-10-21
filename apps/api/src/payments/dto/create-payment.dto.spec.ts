import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';

import { CreatePaymentDto } from './create-payment.dto';

describe('payment reference validation', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const transform = (paymentMethod: string, referenceNumber?: unknown) =>
    pipe.transform(
      {
        idempotencyKey: '123e4567-e89b-42d3-a456-426614174000',
        patientId: 'patient',
        bcvExchangeRate: 40,
        item: { itemType: 'LAB', description: 'Lab', labOrderId: 'lab' },
        paymentLines: [
          { paymentMethod, currency: 'VES', amount: 100, referenceNumber },
        ],
      },
      { type: 'body', metatype: CreatePaymentDto },
    );

  it.each([undefined, null, '', '   ', 123])(
    'rejects missing or invalid mobile payment reference %p',
    async (reference) => {
      await expect(transform('PAGO_MOVIL', reference)).rejects.toThrow();
    },
  );

  it('accepts a nonblank mobile payment reference', async () => {
    await expect(transform('PAGO_MOVIL', 'REF-123')).resolves.toBeInstanceOf(
      CreatePaymentDto,
    );
  });

  it.each(['CASH_USD', 'ZELLE', 'WIRE_TRANSFER_USD', 'POS_USD_CARD', 'POS_BS'])(
    'keeps reference optional for %s',
    async (method) => {
      await expect(transform(method)).resolves.toBeInstanceOf(CreatePaymentDto);
      await expect(transform(method, '')).resolves.toBeInstanceOf(
        CreatePaymentDto,
      );
    },
  );
});
