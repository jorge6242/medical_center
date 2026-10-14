'use client';

import { useRouter } from 'next/navigation';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { platformLogout } from '../services/platform-auth.service';

export function usePlatformLogout(csrfToken: string | undefined) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => platformLogout(csrfToken ?? ''),
    // Limpia sólo la caché de plataforma; no toca la sesión tenant.
    onSettled: () => {
      queryClient.removeQueries({ queryKey: ['platform'] });
      router.replace('/platform/login');
    },
  });
}
