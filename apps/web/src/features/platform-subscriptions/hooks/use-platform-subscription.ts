'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usePlatformSession } from '@/features/platform-auth/hooks/use-platform-session';
import { useNotification } from '@/shared/hooks/use-notification';
import { useIdempotentAttempt } from '@/features/platform-shared/use-idempotent-attempt';

import {
  changePlatformContractStatus,
  createPlatformPeriod,
  getPlatformContract,
  registerPlatformPayment,
  updatePlatformContract,
  voidPlatformPayment,
  type ContractUpdateDto,
  type PaymentCreateDto,
  type PeriodCreateDto,
  type StatusChangeDto,
  type SubscriptionHistoryQuery,
} from '../services/platform-subscriptions.service';

// Todas las mutaciones invalidan el contrato y la lista de centros.
export function usePlatformContract(tenantId: string, query: SubscriptionHistoryQuery = {}) {
  return useQuery({
    queryKey: ['platform', 'subscription', tenantId, query],
    queryFn: () => getPlatformContract(tenantId, query),
    placeholderData: keepPreviousData,
    enabled: Boolean(tenantId),
  });
}

function useSubscriptionMutation<TInput>(
  tenantId: string,
  run: (input: TInput, token: string, key: string) => Promise<unknown>,
  successMessage: string,
  idempotent = false,
  operation = 'contract-write',
) {
  const session = usePlatformSession();
  const attempt = useIdempotentAttempt<TInput>(`${operation}:${tenantId}`, session.data?.id, run);
  const queryClient = useQueryClient();
  const notify = useNotification();
  const mutation = useMutation({
    mutationFn: (input: TInput) => {
      const request = idempotent ? attempt.prepare(input) : { payload: input, key: '' };
      return run(request.payload, session.data?.csrfToken ?? '', request.key);
    },
    onSuccess: () => {
      if (idempotent) attempt.succeeded();
      notify.success(successMessage);
      void queryClient.invalidateQueries({
        queryKey: ['platform', 'subscription', tenantId],
      });
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      void queryClient.invalidateQueries({
        queryKey: ['platform', 'dashboard'],
      });
    },
    onError: (error: Error) => {
      if (idempotent) attempt.failed(error);
      notify.error(error.message);
    },
  });
  return {
    ...mutation,
    uncertain: attempt.uncertain,
    retryOriginal: (onSuccess?: () => void) => {
      const original = attempt.retry();
      if (original) mutation.mutate(original.payload, { onSuccess });
    },
  };
}

export function useUpdateContract(tenantId: string) {
  return useSubscriptionMutation<ContractUpdateDto>(
    tenantId,
    (dto, token) => updatePlatformContract(tenantId, dto, token),
    'Contrato actualizado',
  );
}

export function useChangeContractStatus(tenantId: string) {
  return useSubscriptionMutation<StatusChangeDto>(
    tenantId,
    (dto, token) => changePlatformContractStatus(tenantId, dto, token),
    'Estado actualizado',
  );
}

export function useCreatePeriod(tenantId: string) {
  return useSubscriptionMutation<PeriodCreateDto>(
    tenantId,
    (dto, token, key) => createPlatformPeriod(tenantId, dto, key, token),
    'Período creado',
    true,
    'create-period',
  );
}

export function useRegisterPayment(tenantId: string) {
  return useSubscriptionMutation<PaymentCreateDto & { invoiceId: string }>(
    tenantId,
    ({ invoiceId, ...dto }, token, key) =>
      registerPlatformPayment(tenantId, invoiceId, dto, key, token),
    'Pago registrado',
    true,
    'register-payment',
  );
}

export function useVoidPayment(tenantId: string) {
  return useSubscriptionMutation<{ paymentId: string; reason: string }>(
    tenantId,
    ({ paymentId, reason }, token, key) =>
      voidPlatformPayment(tenantId, paymentId, reason, key, token),
    'Pago anulado',
    true,
    'void-payment',
  );
}
