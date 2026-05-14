import { apiJson } from '@/config/api';

export interface ServicePriceResponse {
  id: string;
  serviceId: string;
  serviceName: string;
  priceUsd: string;
  isActive: boolean;
}

export interface SpecialtyResponse {
  id: string;
  name: string;
  isActive: boolean;
  services: ServicePriceResponse[];
}

export interface CreateSpecialtyDto {
  name: string;
  services: Array<{ serviceName: string; priceUsd: number }>;
}

export const getSpecialties = (): Promise<SpecialtyResponse[]> =>
  apiJson('/specialties');

export const createSpecialty = (dto: CreateSpecialtyDto): Promise<SpecialtyResponse> =>
  apiJson('/specialties', { method: 'POST', body: JSON.stringify(dto) });

export const deactivateSpecialty = (id: string): Promise<SpecialtyResponse> =>
  apiJson(`/specialties/${id}`, { method: 'DELETE' });

export const updateServicePrice = (
  specialtyId: string,
  servicePriceId: string,
  priceUsd: number,
): Promise<SpecialtyResponse> =>
  apiJson(`/specialties/${specialtyId}/services/${servicePriceId}`, {
    method: 'PATCH',
    body: JSON.stringify({ priceUsd }),
  });
