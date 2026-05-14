import { apiJson } from '@/config/api';

export interface DoctorResponse {
  id: string;
  name: string;
  documentType: string;
  documentId: string;
  specialties: Array<{
    specialtyId: string;
    specialtyName: string;
    isPrimary: boolean;
  }>;
}

export interface ServicePriceResponse {
  id: string;
  specialtyId: string;
  specialtyName: string;
  serviceId: string;
  serviceName: string;
  priceUsd: string;
}

export const getDoctors = (): Promise<DoctorResponse[]> =>
  apiJson('/doctors');

export const getDoctorServicePrices = (doctorId: string): Promise<ServicePriceResponse[]> =>
  apiJson(`/doctors/${doctorId}/service-prices`);
