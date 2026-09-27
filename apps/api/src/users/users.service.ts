import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../database/prisma.service';
import {
  ASSIGNABLE_USER_ROLE_NAMES,
  MANAGED_USER_ROLE_NAMES,
} from '../roles/managed-roles';

import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user-role.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      include: { role: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => this.toResponse(user));
  }

  async create(tenantId: string, dto: CreateUserDto) {
    const role = await this.prisma.role.findFirst({
      where: {
        id: dto.roleId,
        tenantId,
        isActive: true,
        name: { in: [...MANAGED_USER_ROLE_NAMES] },
      },
    });
    if (!role)
      throw new NotFoundException('Rol no disponible para este tenant');

    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (existing)
      throw new ConflictException('Ya existe un usuario con ese email');

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        name: dto.name,
        lastName: dto.lastName,
        identificationNumber: dto.identificationNumber,
        passwordHash: await bcrypt.hash(dto.password, 10),
        roleId: role.id,
      },
      include: { role: { select: { id: true, name: true } } },
    });
    await this.auditLog.log(
      {
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
        tenantId,
        newValues: {
          email: user.email,
          name: user.name,
          lastName: user.lastName,
          role: role.name,
        },
        changedFields: ['email', 'name', 'lastName', 'role'],
      },
      this.prisma,
    );
    return this.toResponse(user);
  }

  async deactivate(tenantId: string, id: string) {
    const result = await this.prisma.user.updateMany({
      where: { id, tenantId, isActive: true, role: { name: { not: 'admin' } } },
      data: { isActive: false },
    });
    if (result.count === 0)
      throw new NotFoundException('Usuario no encontrado');

    const user = await this.prisma.user.findFirstOrThrow({
      where: { id, tenantId },
      include: { role: { select: { id: true, name: true } } },
    });
    await this.auditLog.log(
      {
        action: 'DEACTIVATE',
        entity: 'User',
        entityId: user.id,
        tenantId,
        newValues: { isActive: false },
        changedFields: ['isActive'],
      },
      this.prisma,
    );
    return this.toResponse(user);
  }

  async update(
    tenantId: string,
    actorId: string,
    id: string,
    dto: UpdateUserDto,
  ) {
    if (id === actorId)
      throw new ConflictException('No podés modificar tu propio rol');

    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, isActive: true },
      include: { role: { select: { id: true, name: true } } },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    await this.ensureEmailIsAvailable(tenantId, id, dto.email);

    const role = await this.prisma.role.findFirst({
      where: {
        id: dto.roleId,
        tenantId,
        isActive: true,
        name: { in: [...ASSIGNABLE_USER_ROLE_NAMES] },
      },
    });
    if (!role)
      throw new NotFoundException('Rol no disponible para este tenant');

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: dto.name,
        lastName: dto.lastName,
        identificationNumber: dto.identificationNumber || null,
        email: dto.email,
        roleId: role.id,
        ...(dto.password
          ? { passwordHash: await bcrypt.hash(dto.password, 10) }
          : {}),
      },
      include: { role: { select: { id: true, name: true } } },
    });
    await this.auditLog.log(
      {
        action: 'UPDATE',
        entity: 'User',
        entityId: updatedUser.id,
        tenantId,
        oldValues: this.getAuditedValues(user),
        newValues: this.getAuditedValues(updatedUser),
        changedFields: this.getChangedFields(user, updatedUser),
      },
      this.prisma,
    );
    return this.toResponse(updatedUser);
  }

  private async ensureEmailIsAvailable(
    tenantId: string,
    userId: string,
    email: string,
  ): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
    if (existingUser && existingUser.id !== userId)
      throw new ConflictException('Ya existe un usuario con ese email');
  }

  private getAuditedValues(user: {
    email: string;
    name: string;
    lastName: string | null;
    identificationNumber: string | null;
    role: { name: string } | null;
  }) {
    return {
      email: user.email,
      name: user.name,
      lastName: user.lastName,
      identificationNumber: user.identificationNumber,
      role: user.role?.name,
    };
  }

  private getChangedFields(
    currentUser: {
      email: string;
      name: string;
      lastName: string | null;
      identificationNumber: string | null;
      role: { name: string } | null;
    },
    updatedUser: {
      email: string;
      name: string;
      lastName: string | null;
      identificationNumber: string | null;
      role: { name: string } | null;
    },
  ): string[] {
    const currentValues = this.getAuditedValues(currentUser);
    const updatedValues = this.getAuditedValues(updatedUser);
    return Object.keys(currentValues).filter(
      (field) =>
        currentValues[field as keyof typeof currentValues] !==
        updatedValues[field as keyof typeof updatedValues],
    );
  }

  private toResponse(user: {
    id: string;
    email: string;
    name: string;
    lastName: string | null;
    identificationNumber: string | null;
    isActive: boolean;
    createdAt: Date;
    role: { id: string; name: string } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      lastName: user.lastName,
      identificationNumber: user.identificationNumber,
      isActive: user.isActive,
      createdAt: user.createdAt,
      role: user.role,
    };
  }
}
