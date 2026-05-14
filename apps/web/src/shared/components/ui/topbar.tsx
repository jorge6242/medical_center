'use client';

import { useRouter } from 'next/navigation';

import { useMutation } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';

import { logout } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

import { Button } from './button';

export function Topbar() {
  const router = useRouter();
  const { email, role, clearAuth } = useAuthStore();

  const { mutate: doLogout, isPending } = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearAuth();
      router.push('/login');
    },
  });

  return (
    <header className="flex h-14 items-center justify-between border-b border-outline-variant bg-surface px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-on-surface">{email}</p>
          <p className="text-xs text-on-surface-variant capitalize">{role}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          isLoading={isPending}
          onClick={() => doLogout()}
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
