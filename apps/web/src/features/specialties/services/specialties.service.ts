import { apiJson } from '@/config/api';

export interface SpecialtyResponse {
  id: string;
  name: string;
  isActive: boolean;
}

export interface CreateSpecialtyDto {
  name: string;
}

export interface UpdateSpecialtyDto {
  name: string;
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

export interface GetSpecialtiesQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export const getSpecialties = (): Promise<SpecialtyResponse[]> =>
  apiJson<PaginatedResponse<SpecialtyResponse>>('/specialties?limit=100').then(
    (result) => result.data,
  );

export const getPaginatedSpecialties = (
  query?: GetSpecialtiesQuery,
): Promise<PaginatedResponse<SpecialtyResponse>> => {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.search) params.set('search', query.search);
  const queryString = params.toString();
  return apiJson(`/specialties${queryString ? `?${queryString}` : ''}`);
};

export const createSpecialty = (dto: CreateSpecialtyDto): Promise<SpecialtyResponse> =>
  apiJson('/specialties', { method: 'POST', body: JSON.stringify(dto) });

export const updateSpecialty = (id: string, dto: UpdateSpecialtyDto): Promise<SpecialtyResponse> =>
  apiJson(`/specialties/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });

export const deactivateSpecialty = (id: string): Promise<SpecialtyResponse> =>
  apiJson(`/specialties/${id}`, { method: 'DELETE' });

export const permanentlyDeleteSpecialty = (id: string): Promise<{ id: string }> =>
  apiJson(`/specialties/${id}/permanent`, { method: 'DELETE' });
