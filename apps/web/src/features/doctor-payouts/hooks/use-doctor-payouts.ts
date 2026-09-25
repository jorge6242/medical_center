'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createDoctorPayout,
  getDoctorPayout,
  getDoctorPayouts,
  getDoctors,
  getPendingDoctorPayout,
  voidDoctorPayout,
} from '../services/doctor-payouts.service';

import type { DoctorPayout } from '../services/doctor-payouts.service';

export function usePayoutDoctors() {
  return useQuery({ queryKey: ['doctor-payout-doctors'], queryFn: getDoctors });
}

export function usePendingDoctorPayout(doctorId: string) {
  return useQuery({
    queryKey: ['doctor-payout-pending', doctorId],
    queryFn: () => getPendingDoctorPayout(doctorId),
    enabled: Boolean(doctorId),
  });
}

export function useDoctorPayouts() {
  return useQuery({ queryKey: ['doctor-payouts'], queryFn: getDoctorPayouts });
}

export function useDoctorPayout(id: string) {
  return useQuery({
    queryKey: ['doctor-payout', id],
    queryFn: () => getDoctorPayout(id),
    enabled: Boolean(id),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });
}

export function useCreateDoctorPayout(onSuccess?: (payout: DoctorPayout) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDoctorPayout,
    onSuccess: (payout) => {
      void queryClient.invalidateQueries({ queryKey: ['doctor-payouts'] });
      void queryClient.invalidateQueries({ queryKey: ['doctor-payout-pending'] });
      onSuccess?.(payout);
    },
  });
}

export function useVoidDoctorPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => voidDoctorPayout(id, reason),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['doctor-payouts'] }),
  });
}
