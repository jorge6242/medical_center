'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createPatient,
  deactivatePatient,
  getPatient,
  getPatients,
  getPaginatedPatients,
  lookupRepresentative,
  permanentlyDeletePatient,
  sendBirthdayEmail,
  updatePatient,
  type GetPatientsQuery,
} from '../services/patients.service';

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: getPatients,
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => getPatient(id),
    enabled: Boolean(id),
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

export function usePermanentlyDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: permanentlyDeletePatient,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useSendBirthdayEmail() {
  return useMutation({
    mutationFn: sendBirthdayEmail,
  });
}

export function useLookupRepresentative(documentType: string, documentId: string) {
  return useQuery({
    queryKey: ['representative-lookup', documentType, documentId],
    queryFn: () => lookupRepresentative(documentType, documentId),
    enabled: documentId.length >= 6,
    staleTime: 30_000,
  });
}
