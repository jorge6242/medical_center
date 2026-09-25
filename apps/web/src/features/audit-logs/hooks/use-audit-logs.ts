import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../services/audit-logs.service';
import type { AuditLogFilters } from '@centro-medico/shared';

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({ queryKey: ['audit-logs', filters], queryFn: () => getAuditLogs(filters) });
}
