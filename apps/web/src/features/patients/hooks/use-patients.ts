'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createPatient, deactivatePatient, getPatients, updatePatient } from '../services/patients.service';

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: getPatients,
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
