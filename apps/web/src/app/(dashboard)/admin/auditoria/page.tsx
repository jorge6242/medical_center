'use client';
import { useState } from 'react';
import { useAuditLogs } from '@/features/audit-logs/hooks/use-audit-logs';
import { AuditLogTable } from '@/features/audit-logs/components/audit-log-table';
import { Input } from '@/shared/components/ui/input';

export default function AuditoriaPage() {
  const [filters, setFilters] = useState({ limit: 25 });
  const query = useAuditLogs(filters);
  if (query.isLoading)
    return (
      <main>
        <p>Cargando auditoría…</p>
      </main>
    );
  if (query.isError)
    return (
      <main>
        <p>No tenés permiso para ver la auditoría o ocurrió un error.</p>
      </main>
    );
  const page = query.data;
  if (!page)
    return (
      <main>
        <p>Cargando auditoría…</p>
      </main>
    );
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Auditoría</h1>
      <div className="flex gap-2">
        <Input
          aria-label="Entidad"
          placeholder="Entidad"
          onChange={(event) =>
            setFilters((current) => ({ ...current, entity: event.target.value, cursor: undefined }))
          }
        />
        <Input
          aria-label="Acción"
          placeholder="Acción"
          onChange={(event) =>
            setFilters((current) => ({ ...current, action: event.target.value, cursor: undefined }))
          }
        />
      </div>
      {page.data.length === 0 ? (
        <p>No hay eventos para los filtros seleccionados.</p>
      ) : (
        <AuditLogTable rows={page.data} />
      )}
      <button
        disabled={!page.nextCursor}
        onClick={() =>
          setFilters((current) => ({ ...current, cursor: page.nextCursor ?? undefined }))
        }
      >
        Siguiente
      </button>
    </main>
  );
}
