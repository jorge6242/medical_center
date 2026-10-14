'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useNotification } from '@/shared/hooks/use-notification';
import { useIdempotentAttempt } from '@/features/platform-shared/use-idempotent-attempt';

import {
  createPlatformTenant,
  setPlatformTenantActivation,
  updatePlatformTenant,
  type TenantActivationDto,
  type TenantCreateDto,
  type TenantUpdateDto,
} from '../services/platform-tenants.service';

// Errores de API llegan como Error(message): se muestran en toast, sin try/catch en componentes.
export function useUpdatePlatformTenant(id: string, csrfToken: string | undefined) {
  const queryClient = useQueryClient();
  const notify = useNotification();
  return useMutation({
    mutationFn: (dto: TenantUpdateDto) => updatePlatformTenant(id, dto, csrfToken ?? ''),
    onSuccess: () => {
      notify.success('Centro actualizado');
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    },
    onError: (error: Error) => notify.error(error.message),
  });
}

export function useSetPlatformTenantActivation(id: string, csrfToken: string | undefined) {
  const queryClient = useQueryClient();
  const notify = useNotification();
  return useMutation({
    mutationFn: (dto: TenantActivationDto) => setPlatformTenantActivation(id, dto, csrfToken ?? ''),
    onSuccess: (tenant) => {
      notify.success(tenant.isActive ? 'Centro activado' : 'Centro desactivado');
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    },
    onError: (error: Error) => notify.error(error.message),
  });
}

export function useCreatePlatformTenant(csrfToken: string | undefined, actorId?: string) {
  const attempt = useIdempotentAttempt<TenantCreateDto>(
    'create-tenant',
    actorId,
    (dto, token, key) => createPlatformTenant(dto, key, token),
  );
  const queryClient = useQueryClient();
  const notify = useNotification();
  const mutation = useMutation({
    mutationFn: (dto: TenantCreateDto) => {
      const original = attempt.prepare(dto);
      return createPlatformTenant(original.payload, original.key, csrfToken ?? '');
    },
    onSuccess: () => {
      attempt.succeeded();
      notify.success('Centro creado');
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    },
    onError: (error: Error) => {
      attempt.failed(error);
      notify.error(error.message);
    },
  });
  return {
    ...mutation,
    uncertain: attempt.uncertain,
    retryOriginal: (
      onSuccess?: (result: Awaited<ReturnType<typeof createPlatformTenant>>) => void,
    ) => {
      const original = attempt.retry();
      if (original) mutation.mutate(original.payload, { onSuccess });
    },
  };
}
