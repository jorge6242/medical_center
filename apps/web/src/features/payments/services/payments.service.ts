import { apiJson } from '@/config/api';

export interface PaymentDetailResponse {
  id: string;
  paymentMethod: string;
  currency: string;
  amount: string;
  referenceNumber: string | null;
  appliedIgtfAmount: string;
}

export interface PaymentAdjustmentResponse {
  id: string;
  description: string;
  amountUsd: string;
  paymentDetailId: string | null;
  createdAt: string;
}

export interface PaymentServiceResponse {
  serviceId: string;
  serviceName: string;
  specialtyName: string;
  priceUsd: string;
}

export interface PaymentResponse {
  id: string;
  idempotencyKey: string;
  status: string;
  consultationPaymentStatus: string;
  consultationId: string;
  patientId: string;
  doctorId: string;
  services: PaymentServiceResponse[];
  totalServiceUsd: string;
  bcvExchangeRate: string;
  totalPaidUsd: string;
  totalPaidBs: string;
  totalIgtfUsd: string;
  doctorShareUsd: string;
  centerShareUsd: string;
  details: PaymentDetailResponse[];
  adjustments: PaymentAdjustmentResponse[];
  createdAt: string;
}

export interface PaymentLineDto {
  paymentMethod: string;
  currency: string;
  amount: number;
  referenceNumber?: string;
}

export interface CreatePaymentDto {
  idempotencyKey: string;
  patientId: string;
  doctorId: string;
  servicePriceIds: string[];
  bcvExchangeRate: number;
  paymentLines: PaymentLineDto[];
}

export const getPayments = (): Promise<PaymentResponse[]> =>
  apiJson('/payments');

export const createPayment = (dto: CreatePaymentDto): Promise<PaymentResponse> =>
  apiJson('/payments', { method: 'POST', body: JSON.stringify(dto) });

export const voidPayment = (id: string): Promise<PaymentResponse> =>
  apiJson(`/payments/${id}/void`, { method: 'POST' });

export interface CreatePaymentAdjustmentDto {
  description: string;
  amountUsd: number;
  paymentDetailId?: string;
}

export const createPaymentAdjustment = (
  id: string,
  dto: CreatePaymentAdjustmentDto,
): Promise<PaymentResponse> => apiJson(`/payments/${id}/adjustments`, { method: 'POST', body: JSON.stringify(dto) });
