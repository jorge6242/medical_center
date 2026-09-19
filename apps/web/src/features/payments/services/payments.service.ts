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

export interface ConsultationServiceSnapshot {
  serviceId: string;
  serviceName: string;
  specialtyName: string;
  priceUsd: string;
}

export interface LabOrderTestSnapshot {
  labTestId: string;
  testName: string;
  priceUsd: string;
}

export interface PaymentItemResponse {
  id: string;
  itemType: 'CONSULTATION' | 'LAB';
  description: string;
  quantity: number;
  unitPriceUsd: string;
  totalPriceUsd: string;
  patientId?: string;
  consultationId?: string;
  labOrderId?: string;
  services?: ConsultationServiceSnapshot[];
  labTests?: LabOrderTestSnapshot[];
}

export interface PaymentResponse {
  id: string;
  idempotencyKey: string | null;
  status: string;
  tenantId: string;
  item: PaymentItemResponse;
  totalServiceUsd: string;
  bcvExchangeRate: string;
  totalPaidUsd: string;
  totalPaidUsdEquivalent: string;
  totalPaidBs: string;
  totalIgtfUsd: string;
  doctorShareUsd: string;
  centerShareUsd: string;
  details: PaymentDetailResponse[];
  adjustments: PaymentAdjustmentResponse[];
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface GetPaymentsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface PaymentLineDto {
  paymentMethod: string;
  currency: string;
  amount: number;
  referenceNumber?: string;
}

export interface PaymentItemDto {
  itemType: 'CONSULTATION' | 'LAB';
  description: string;
  doctorId?: string;
  servicePriceIds?: string[];
  labOrderId?: string;
}

export interface CreatePaymentDto {
  idempotencyKey: string;
  patientId: string;
  bcvExchangeRate: number;
  item: PaymentItemDto;
  paymentLines: PaymentLineDto[];
}

export const getPayments = (): Promise<PaymentResponse[]> =>
  apiJson<PaginatedResponse<PaymentResponse>>('/payments').then((res) => res.data);

export const getPaginatedPayments = (query?: GetPaymentsQuery): Promise<PaginatedResponse<PaymentResponse>> => {
  const params = new URLSearchParams();
  if (query?.page) params.append('page', String(query.page));
  if (query?.limit) params.append('limit', String(query.limit));
  if (query?.search) params.append('search', query.search);
  if (query?.status) params.append('status', query.status);

  const queryString = params.toString();
  return apiJson(`/payments${queryString ? `?${queryString}` : ''}`);
};

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
