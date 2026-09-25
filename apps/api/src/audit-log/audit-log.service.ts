import { Injectable } from '@nestjs/common';
import { type Prisma, type PrismaClient } from '@prisma/client';

import { type AuditWriter } from './audit-writer';
import { type RequestContextService } from '../common/context';

export interface AuditLogEntry {
  tenantId?: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
  result?: 'SUCCESS' | 'FAILURE';
  correlationId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  constructor(
    private readonly writer: AuditWriter,
    private readonly requestContext: RequestContextService,
  ) {}

  log(entry: AuditLogEntry, db?: Prisma.TransactionClient | PrismaClient) {
    const context = this.requestContext.getStore();
    return this.writer.write(
      {
        ...entry,
        tenantId: context?.tenantId ?? entry.tenantId,
        userId: entry.userId ?? context?.userId,
        correlationId: entry.correlationId ?? context?.correlationId,
        requestId: entry.requestId ?? context?.requestId,
      },
      db,
    );
  }
}
