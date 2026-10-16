import type { ExpenseResponse } from '@/features/expenses/services/expenses.service';
export const expensesFixture: ExpenseResponse[] = ['one', 'two', 'void'].map((id, index) => ({
  id: `expense-${id}`,
  categoryId: `category-${id}`,
  categoryName: `Categoría histórica ${id}`,
  description: `Egreso ${id}`,
  amountUsd: index === 0 ? '25.00' : '70.00',
  amountBs: index === 0 ? '1000.00' : null,
  status: index === 2 ? 'VOIDED' : 'ACTIVE',
  voidedBy: index === 2 ? 'user-one' : null,
  voidReason: index === 2 ? 'Duplicado histórico' : null,
  createdAt: '2026-10-15T14:00:00Z',
}));
export function voidedExpenseFixture(id: string, reason: string): ExpenseResponse {
  const expense = expensesFixture.find((item) => item.id === id);
  if (!expense) throw new Error('Egreso sintético inexistente');
  return { ...expense, status: 'VOIDED', voidedBy: 'user-one', voidReason: reason };
}
