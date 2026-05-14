import { apiJson } from '@/config/api';

export interface PatientResponse {
  id: string;
  name: string;
  documentType: string;
  documentId: string;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  gender: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePatientDto {
  name: string;
  documentType: string;
  documentId: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
}

export interface UpdatePatientDto {
  name?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
}

export const getPatients = (): Promise<PatientResponse[]> =>
  apiJson('/patients');

export const getPatient = (id: string): Promise<PatientResponse> =>
  apiJson(`/patients/${id}`);

export const createPatient = (dto: CreatePatientDto): Promise<PatientResponse> =>
  apiJson('/patients', { method: 'POST', body: JSON.stringify(dto) });

export const updatePatient = (
  id: string,
  dto: UpdatePatientDto,
): Promise<PatientResponse> => apiJson(`/patients/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(dto),
});

export const deactivatePatient = (id: string): Promise<PatientResponse> =>
  apiJson(`/patients/${id}/deactivate`, { method: 'POST' });
