'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createPatient, deactivatePatient, getPatients, getPaginatedPatients, updatePatient, type GetPatientsQuery } from '../services/patients.service';

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: getPatients,
  });
}

export function usePaginatedPatients(query?: GetPatientsQuery) {
  return useQuery({
    queryKey: ['patients', query?.page, query?.limit, query?.search],
    queryFn: () => getPaginatedPatients(query),
  });
}

export function useCreatePatient(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
      onSuccess?.();
    },
  });
}

export function useUpdatePatient(id: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: Parameters<typeof updatePatient>[1]) => updatePatient(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
      void queryClient.invalidateQueries({ queryKey: ['patients', id] });
      onSuccess?.();
    },
  });
}

export function useDeactivatePatient(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivatePatient,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
      onSuccess?.();
    },
  });
}
