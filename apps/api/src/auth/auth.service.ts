import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../database/prisma.service';

import type { AuthResponseDto } from './dto/auth-response.dto';
import type { LoginDto } from './dto/login.dto';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<{ token: string; response: AuthResponseDto }> {
    const where: Prisma.UserWhereInput = {
      email: dto.email,
      isActive: true,
      tenant: {
        isActive: true,
        slug: dto.tenantSlug,
      },
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
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const user = users[0];

    if (!user || !user.role) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
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
}
