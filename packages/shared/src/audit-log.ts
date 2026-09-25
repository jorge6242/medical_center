export type AuditResult = 'SUCCESS' | 'FAILURE';
export interface AuditLogFilters {
  from?: string;
  to?: string;
  actorId?: string;
  action?: string;
  entity?: string;
  result?: AuditResult;
  correlationId?: string;
  cursor?: string;
  limit?: number;
}
export interface AuditLogDto {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedFields: string[];
  result: AuditResult;
  correlationId: string | null;
  requestId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
export interface AuditLogPage {
  data: AuditLogDto[];
  nextCursor: string | null;
}
