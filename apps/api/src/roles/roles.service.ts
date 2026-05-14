import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

interface RoleVersionCache {
  version: number;
  expiresAt: number;
}

@Injectable()
export class RolesService {
  private readonly cache = new Map<string, RoleVersionCache>();
  private readonly TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async assertRoleVersionCurrent(roleName: string, jwtVersion: number): Promise<void> {
    const currentVersion = await this.getRoleVersion(roleName);
    if (currentVersion !== jwtVersion) {
      throw new UnauthorizedException('Permisos del rol actualizados. Inicie sesión nuevamente.');
    }
  }

  async getRoleVersion(roleName: string): Promise<number> {
    const cached = this.cache.get(roleName);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.version;
    }

    const roleVersion = await this.prisma.roleVersion.findFirst({
      where: { role: { name: roleName } },
    });

    const version = roleVersion?.version ?? 1;
    this.cache.set(roleName, { version, expiresAt: Date.now() + this.TTL_MS });
    return version;
  }

  invalidateCache(roleName: string): void {
    this.cache.delete(roleName);
  }
}
