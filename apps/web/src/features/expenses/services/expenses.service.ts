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
  apiJson('/expenses');

export const createExpense = (dto: CreateExpenseDto): Promise<ExpenseResponse> =>
  apiJson('/expenses', { method: 'POST', body: JSON.stringify(dto) });

export const voidExpense = (id: string, dto: VoidExpenseDto): Promise<ExpenseResponse> =>
  apiJson(`/expenses/${id}/void`, { method: 'POST', body: JSON.stringify(dto) });
