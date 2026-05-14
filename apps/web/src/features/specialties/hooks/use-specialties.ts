'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSpecialty,
  deactivateSpecialty,
  getSpecialties,
  updateServicePrice,
  type CreateSpecialtyDto,
} from '../services/specialties.service';

export function useSpecialties() {
  return useQuery({ queryKey: ['specialties'], queryFn: getSpecialties });
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

export function useUpdateServicePrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      specialtyId,
      servicePriceId,
      priceUsd,
    }: {
      specialtyId: string;
      servicePriceId: string;
      priceUsd: number;
    }) => updateServicePrice(specialtyId, servicePriceId, priceUsd),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['specialties'] }),
  });
}
