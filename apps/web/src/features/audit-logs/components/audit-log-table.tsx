'use client';
import type { AuditLogDto } from '@centro-medico/shared';

export function AuditLogTable({ rows }: { rows: AuditLogDto[] }) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Acción</th>
            <th>Entidad</th>
            <th>Resultado</th>
            <th>Correlación</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{new Date(row.createdAt).toLocaleString()}</td>
              <td>{row.action}</td>
              <td>{row.entity}</td>
              <td>{row.result}</td>
              <td>{row.correlationId ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
