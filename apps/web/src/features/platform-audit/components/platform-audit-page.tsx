'use client';

import { useState } from 'react';

import { usePlatformAudit } from '../services/platform-audit.hooks';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

const PAGE_SIZE = 20;
const ACTIONS = [
  'CREATE',
  'UPDATE',
  'ACTIVATE',
  'DEACTIVATE',
  'STATUS_CHANGE',
  'VOID',
  'LOGOUT',
  'LOGIN_FAILED',
];

export function PlatformAuditPage() {
  const [page, setPage] = useState(1);
  const [tenantId, setTenantId] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const audit = usePlatformAudit({
    page,
    targetTenantId: tenantId.trim() || undefined,
    action: action || undefined,
    entity: entity.trim() || undefined,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to).toISOString() : undefined,
  });
  const totalPages = audit.data ? Math.max(1, Math.ceil(audit.data.total / PAGE_SIZE)) : 1;
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold text-on-surface">Auditoría de plataforma</h1>
        <p className="text-sm text-on-surface-variant">
          Operaciones globales, más recientes primero. Sin credenciales.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-surface p-4 shadow-elevation-1">
        <div className="w-80">
          <Input
            id="auditTenant"
            label="ID de centro"
            value={tenantId}
            onChange={(e) => reset(() => setTenantId(e.target.value))}
          />
        </div>
        <Input
          id="auditEntity"
          label="Entidad"
          value={entity}
          onChange={(e) => reset(() => setEntity(e.target.value))}
        />
        <label className="flex flex-col gap-1 text-sm font-medium text-on-surface">
          Acción
          <select
            className="h-10 rounded-lg border border-outline bg-surface px-3 text-sm"
            value={action}
            onChange={(e) => reset(() => setAction(e.target.value))}
          >
            <option value="">Todas</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <Input
          id="auditFrom"
          label="Desde"
          type="datetime-local"
          value={from}
          onChange={(e) => reset(() => setFrom(e.target.value))}
        />
        <Input
          id="auditTo"
          label="Hasta"
          type="datetime-local"
          value={to}
          onChange={(e) => reset(() => setTo(e.target.value))}
        />
      </div>

      {audit.isError && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container"
        >
          {audit.error.message}
        </p>
      )}

      {audit.isFetching && (
        <p role="status" aria-live="polite">
          Cargando auditoría…
        </p>
      )}
      <div
        aria-busy={audit.isFetching}
        className="overflow-x-auto rounded-xl bg-surface shadow-elevation-1"
      >
        <table className="w-full text-left text-sm">
          <thead className="border-b border-outline text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Entidad</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Campos</th>
              <th className="px-4 py-3">Motivo</th>
              <th className="px-4 py-3">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {audit.data?.items.map((e) => (
              <tr key={e.id} className="border-b border-outline/40">
                <td className="px-4 py-2">{new Date(e.createdAt).toLocaleString('es-VE')}</td>
                <td className="px-4 py-2">
                  {e.actorKind}
                  <br />
                  {e.platformAdminId ?? 'Sin administrador identificado'}
                </td>
                <td className="px-4 py-2">{e.entity}</td>
                <td className="px-4 py-2">{e.action}</td>
                <td className="px-4 py-2 text-on-surface-variant">
                  {e.changedFields.join(', ') || '—'}
                </td>
                <td className="px-4 py-2">{e.reason ?? '—'}</td>
                <td className="px-4 py-2">
                  <details>
                    <summary className="cursor-pointer text-primary">Ver detalle</summary>
                    <dl className="mt-2 space-y-1">
                      <dt>Centro objetivo</dt>
                      <dd>{e.targetTenantId ?? 'Plataforma'}</dd>
                      <dt>ID de entidad</dt>
                      <dd>{e.entityId}</dd>
                      <dt>Resultado</dt>
                      <dd>{e.result}</dd>
                      <dt>Request ID</dt>
                      <dd>{e.requestId ?? '—'}</dd>
                      <dt>Correlation ID</dt>
                      <dd>{e.correlationId ?? '—'}</dd>
                    </dl>
                    <p className="mt-2 font-medium">Valores anteriores</p>
                    <pre className="max-w-md whitespace-pre-wrap break-all text-xs">
                      {JSON.stringify(e.oldValues ?? null, null, 2)}
                    </pre>
                    <p className="mt-2 font-medium">Valores nuevos</p>
                    <pre className="max-w-md whitespace-pre-wrap break-all text-xs">
                      {JSON.stringify(e.newValues ?? null, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
            {audit.data && audit.data.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-on-surface-variant">
                  Sin registros con esos filtros.
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
          disabled={page <= 1 || audit.isFetching}
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
          disabled={page >= totalPages || audit.isFetching}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </Button>
      </nav>
    </section>
  );
}
