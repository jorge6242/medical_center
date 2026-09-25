import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@prisma/client';

import { isCatalogedAction } from './audit-catalog';
import { redact } from './audit-redactor';

import type { AuditLogEntry } from './audit-log.service';

function json(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === undefined
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue);
}

export function canonicalAuditPayload(entry: AuditLogEntry): string {
  return JSON.stringify({
    tenantId: entry.tenantId ?? null,
    userId: entry.userId ?? null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    oldValues: redact(entry.oldValues ?? null),
    newValues: redact(entry.newValues ?? null),
    changedFields: [...(entry.changedFields ?? [])].sort(),
    result: entry.result ?? 'SUCCESS',
    correlationId: entry.correlationId ?? null,
    requestId: entry.requestId ?? null,
    metadata: redact(entry.metadata ?? null),
  });
}

@Injectable()
export class AuditWriter {
  async write(
    entry: AuditLogEntry,
    db?: Prisma.TransactionClient | PrismaClient,
  ): Promise<void> {
    if (!isCatalogedAction(entry.action, entry.entity) || !entry.tenantId)
      return;
    const client = db;
    if (!client) return;
    const oldValues = redact(entry.oldValues ?? null);
    const newValues = redact(entry.newValues ?? null);
    const metadata = redact(entry.metadata ?? null);
    const integrityHash = createHash('sha256')
      .update(canonicalAuditPayload(entry))
      .digest('hex');
    await client.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        oldValues: json(oldValues),
        newValues: json(newValues),
        changedFields: entry.changedFields ?? [],
        result: entry.result ?? 'SUCCESS',
        correlationId: entry.correlationId ?? null,
        requestId: entry.requestId ?? null,
        metadata: json(metadata),
        integrityHash,
      },
    });
  }
}
