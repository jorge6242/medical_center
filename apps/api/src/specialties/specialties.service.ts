import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditLogService } from '../audit-log/audit-log.service';
import {
  createPaginatedResponse,
  type PaginatedResponseDto,
} from '../common/dto/paginated-response.dto';
import { type PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../database/prisma.service';

import type { CreateSpecialtyDto } from './dto/create-specialty.dto';
import type { SpecialtyResponseDto } from './dto/specialty-response.dto';
import type { UpdateSpecialtyDto } from './dto/update-specialty.dto';

@Injectable()
export class SpecialtiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog?: AuditLogService,
  ) {}

  async findAll(
    tenantId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<SpecialtyResponseDto>> {
    const { page, limit, search } = query;
    const where = {
      tenantId,
      isActive: true,
      ...(search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };
    const [total, specialties] = await this.prisma.$transaction([
      this.prisma.specialty.count({ where }),
      this.prisma.specialty.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return createPaginatedResponse(
      specialties.map((specialty) => this.toResponse(specialty)),
      total,
      page,
      limit,
    );
  }

  async findOne(tenantId: string, id: string): Promise<SpecialtyResponseDto> {
    const specialty = await this.prisma.specialty.findFirst({
      where: { id, tenantId, isActive: true },
    });
    if (!specialty)
      throw new NotFoundException(`Especialidad ${id} no encontrada`);
    return this.toResponse(specialty);
  }

  async create(
    tenantId: string,
    dto: CreateSpecialtyDto,
  ): Promise<SpecialtyResponseDto> {
    const name = dto.name.trim();
    const existing = await this.prisma.specialty.findFirst({
      where: { tenantId, name, isActive: true },
    });
    if (existing)
      throw new ConflictException(`Especialidad "${dto.name}" ya existe`);
    const specialty = await this.prisma.specialty.create({
      data: { tenantId, name },
    });
    await this.auditLog?.log(
      {
        tenantId,
        action: 'CREATE',
        entity: 'Specialty',
        entityId: specialty.id,
        newValues: { name: specialty.name },
        changedFields: ['name'],
      },
      this.prisma,
    );
    return this.toResponse(specialty);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateSpecialtyDto,
  ): Promise<SpecialtyResponseDto> {
    const current = await this.assertExists(tenantId, id);
    const name = dto.name?.trim();
    if (!name)
      throw new BadRequestException(
        'El nombre de la especialidad es obligatorio',
      );
    const duplicate = await this.prisma.specialty.findFirst({
      where: { tenantId, name, isActive: true, id: { not: id } },
    });
    if (duplicate)
      throw new ConflictException(`Especialidad "${name}" ya existe`);
    await this.prisma.specialty.updateMany({
      where: { id, tenantId },
      data: { name },
    });
    const specialty = await this.prisma.specialty.findFirstOrThrow({
      where: { id, tenantId },
    });
    await this.auditLog?.log(
      {
        tenantId,
        action: 'UPDATE',
        entity: 'Specialty',
        entityId: specialty.id,
        oldValues: { name: current.name },
        newValues: { name: specialty.name },
        changedFields: ['name'],
      },
      this.prisma,
    );
    return this.toResponse(specialty);
  }

  async deactivate(
    tenantId: string,
    id: string,
  ): Promise<SpecialtyResponseDto> {
    const current = await this.assertExists(tenantId, id);
    await this.prisma.specialty.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    });
    const specialty = await this.prisma.specialty.findFirstOrThrow({
      where: { id, tenantId },
    });
    await this.auditLog?.log(
      {
        tenantId,
        action: 'DEACTIVATE',
        entity: 'Specialty',
        entityId: specialty.id,
        oldValues: { isActive: current.isActive },
        newValues: { isActive: false },
        changedFields: ['isActive'],
      },
      this.prisma,
    );
    return this.toResponse(specialty);
  }

  async permanentlyDelete(
    tenantId: string,
    id: string,
  ): Promise<{ id: string }> {
    const specialty = await this.assertExists(tenantId, id);
    const [doctors, doctorServices, consultations] = await Promise.all([
      this.prisma.doctorSpecialty.count({ where: { specialtyId: id } }),
      this.prisma.doctorService.count({ where: { specialtyId: id } }),
      this.prisma.consultationService.count({ where: { specialtyId: id } }),
    ]);
    const hasRelationships =
      doctors > 0 || doctorServices > 0 || consultations > 0;
    if (hasRelationships) {
      throw new ConflictException(
        this.buildDeleteRejectionMessage(specialty.name, {
          doctors,
          doctorServices,
          consultations,
        }),
      );
    }

    await this.auditLog?.log(
      {
        tenantId,
        action: 'DELETE',
        entity: 'Specialty',
        entityId: specialty.id,
        oldValues: { name: specialty.name },
        changedFields: ['name'],
      },
      this.prisma,
    );
    await this.prisma.specialty.delete({ where: { id: specialty.id } });
    return { id: specialty.id };
  }

  private async assertExists(
    tenantId: string,
    id: string,
  ): Promise<{ id: string; name: string; isActive: boolean }> {
    const exists = await this.prisma.specialty.findFirst({
      where: { id, tenantId, isActive: true },
    });
    if (!exists)
      throw new NotFoundException(`Especialidad ${id} no encontrada`);
    return exists;
  }

  private toResponse(specialty: {
    id: string;
    name: string;
    isActive: boolean;
  }): SpecialtyResponseDto {
    return {
      id: specialty.id,
      name: specialty.name,
      isActive: specialty.isActive,
    };
  }

  private buildDeleteRejectionMessage(
    name: string,
    relationships: {
      doctors: number;
      doctorServices: number;
      consultations: number;
    },
  ): string {
    const reasons = [
      relationships.doctors > 0
        ? `${relationships.doctors} ${relationships.doctors === 1 ? 'doctor' : 'doctores'}`
        : null,
      relationships.doctorServices > 0
        ? `${relationships.doctorServices} ${relationships.doctorServices === 1 ? 'servicio de doctor' : 'servicios de doctores'}`
        : null,
      relationships.consultations > 0
        ? `${relationships.consultations} ${relationships.consultations === 1 ? 'consulta' : 'consultas'}`
        : null,
    ].filter((reason): reason is string => Boolean(reason));
    return `No se puede eliminar ${name}: está asociada a ${reasons.join(' y ')}`;
  }
}
