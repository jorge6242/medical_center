'use client';

import { useEffect } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { usePlatformLogout } from '../hooks/use-platform-logout';
import { usePlatformSession } from '../hooks/use-platform-session';
import { ThemeSwitch } from '@/shared/design-system/theme-controls';
import { Button } from '@/shared/components/ui/button';
import { PlatformPendingOperations } from '@/features/platform-shared/platform-pending-operations';

export function PlatformShell({ children }: { readonly children: React.ReactNode }) {
  const router = useRouter();
  const session = usePlatformSession();
  const logout = usePlatformLogout(session.data?.csrfToken);

  useEffect(() => {
    if (session.isError)
      router.replace(`/platform/login?redirect=${encodeURIComponent(window.location.pathname)}`);
  }, [session.isError, router]);

  if (session.isPending || session.isError) {
    return (
      <p role="status" aria-live="polite" className="p-6 text-sm text-on-surface-variant">
        Validando sesión…
      </p>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-variant">
      <header className="flex items-center justify-between bg-surface px-6 py-4 shadow-elevation-1">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm font-medium text-primary">Plataforma</p>
            <p className="text-xs text-on-surface-variant">{session.data.name}</p>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link className="text-on-surface hover:text-primary" href="/platform">
              Inicio
            </Link>
            <Link className="text-on-surface hover:text-primary" href="/platform/tenants">
              Centros
            </Link>
            <Link className="text-on-surface hover:text-primary" href="/platform/auditoria">
              Auditoría
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ThemeSwitch />
          <Button
            variant="outline"
            size="sm"
            isLoading={logout.isPending}
            onClick={() => logout.mutate()}
          >
            Cerrar sesión
          </Button>
        </div>
      </header>
      <PlatformPendingOperations actorId={session.data.id} csrfToken={session.data.csrfToken} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
