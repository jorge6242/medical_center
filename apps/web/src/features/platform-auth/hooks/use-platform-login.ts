'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PLATFORM_SESSION_KEY } from './use-platform-session';
import { platformLogin } from '../services/platform-auth.service';

export function usePlatformLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: platformLogin,
    onSuccess: (session) => {
      queryClient.setQueryData(PLATFORM_SESSION_KEY, session);
      router.replace(searchParams.get('redirect') ?? '/platform');
    },
  });
}
