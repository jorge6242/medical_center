import { apiJson } from '@/config/api';

export interface DoctorResponse {
  id: string;
  name: string;
  documentType: string;
  documentId: string;
  primarySpecialtyId: string;
  primarySpecialtyName: string;
}

export interface DoctorServiceResponse {
  id: string;
  specialtyId: string;
  specialtyName: string;
  serviceId: string;
  serviceName: string;
  priceUsd: string;
}

interface PaginatedResponse<T> {
  data: T[];
}

export const getDoctors = (): Promise<DoctorResponse[]> =>
  apiJson<PaginatedResponse<DoctorResponse>>('/doctors').then((res) => res.data);

export const getDoctorServices = (doctorId: string): Promise<DoctorServiceResponse[]> =>
  apiJson(`/doctors/${doctorId}/services`);
