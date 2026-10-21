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
  clinicalHistory?: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  representatives: Array<{
    relationship: string;
    name: string;
    documentType: string;
    documentId: string;
    phone?: string | null;
  }> | null;
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

export interface RepresentativeData {
  name: string;
  documentType: string;
  documentId: string;
  phone?: string;
  relationship: string;
}

export interface RepresentativeLookupResponse {
  found: boolean;
  representative?: {
    name: string;
    documentType: string;
    documentId: string;
    phone: string | null;
  };
}

export interface CreatePatientDto {
  name: string;
  documentType: string;
  documentId: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
  representative?: RepresentativeData;
}

export interface UpdatePatientDto {
  name?: string;
  documentType?: CreatePatientDto['documentType'];
  documentId?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
  representative?: RepresentativeData;
}

export interface GetPatientsQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export const getPatients = (): Promise<PatientResponse[]> =>
  apiJson<PaginatedResponse<PatientResponse>>('/patients').then((res) => res.data);

export const getPaginatedPatients = (
  query?: GetPatientsQuery,
): Promise<PaginatedResponse<PatientResponse>> => {
  const params = new URLSearchParams();
  if (query?.page) params.append('page', String(query.page));
  if (query?.limit) params.append('limit', String(query.limit));
  if (query?.search) params.append('search', query.search);

  const queryString = params.toString();
  return apiJson(`/patients${queryString ? `?${queryString}` : ''}`);
};

export const getPatient = (id: string): Promise<PatientResponse> => apiJson(`/patients/${id}`);

export const createPatient = (dto: CreatePatientDto): Promise<PatientResponse> =>
  apiJson('/patients', { method: 'POST', body: JSON.stringify(dto) });

export const updatePatient = (id: string, dto: UpdatePatientDto): Promise<PatientResponse> =>
  apiJson(`/patients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });

export const deactivatePatient = (id: string): Promise<PatientResponse> =>
  apiJson(`/patients/${id}/deactivate`, { method: 'POST' });

export const permanentlyDeletePatient = (id: string): Promise<{ id: string }> =>
  apiJson(`/patients/${id}/permanent`, { method: 'DELETE' });

export const sendBirthdayEmail = (id: string): Promise<{ message: string }> =>
  apiJson(`/patients/${id}/send-birthday-email`, { method: 'POST' });

export const lookupRepresentative = (
  documentType: string,
  documentId: string,
): Promise<RepresentativeLookupResponse> => {
  const params = new URLSearchParams({ documentType, documentId });
  return apiJson(`/patients/representatives/lookup?${params.toString()}`);
};
