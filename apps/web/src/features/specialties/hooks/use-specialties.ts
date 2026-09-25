'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSpecialty,
  deactivateSpecialty,
  getPaginatedSpecialties,
  getSpecialties,
  permanentlyDeleteSpecialty,
  updateSpecialty,
  type CreateSpecialtyDto,
  type GetSpecialtiesQuery,
} from '../services/specialties.service';

export function useSpecialties() {
  return useQuery({ queryKey: ['specialties'], queryFn: getSpecialties });
}

export function usePaginatedSpecialties(query?: GetSpecialtiesQuery) {
  return useQuery({
    queryKey: ['specialties', query?.page, query?.limit, query?.search],
    queryFn: () => getPaginatedSpecialties(query),
  });
}

export function useCreateSpecialty(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSpecialtyDto) => createSpecialty(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['specialties'] });
      onSuccess?.();
    },
  });
}

export function useDeactivateSpecialty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deactivateSpecialty,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['specialties'] }),
  });
}

export function useUpdateSpecialty(id: string, onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Parameters<typeof updateSpecialty>[1]) => updateSpecialty(id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['specialties'] });
      onSuccess?.();
    },
  });
}

export function usePermanentlyDeleteSpecialty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: permanentlyDeleteSpecialty,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['specialties'] }),
  });
}
