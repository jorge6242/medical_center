'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getDoctors, getDoctorServicePrices } from '../services/doctors.service';
import {
  createPayment,
  createPaymentAdjustment,
  getPayments,
  voidPayment,
} from '../services/payments.service';

export function usePayments() {
  return useQuery({ queryKey: ['payments'], queryFn: getPayments });
}

export function useDoctors() {
  return useQuery({ queryKey: ['doctors'], queryFn: getDoctors });
}

export function useDoctorServicePrices(doctorId: string | null) {
  return useQuery({
    queryKey: ['doctor-service-prices', doctorId],
    queryFn: () => {
      if (!doctorId) throw new Error('doctorId required');
      return getDoctorServicePrices(doctorId);
    },
    enabled: !!doctorId,
  });
}

export function useCreatePayment(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
      onSuccess?.();
    },
  });
}

export function useVoidPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voidPayment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useCreatePaymentAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof createPaymentAdjustment>[1] }) =>
      createPaymentAdjustment(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}
