import { Injectable, Logger } from '@nestjs/common';
import { type Prisma, type PrismaClient } from '@prisma/client';

import { redact } from './audit-redactor';

export interface TraceEntry {
  event: string;
  level?: string;
  tenantId: string;
  userId?: string;
  correlationId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class TraceWriter {
  private readonly logger = new Logger(TraceWriter.name);
  constructor() {}

  async write(entry: TraceEntry, prisma?: PrismaClient): Promise<void> {
    try {
      if (!prisma) return;
      await prisma.traceLog.create({
        data: {
          event: entry.event,
          level: entry.level ?? 'INFO',
          tenantId: entry.tenantId,
          userId: entry.userId ?? null,
          correlationId: entry.correlationId ?? null,
          route: entry.route ?? null,
          method: entry.method ?? null,
          statusCode: entry.statusCode ?? null,
          durationMs: entry.durationMs ?? null,
          metadata: redact(entry.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Trace write failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  async prune(prisma: PrismaClient, retentionDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await prisma.traceLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return result.count;
  }
}
