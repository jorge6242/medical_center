import { apiJson } from '@/config/api';
import type { AuditLogFilters, AuditLogPage } from '@centro-medico/shared';

export async function getAuditLogs(filters: AuditLogFilters): Promise<AuditLogPage> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return apiJson<AuditLogPage>(`/audit-logs?${params.toString()}`);
}
