import { platformAuditTrace } from './platform-audit-context';

import type { PlatformIdentity } from '../auth/platform-auth.service';
import type { Prisma } from '@prisma/client';

export interface PlatformAuditEntry {
  action: string;
  entity: string;
  entityId: string;
  targetTenantId?: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  changedFields: string[];
  reason?: string;
}

// Se llama dentro de la misma transacción que el cambio: si la auditoría falla,
// el cambio se revierte.
export async function writePlatformAudit(
  tx: Prisma.TransactionClient,
  actor: PlatformIdentity,
  entry: PlatformAuditEntry,
): Promise<void> {
  await tx.platformAuditLog.create({
    data: {
      ...platformAuditTrace(),
      actorKind: 'PLATFORM_ADMIN',
      platformAdminId: actor.id,
      targetTenantId: entry.targetTenantId ?? null,
      entity: entry.entity,
      entityId: entry.entityId,
      action: entry.action,
      oldValues: entry.oldValues ?? undefined,
      newValues: entry.newValues ?? undefined,
      changedFields: entry.changedFields,
      reason: entry.reason ?? null,
    },
  });
}
