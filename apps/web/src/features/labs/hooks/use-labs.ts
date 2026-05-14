'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createLabTest,
  getLabTests,
  toggleLabTest,
  updateLabTest,
} from '../services/labs.service';

export function useLabTests() {
  return useQuery({ queryKey: ['lab-tests'], queryFn: getLabTests });
}

export function useCreateLabTest(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLabTest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lab-tests'] });
      onSuccess?.();
    },
  });
}

export function useUpdateLabTest(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof updateLabTest>[1] }) =>
      updateLabTest(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lab-tests'] });
      onSuccess?.();
    },
  });
}

export function useToggleLabTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleLabTest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lab-tests'] });
    },
  });
}
