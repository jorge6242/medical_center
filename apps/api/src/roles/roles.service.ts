import { Injectable, UnauthorizedException } from '@nestjs/common';

import { ASSIGNABLE_USER_ROLE_NAMES } from './managed-roles';
import { PrismaService } from '../database/prisma.service';

import type { RoleResponseDto } from './dto/role-response.dto';

interface RoleVersionCache {
  version: number;
  expiresAt: number;
}

@Injectable()
export class RolesService {
  private readonly cache = new Map<string, RoleVersionCache>();
  private readonly TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async assertRoleVersionCurrent(
    tenantId: string,
    roleName: string,
    jwtVersion: number,
  ): Promise<void> {
    const currentVersion = await this.getRoleVersion(tenantId, roleName);
    if (currentVersion !== jwtVersion) {
      throw new UnauthorizedException(
        'Permisos del rol actualizados. Inicie sesión nuevamente.',
      );
    }
  }

  async getRoleVersion(tenantId: string, roleName: string): Promise<number> {
    const cacheKey = this.getCacheKey(tenantId, roleName);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.version;
    }

    const roleVersion = await this.prisma.roleVersion.findFirst({
      where: { role: { tenantId, name: roleName } },
    });

    const version = roleVersion?.version ?? 1;
    this.cache.set(cacheKey, { version, expiresAt: Date.now() + this.TTL_MS });
    return version;
  }

  invalidateCache(tenantId: string, roleName: string): void {
    this.cache.delete(this.getCacheKey(tenantId, roleName));
  }

  async findAllRoles(tenantId: string): Promise<RoleResponseDto[]> {
    return this.prisma.role.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        permissions: { select: { id: true, resource: true, action: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAssignableRoles(tenantId: string): Promise<RoleResponseDto[]> {
    return this.prisma.role.findMany({
      where: {
        tenantId,
        isActive: true,
        name: { in: [...ASSIGNABLE_USER_ROLE_NAMES] },
      },
      select: {
        id: true,
        name: true,
        permissions: { select: { id: true, resource: true, action: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  private getCacheKey(tenantId: string, roleName: string): string {
    return `${tenantId}:${roleName}`;
  }
}
