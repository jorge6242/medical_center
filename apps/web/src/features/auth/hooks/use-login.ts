'use client';

import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/auth.store';

import { login } from '../services/auth.service';

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data);
      router.replace(searchParams.get('redirect') ?? '/inicio');
    },
  });
}
