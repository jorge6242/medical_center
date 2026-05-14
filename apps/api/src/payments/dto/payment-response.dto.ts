import type { ConsultationPaymentStatus, Currency, PaymentMethod, PaymentStatus } from '@prisma/client';

export class PaymentDetailResponseDto {
  declare id: string;
  declare paymentMethod: PaymentMethod;
  declare currency: Currency;
  declare amount: string;
  declare referenceNumber: string | null;
  declare appliedIgtfAmount: string;
}

export class PaymentAdjustmentResponseDto {
  declare id: string;
  declare description: string;
  declare amountUsd: string;
  declare paymentDetailId: string | null;
  declare createdAt: Date;
}

export class ConsultationServiceResponseDto {
  declare serviceId: string;
  declare serviceName: string;
  declare specialtyName: string;
  declare priceUsd: string;
}

export class PaymentResponseDto {
  declare id: string;
  declare idempotencyKey: string;
  declare status: PaymentStatus;
  declare consultationPaymentStatus: ConsultationPaymentStatus;

  declare consultationId: string;
  declare patientId: string;
  declare doctorId: string;
  declare services: ConsultationServiceResponseDto[];

  declare totalServiceUsd: string;
  declare bcvExchangeRate: string;
  declare totalPaidUsd: string;
  declare totalPaidBs: string;
  declare totalIgtfUsd: string;
  declare doctorShareUsd: string;
  declare centerShareUsd: string;

  declare details: PaymentDetailResponseDto[];
  declare adjustments: PaymentAdjustmentResponseDto[];
  declare createdAt: Date;
}
