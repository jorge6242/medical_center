import { apiJson } from '@/config/api';

export interface ExpenseCategoryResponse {
  id: string;
  name: string;
}

export interface ExpenseResponse {
  id: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amountUsd: string;
  amountBs: string | null;
  status: string;
  voidedBy: string | null;
  voidReason: string | null;
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

export interface GetExpensesQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateExpenseDto {
  categoryId: string;
  description: string;
  amountUsd: number;
  amountBs?: number;
}

export interface VoidExpenseDto {
  reason: string;
}

export const getExpenseCategories = (): Promise<ExpenseCategoryResponse[]> =>
  apiJson('/expenses/categories');

export const getExpenses = (): Promise<ExpenseResponse[]> =>
  apiJson<PaginatedResponse<ExpenseResponse>>('/expenses').then((res) => res.data);

export const getPaginatedExpenses = (
  query?: GetExpensesQuery,
): Promise<PaginatedResponse<ExpenseResponse>> => {
  const params = new URLSearchParams();

  if (query?.page) params.append('page', String(query.page));
  if (query?.limit) params.append('limit', String(query.limit));
  if (query?.search) params.append('search', query.search);

  const queryString = params.toString();
  return apiJson(`/expenses${queryString ? `?${queryString}` : ''}`);
};

export const createExpense = (dto: CreateExpenseDto): Promise<ExpenseResponse> =>
  apiJson('/expenses', { method: 'POST', body: JSON.stringify(dto) });

export const voidExpense = (id: string, dto: VoidExpenseDto): Promise<ExpenseResponse> =>
  apiJson(`/expenses/${id}/void`, { method: 'POST', body: JSON.stringify(dto) });
