import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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

  async login(dto: LoginDto): Promise<{ token: string; response: AuthResponseDto }> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
      include: {
        role: {
          include: {
            permissions: true,
            version: true,
          },
        },
      },
    });

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
      permissions: user.role.permissions.map((p) => ({
        resource: p.resource,
        action: p.action,
      })),
      roleVersion,
    };

    const token = this.jwtService.sign(payload);

    const response: AuthResponseDto = {
      role: user.role.name,
      roleVersion,
      permissions: payload.permissions,
    };

    return { token, response };
  }
}
