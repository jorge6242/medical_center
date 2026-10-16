import type {
  ExpenseCategoryResponse,
  ExpenseResponse,
} from '@/features/expenses/services/expenses.service';
export const expenseCategoriesFixture: ExpenseCategoryResponse[] = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Insumos' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Servicios' },
];
export const createdExpenseFixture: ExpenseResponse = {
  id: 'expense-created',
  categoryId: '22222222-2222-4222-8222-222222222222',
  categoryName: 'Servicios',
  description: 'Compra nueva',
  amountUsd: '0.29',
  amountBs: null,
  status: 'ACTIVE',
  voidedBy: null,
  voidReason: null,
  createdAt: '2026-10-16T14:00:00Z',
};
