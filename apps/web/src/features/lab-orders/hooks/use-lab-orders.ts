'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createLabOrder,
  getLabOrder,
  getLabOrders,
} from '../services/lab-orders.service';

export function useLabOrders() {
  return useQuery({ queryKey: ['lab-orders'], queryFn: getLabOrders });
}

export function useLabOrder(id: string) {
  return useQuery({
    queryKey: ['lab-orders', id],
    queryFn: () => getLabOrder(id),
    enabled: !!id,
  });
}

export function useCreateLabOrder(onSuccess?: (data: Awaited<ReturnType<typeof createLabOrder>>) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLabOrder,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      onSuccess?.(data);
    },
  });
}
