import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

import type { CreatePatientDto } from './dto/create-patient.dto';
import type { PatientResponseDto } from './dto/patient-response.dto';
import type { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<PatientResponseDto[]> {
    return this.prisma.patient.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<PatientResponseDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id, tenantId, isActive: true },
    });
    if (!patient) throw new NotFoundException(`Paciente ${id} no encontrado`);
    return patient;
  }

  async create(tenantId: string, dto: CreatePatientDto): Promise<PatientResponseDto> {
    const existing = await this.prisma.patient.findFirst({
      where: {
        tenantId,
        documentType: dto.documentType,
        documentId: dto.documentId,
        isActive: true,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Paciente con ${dto.documentType}-${dto.documentId} ya existe`,
      );
    }

    return this.prisma.patient.create({
      data: {
        tenantId,
        documentType: dto.documentType,
        documentId: dto.documentId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        gender: dto.gender,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePatientDto,
  ): Promise<PatientResponseDto> {
    await this.findOne(tenantId, id);

    return this.prisma.patient.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        gender: dto.gender,
      },
    });
  }

  async deactivate(tenantId: string, id: string): Promise<PatientResponseDto> {
    await this.findOne(tenantId, id);
    return this.prisma.patient.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
