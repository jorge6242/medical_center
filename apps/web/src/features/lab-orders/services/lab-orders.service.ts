import { apiJson } from '@/config/api';

export interface LabOrder {
  id: string;
  patientId: string;
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

export interface CreateLabOrderDto {
  patientId: string;
  labTestIds: string[];
}

export const getLabOrders = (): Promise<LabOrder[]> =>
  apiJson('/lab-orders');

export const getLabOrder = (id: string): Promise<LabOrderDetail> =>
  apiJson(`/lab-orders/${id}`);

export const createLabOrder = (dto: CreateLabOrderDto): Promise<LabOrderDetail> =>
  apiJson('/lab-orders', { method: 'POST', body: JSON.stringify(dto) });
