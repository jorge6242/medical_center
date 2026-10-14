import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { validateWebSlug } from './tenant-web-slug';
import { PrismaService } from '../../database/prisma.service';
import { writePlatformAudit } from '../audit/platform-audit';

import type { PlatformIdentity } from '../auth/platform-auth.service';
import type { Prisma } from '@prisma/client';

// Sólo campos operativos: nunca pacientes, consultas ni datos clínicos.
export const TENANT_SELECT = {
  id: true,
  name: true,
  slug: true,
  webSlug: true,
  email: true,
  isActive: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} as const;

const VERSION_CONFLICT = 'El centro cambió; recargá antes de guardar';
const UNIQUE_VIOLATION = 'P2002';

export interface TenantListQuery {
  page: number;
  limit: number;
  name?: string;
  slug?: string;
  isActive?: boolean;
}

export interface TenantUpdateInput {
  name?: string;
  email?: string | null;
  webSlug?: string;
  expectedVersion: number;
}

export interface TenantActivationInput {
  isActive: boolean;
  reason: string;
  expectedVersion: number;
}

export type TenantRecord = Prisma.TenantGetPayload<{
  select: typeof TENANT_SELECT;
}>;

@Injectable()
export class PlatformTenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: TenantListQuery) {
    const where = buildListWhere(query);
    const [items, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        select: TENANT_SELECT,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.tenant.count({ where }),
    ]);
    return { items, page: query.page, limit: query.limit, total };
  }

  async findOne(id: string): Promise<TenantRecord> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: TENANT_SELECT,
    });
    if (!tenant) throw new NotFoundException('Centro no encontrado');
    return tenant;
  }

  async update(
    actor: PlatformIdentity,
    id: string,
    input: TenantUpdateInput,
  ): Promise<TenantRecord> {
    const current = await this.findOne(id);
    assertExpectedVersion(current.version, input.expectedVersion);
    const changes = buildChanges(input);

    await this.runGuardedWrite(
      id,
      input.expectedVersion,
      changes,
      async (tx) => {
        await writePlatformAudit(tx, actor, {
          action: 'UPDATE',
          entity: 'Tenant',
          entityId: id,
          targetTenantId: id,
          oldValues: pick(
            current,
            Object.keys(changes),
          ) as Prisma.InputJsonObject,
          newValues: changes as Prisma.InputJsonObject,
          changedFields: Object.keys(changes),
        });
      },
    );
    return this.findOne(id);
  }

  async setActivation(
    actor: PlatformIdentity,
    id: string,
    input: TenantActivationInput,
  ): Promise<TenantRecord> {
    const reason = input.reason.trim();
    if (!reason) throw new BadRequestException('El motivo es obligatorio');

    const current = await this.findOne(id);
    assertExpectedVersion(current.version, input.expectedVersion);
    if (current.isActive === input.isActive) {
      throw new ConflictException('El centro ya está en ese estado');
    }

    const changes = { isActive: input.isActive };
    await this.runGuardedWrite(
      id,
      input.expectedVersion,
      changes,
      async (tx) => {
        await writePlatformAudit(tx, actor, {
          action: input.isActive ? 'ACTIVATE' : 'DEACTIVATE',
          entity: 'Tenant',
          entityId: id,
          targetTenantId: id,
          oldValues: { isActive: current.isActive },
          newValues: changes,
          changedFields: ['isActive'],
          reason,
        });
      },
    );
    return this.findOne(id);
  }

  // Escritura con guarda de versión: si otro cambio ganó la carrera, no se escribe nada.
  private async runGuardedWrite(
    id: string,
    expectedVersion: number,
    changes: Record<string, unknown>,
    audit: (tx: Prisma.TransactionClient) => Promise<void>,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const result = await tx.tenant.updateMany({
          where: { id, version: expectedVersion },
          data: { ...changes, version: { increment: 1 } },
        });
        if (result.count === 0) throw new ConflictException(VERSION_CONFLICT);
        await audit(tx);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('El webSlug ya está en uso');
      }
      throw error;
    }
  }
}

function buildListWhere(query: TenantListQuery): Prisma.TenantWhereInput {
  const where: Prisma.TenantWhereInput = {};
  if (query.name) where.name = { contains: query.name, mode: 'insensitive' };
  if (query.slug) where.slug = { contains: query.slug, mode: 'insensitive' };
  if (query.isActive !== undefined) where.isActive = query.isActive;
  return where;
}

function buildChanges(input: TenantUpdateInput): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  if (input.name !== undefined) changes['name'] = input.name.trim();
  if (input.email !== undefined) changes['email'] = input.email;
  if (input.webSlug !== undefined)
    changes['webSlug'] = validateWebSlug(input.webSlug);
  if (Object.keys(changes).length === 0) {
    throw new BadRequestException('No hay cambios para guardar');
  }
  return changes;
}

function assertExpectedVersion(current: number, expected: number): void {
  if (current !== expected) throw new ConflictException(VERSION_CONFLICT);
}

function pick(record: TenantRecord, keys: string[]): Record<string, unknown> {
  const source = record as unknown as Record<string, unknown>;
  return Object.fromEntries(keys.map((key) => [key, source[key]]));
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}
