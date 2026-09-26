'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useNotification } from '@/shared/hooks/use-notification';

import { updateTenantLogo } from '../services/tenant-settings.service';

export function useUpdateTenantLogo() {
  const queryClient = useQueryClient();
  const notification = useNotification();

  return useMutation({
    mutationFn: updateTenantLogo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['config', 'init'],
        refetchType: 'active',
      });
      notification.success('Logo actualizado correctamente');
    },
    onError: (error: Error) => {
      notification.error(error.message);
    },
  });
}
