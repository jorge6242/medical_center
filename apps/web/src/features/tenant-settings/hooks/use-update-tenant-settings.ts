'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useNotification } from '@/shared/hooks/use-notification';

import { updateTenantSettings } from '../services/tenant-settings.service';

export function useUpdateTenantSettings() {
  const queryClient = useQueryClient();
  const notification = useNotification();

  return useMutation({
    mutationFn: updateTenantSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['config', 'init'] });
      notification.success('Configuración del centro actualizada correctamente');
    },
    onError: (error: Error) => notification.error(error.message),
  });
}
