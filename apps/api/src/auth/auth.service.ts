import { createHash, randomBytes } from 'node:crypto';

import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { TraceWriter } from '../audit-log/trace-writer';
import { PrismaService } from '../database/prisma.service';

import type { AuthResponseDto } from './dto/auth-response.dto';
import type { BootstrapAccessLinkDto } from './dto/bootstrap-access-link.dto';
import type { CreateAccessLinkDto } from './dto/create-access-link.dto';
import type { LoginDto } from './dto/login.dto';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly traceWriter?: TraceWriter,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<{ token: string; response: AuthResponseDto }> {
    const context = await this.resolveContextToken(dto.contextToken);
    const where: Prisma.UserWhereInput = {
      email: dto.email,
      tenantId: context.tenantId,
      isActive: true,
      tenant: { isActive: true },
    };

    const users = await this.prisma.user.findMany({
      where,
      take: 2,
      include: {
        role: {
          include: {
            permissions: true,
            version: true,
          },
        },
        doctor: true,
      },
    });

    if (users.length !== 1) {
      await this.traceWriter?.write(
        {
          event: 'LOGIN_FAILED',
          tenantId: context.tenantId,
          level: 'WARN',
          metadata: { reason: 'invalid_credentials' },
        },
        this.prisma,
      );
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const user = users[0];

    if (!user || !user.role) {
      const failedTenantId = user?.tenantId ?? context.tenantId;
      if (failedTenantId) {
        await this.traceWriter?.write(
          {
            event: 'LOGIN_FAILED',
            tenantId: failedTenantId,
            level: 'WARN',
            metadata: { reason: 'invalid_role' },
          },
          this.prisma,
        );
      }
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.traceWriter?.write(
        {
          event: 'LOGIN_FAILED',
          tenantId: user.tenantId,
          level: 'WARN',
          metadata: { reason: 'invalid_password' },
        },
        this.prisma,
      );
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const roleVersion = user.role.version?.version ?? 1;

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role.name,
      doctorId: user.doctor?.id ?? null,
      permissions: user.role.permissions.map((p) => ({
        resource: p.resource,
        action: p.action,
      })),
      roleVersion,
    };

    const token = this.jwtService.sign(payload);

    const response: AuthResponseDto = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
      roleVersion,
      doctorId: payload.doctorId,
      permissions: payload.permissions,
    };

    return { token, response };
  }

  async resolveAccessContext(accessToken: string) {
    const link = await this.prisma.tenantAccessLink.findFirst({
      where: {
        tokenHash: this.hashToken(accessToken),
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        tenant: { isActive: true },
      },
      include: { tenant: true },
    });
    if (!link)
      throw new UnauthorizedException('Link de acceso inválido o expirado');

    await this.prisma.tenantAccessLink.update({
      where: { id: link.id },
      data: { lastUsedAt: new Date() },
    });

    const contextToken = this.jwtService.sign(
      { purpose: 'tenant_access', tenantId: link.tenantId, linkId: link.id },
      { expiresIn: '10m' },
    );

    return {
      contextToken,
      tenant: {
        name: link.tenant.name,
        slug: link.tenant.slug,
        logoUrl: link.tenant.logoUrl,
      },
    };
  }

  async createAccessLink(
    tenantId: string,
    createdById: string,
    dto: CreateAccessLinkDto,
  ) {
    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
      : null;
    const link = await this.prisma.tenantAccessLink.create({
      data: {
        tenantId,
        createdById,
        tokenHash: this.hashToken(rawToken),
        expiresAt,
      },
    });

    return { id: link.id, accessToken: rawToken, expiresAt: link.expiresAt };
  }

  async revokeAccessLink(tenantId: string, linkId: string): Promise<void> {
    const result = await this.prisma.tenantAccessLink.updateMany({
      where: { id: linkId, tenantId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0)
      throw new NotFoundException('Link de acceso no encontrado');
  }

  async bootstrapAccessLink(dto: BootstrapAccessLinkDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: dto.tenantSlug, isActive: true },
      select: {
        id: true,
        users: {
          where: { isActive: true, role: { name: 'admin', isActive: true } },
          select: { id: true },
          take: 1,
        },
      },
    });
    const createdById = tenant?.users[0]?.id;
    if (!tenant || !createdById) {
      throw new NotFoundException('Tenant o administrador no encontrado');
    }
    return this.createAccessLink(tenant.id, createdById, dto);
  }

  private async resolveContextToken(
    contextToken: string,
  ): Promise<{ tenantId: string; linkId: string }> {
    let payload: { purpose?: string; tenantId?: string; linkId?: string };
    try {
      payload = this.jwtService.verify(contextToken);
    } catch {
      throw new UnauthorizedException('Contexto de tenant inválido o expirado');
    }
    if (
      payload.purpose !== 'tenant_access' ||
      !payload.tenantId ||
      !payload.linkId
    ) {
      throw new UnauthorizedException('Contexto de tenant inválido');
    }

    const link = await this.prisma.tenantAccessLink.findFirst({
      where: {
        id: payload.linkId,
        tenantId: payload.tenantId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        tenant: { isActive: true },
      },
      select: { tenantId: true },
    });
    if (!link)
      throw new UnauthorizedException('Link de acceso inválido o expirado');
    return { tenantId: link.tenantId, linkId: payload.linkId };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
