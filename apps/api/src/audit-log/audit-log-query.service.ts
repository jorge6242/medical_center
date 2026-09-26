import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';

import { RequestContextService } from '../common/context';
import { PrismaService } from '../database/prisma.service';

import type { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Injectable()
export class AuditLogQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  async list(query: AuditLogQueryDto) {
    const { tenantId } = this.context.requireTenant();
    const where: Prisma.AuditLogWhereInput = {
      tenantId,
      userId: query.actorId,
      action: query.action,
      entity: query.entity,
      result: query.result,
      correlationId: query.correlationId,
      createdAt:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            }
          : undefined,
    };
    const rows = await this.prisma.auditLog.findMany({
      where,
      take: query.limit + 1,
      skip: query.cursor ? 1 : undefined,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    const hasMore = rows.length > query.limit;
    const data = rows
      .slice(0, query.limit)
      .map(({ tenantId: _tenant, ...row }) => row);
    return {
      data,
      nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
    };
  }
}
