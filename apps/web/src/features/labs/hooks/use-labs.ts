'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createLabTest,
  getLaboratoryCatalog,
  getPaginatedLabTests,
  toggleLabTest,
  updateLabTest,
  type GetLabTestsQuery,
  type LabTest,
} from '../services/labs.service';

export function usePaginatedLabTests(query?: GetLabTestsQuery) {
  return useQuery({
    queryKey: ['lab-tests', query?.page, query?.limit, query?.search],
    queryFn: () => getPaginatedLabTests(query),
    placeholderData: (previousData) => previousData,
  });
}

export function useLaboratoryCatalog() {
  return useQuery({
    queryKey: ['laboratory-catalog'],
    queryFn: getLaboratoryCatalog,
  });
}

export function useCreateLabTest(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLabTest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lab-tests'] });
      void queryClient.invalidateQueries({ queryKey: ['laboratory-catalog'] });
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
      void queryClient.invalidateQueries({ queryKey: ['laboratory-catalog'] });
      onSuccess?.();
    },
  });
}

export function useToggleLabTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (test: LabTest) => toggleLabTest(test),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lab-tests'] });
      void queryClient.invalidateQueries({ queryKey: ['laboratory-catalog'] });
    },
  });
}
