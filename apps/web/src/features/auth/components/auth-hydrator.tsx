'use client';

import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { apiJson } from '@/config/api';
import { useAuthStore } from '@/stores/auth.store';

interface MeResponse {
  userId: string;
  email: string;
  role: string;
  roleVersion: number;
  doctorId: string | null;
  permissions: Array<{ resource: string; action: string }>;
}

export function AuthHydrator() {
  const permissions = useAuthStore((s) => s.permissions);
  const setAuth = useAuthStore((s) => s.setAuth);

  const { data } = useQuery<MeResponse>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiJson<MeResponse>('/auth/me'),
    enabled: permissions.length === 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (data) {
      setAuth({ userId: data.userId, email: data.email, role: data.role, doctorId: data.doctorId, permissions: data.permissions });
    }
  }, [data, setAuth]);

  return null;
}
