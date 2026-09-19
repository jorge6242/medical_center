import { apiJson } from '@/config/api';

export interface LabOrderListItem {
  id: string;
  patientName: string;
  totalUsd: string;
  status: string;
  createdAt: string;
}

export interface LabOrderDetail {
  id: string;
  patient: { id: string; name: string; documentType: string; documentId: string };
  tests: Array<{
    labTestId: string;
    testName: string;
    priceUsd: string;
  }>;
  totalUsd: string;
  status: string;
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

export interface LabOrderQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface CreateLabOrderDto {
  patientId: string;
  labTestIds: string[];
}

export const getPaginatedLabOrders = (
  query?: LabOrderQuery,
): Promise<PaginatedResponse<LabOrderListItem>> => {
  const params = new URLSearchParams();

  if (query?.page) params.append('page', String(query.page));
  if (query?.limit) params.append('limit', String(query.limit));
  if (query?.search) params.append('search', query.search);
  if (query?.status) params.append('status', query.status);

  const queryString = params.toString();
  return apiJson(`/lab-orders${queryString ? `?${queryString}` : ''}`);
};

export const getLabOrders = (): Promise<LabOrderListItem[]> =>
  apiJson<PaginatedResponse<LabOrderListItem>>('/lab-orders').then((res) => res.data);

export const getLabOrder = (id: string): Promise<LabOrderDetail> =>
  apiJson(`/lab-orders/${id}`);

export const createLabOrder = (dto: CreateLabOrderDto): Promise<LabOrderDetail> =>
  apiJson('/lab-orders', { method: 'POST', body: JSON.stringify(dto) });
