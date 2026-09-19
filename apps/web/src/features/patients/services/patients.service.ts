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

export interface GetPatientsQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export const getPatients = (): Promise<PatientResponse[]> =>
  apiJson<PaginatedResponse<PatientResponse>>('/patients').then((res) => res.data);

export const getPaginatedPatients = (query?: GetPatientsQuery): Promise<PaginatedResponse<PatientResponse>> => {
  const params = new URLSearchParams();
  if (query?.page) params.append('page', String(query.page));
  if (query?.limit) params.append('limit', String(query.limit));
  if (query?.search) params.append('search', query.search);

  const queryString = params.toString();
  return apiJson(`/patients${queryString ? `?${queryString}` : ''}`);
};

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
