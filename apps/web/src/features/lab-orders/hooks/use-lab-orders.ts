'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createLabOrder,
  getLabOrder,
  getLabOrders,
  getPaginatedLabOrders,
  type LabOrderQuery,
} from '../services/lab-orders.service';

export function useLabOrders(query?: LabOrderQuery) {
  return useQuery({
    queryKey: ['lab-orders', query?.page, query?.limit, query?.search, query?.status],
    queryFn: () => getPaginatedLabOrders(query),
  });
}

export function useLabOrdersList() {
  return useQuery({ queryKey: ['lab-orders-list'], queryFn: getLabOrders });
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
