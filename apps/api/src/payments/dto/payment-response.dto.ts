import type {
  Currency,
  ItemType,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';

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

export class ConsultationServiceSnapshotDto {
  declare serviceId: string;
  declare serviceName: string;
  declare specialtyName: string;
  declare priceUsd: string;
}

export class LabOrderTestSnapshotDto {
  declare labTestId: string;
  declare testName: string;
  declare priceUsd: string;
}

export class PaymentItemResponseDto {
  declare id: string;
  declare itemType: ItemType;
  declare description: string;
  declare quantity: number;
  declare unitPriceUsd: string;
  declare totalPriceUsd: string;

  // Type-specific optional fields
  declare consultationId?: string;
  declare labOrderId?: string;

  // Embedded snapshot data
  declare services?: ConsultationServiceSnapshotDto[];
  declare labTests?: LabOrderTestSnapshotDto[];
}

export class PaymentResponseDto {
  declare id: string;
  declare idempotencyKey: string | null;
  declare status: PaymentStatus;
  declare tenantId: string;

  declare item: PaymentItemResponseDto;

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
