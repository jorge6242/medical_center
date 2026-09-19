'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createExpense,
  getExpenseCategories,
  getExpenses,
  getPaginatedExpenses,
  voidExpense,
  type GetExpensesQuery,
} from '../services/expenses.service';

export function useExpenses() {
  return useQuery({ queryKey: ['expenses'], queryFn: getExpenses });
}

export function usePaginatedExpenses(query?: GetExpensesQuery) {
  return useQuery({
    queryKey: ['expenses', query?.page, query?.limit, query?.search],
    queryFn: () => getPaginatedExpenses(query),
  });
}

export function useExpenseCategories() {
  return useQuery({ queryKey: ['expense-categories'], queryFn: getExpenseCategories });
}

export function useCreateExpense(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
      onSuccess?.();
    },
  });
}

export function useVoidExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      voidExpense(id, { reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
