import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import type { Prisma } from '@prisma/client';

export interface PlatformAuditQuery {
  page: number;
  limit: number;
  targetTenantId?: string;
  entity?: string;
  action?: string;
  from?: string;
  to?: string;
}

// Sólo lectura de PlatformAuditLog. Nunca expone credenciales ni sesiones.
const AUDIT_SELECT = {
  id: true,
  actorKind: true,
  platformAdminId: true,
  targetTenantId: true,
  entity: true,
  entityId: true,
  action: true,
  oldValues: true,
  newValues: true,
  changedFields: true,
  result: true,
  reason: true,
  requestId: true,
  correlationId: true,
  createdAt: true,
} as const;

@Injectable()
export class PlatformAuditQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PlatformAuditQuery) {
    const where = buildWhere(query);
    const [items, total] = await Promise.all([
      this.prisma.platformAuditLog.findMany({
        where,
        select: AUDIT_SELECT,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.platformAuditLog.count({ where }),
    ]);
    return { items, page: query.page, limit: query.limit, total };
  }
}

function buildWhere(
  query: PlatformAuditQuery,
): Prisma.PlatformAuditLogWhereInput {
  const where: Prisma.PlatformAuditLogWhereInput = {};
  if (query.targetTenantId) where.targetTenantId = query.targetTenantId;
  if (query.entity) where.entity = query.entity;
  if (query.action) where.action = query.action;

  const from = query.from ? new Date(query.from) : undefined;
  const to = query.to ? new Date(query.to) : undefined;
  if (from && to && from.getTime() > to.getTime()) {
    throw new BadRequestException('from no puede ser posterior a to');
  }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }
  return where;
}
