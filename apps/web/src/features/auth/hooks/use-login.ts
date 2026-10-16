'use client';

import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/auth.store';

import { login } from '../services/auth.service';

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data);
      void queryClient.invalidateQueries({ queryKey: ['config', 'init'] });
      const redirect = searchParams.get('redirect');
      const isLocalPath =
        redirect !== null &&
        redirect.startsWith('/') &&
        !redirect.startsWith('//') &&
        !/[\\\u0000-\u0020]/.test(redirect);
      router.replace(isLocalPath ? redirect : '/inicio');
    },
  });
}
