'use client';

import Link from 'next/link';
import { useState } from 'react';

import { usePlatformTenants } from '../hooks/use-platform-tenants';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

const PAGE_SIZE = 20;

export function PlatformTenantsList() {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'true' | 'false' | ''>('');
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error } = usePlatformTenants({
    page,
    name: name.trim() || undefined,
    isActive: status,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Centros médicos</h1>
          <p className="text-sm text-on-surface-variant">
            Altas, datos operativos y estado de acceso
          </p>
        </div>
        <Link href="/platform/tenants/nuevo">
          <Button>Nuevo centro</Button>
        </Link>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-surface p-4 shadow-elevation-1">
        <div className="w-72">
          <Input
            id="tenant-name"
            label="Buscar por nombre"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium text-on-surface">
          Estado
          <select
            className="h-10 rounded-lg border border-outline bg-surface px-3 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as 'true' | 'false' | '');
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </label>
      </div>

      {isError && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container"
        >
          {error.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl bg-surface shadow-elevation-1">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-outline text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Web</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {isPending && (
              <tr>
                <td className="px-4 py-6 text-on-surface-variant" colSpan={4}>
                  Cargando centros…
                </td>
              </tr>
            )}
            {data?.items.map((tenant) => (
              <tr key={tenant.id} className="border-b border-outline/40 hover:bg-surface-variant">
                <td className="px-4 py-3">
                  <Link
                    className="font-medium text-primary hover:underline"
                    href={`/platform/tenants/${tenant.id}`}
                  >
                    {tenant.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{tenant.slug}</td>
                <td className="px-4 py-3 text-on-surface-variant">{tenant.webSlug ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={tenant.isActive ? 'text-primary' : 'text-error'}>
                    {tenant.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-on-surface-variant" colSpan={4}>
                  No hay centros con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <nav className="flex items-center justify-end gap-3 text-sm" aria-label="Paginación">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </Button>
        <span className="text-on-surface-variant">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </Button>
      </nav>
    </section>
  );
}
