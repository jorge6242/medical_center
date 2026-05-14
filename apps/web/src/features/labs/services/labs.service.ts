import { apiJson } from '@/config/api';

export interface LabTest {
  id: string;
  name: string;
  priceUsd: string;
  isActive: boolean;
}

export interface CreateLabTestDto {
  name: string;
  priceUsd: number;
}

export interface UpdateLabTestDto {
  name?: string;
  priceUsd?: number;
  isActive?: boolean;
}

export const getLabTests = (): Promise<LabTest[]> =>
  apiJson('/laboratories');

export const createLabTest = (dto: CreateLabTestDto): Promise<LabTest> =>
  apiJson('/laboratories', { method: 'POST', body: JSON.stringify(dto) });

export const updateLabTest = (id: string, dto: UpdateLabTestDto): Promise<LabTest> =>
  apiJson(`/laboratories/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });

export const toggleLabTest = (id: string): Promise<LabTest> =>
  apiJson(`/laboratories/${id}`, { method: 'DELETE' });
