import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface AuditLogEntry {
  tenantId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        oldValues: (entry.oldValues ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        newValues: (entry.newValues ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        changedFields: entry.changedFields ?? [],
      },
    });
  }
}
