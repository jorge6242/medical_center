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

export interface PaginatedLabTests {
  data: LabTest[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface GetLabTestsQuery {
  page?: number;
  limit?: number;
  search?: string;
}

interface LaboratoryCatalogItem {
  labTestId: string;
  testName: string;
  priceUsd: string;
}

export const getPaginatedLabTests = (query?: GetLabTestsQuery): Promise<PaginatedLabTests> => {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.search) params.set('search', query.search);
  const queryString = params.toString();
  return apiJson(`/laboratories${queryString ? `?${queryString}` : ''}`);
};

export const getLaboratoryCatalog = (): Promise<LabTest[]> =>
  apiJson<LaboratoryCatalogItem[]>('/catalog/laboratories').then((tests) =>
    tests.map((test) => ({
      id: test.labTestId,
      name: test.testName,
      priceUsd: test.priceUsd,
      isActive: true,
    })),
  );

export const createLabTest = (dto: CreateLabTestDto): Promise<LabTest> =>
  apiJson('/laboratories', { method: 'POST', body: JSON.stringify(dto) });

export const updateLabTest = (id: string, dto: UpdateLabTestDto): Promise<LabTest> =>
  apiJson(`/laboratories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });

export const toggleLabTest = (test: LabTest): Promise<LabTest> =>
  updateLabTest(test.id, { isActive: !test.isActive });
