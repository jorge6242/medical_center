import {
  isPatientClinicalHistory,
  type PatientClinicalHistory,
} from '@centro-medico/shared';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type DocumentType, type GenderType } from '@prisma/client';

import { LookupQueryDto } from '../common/dto/lookup-query.dto';
import {
  EntityLookupItemDto,
  LookupResponseDto,
} from '../common/dto/lookup-response.dto';
import {
  createPaginatedResponse,
  type PaginatedResponseDto,
} from '../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import {
  decodeNameCursor,
  encodeNameCursor,
} from '../common/utils/cursor-pagination.utils';
import { PrismaService } from '../database/prisma.service';

import type { CreatePatientDto } from './dto/create-patient.dto';
import type { PatientConsultationResponseDto } from './dto/patient-consultation-response.dto';
import type { PatientResponseDto } from './dto/patient-response.dto';
import type { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async lookup(
    tenantId: string,
    query: LookupQueryDto,
  ): Promise<LookupResponseDto> {
    const cursor = decodeNameCursor(query.cursor);
    const search = query.q.trim();
    const where = {
      tenantId,
      isActive: true,
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { documentId: { contains: search, mode: 'insensitive' as const } },
      ],
      ...(cursor
        ? {
            AND: [
              {
                OR: [
                  { name: { gt: cursor.name } },
                  { name: cursor.name, id: { gt: cursor.id } },
                ],
              },
            ],
          }
        : {}),
    };
    const patients = await this.prisma.patient.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      select: { id: true, name: true, documentType: true, documentId: true },
    });
    const hasNextPage = patients.length > query.limit;
    const data = patients.slice(0, query.limit).map((patient) => {
      const item = new EntityLookupItemDto();
      Object.assign(item, patient);
      return item;
    });
    const last = data.at(-1);

    return {
      data,
      hasNextPage,
      nextCursor:
        hasNextPage && last
          ? encodeNameCursor({ name: last.name, id: last.id })
          : null,
    };
  }

  async findAll(
    tenantId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<PatientResponseDto>> {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              {
                documentId: { contains: search, mode: 'insensitive' as const },
              },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.patient.count({ where }),
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
    ]);

    return createPaginatedResponse(
      data.map(mapPatientResponse),
      total,
      page,
      limit,
    );
  }

  async findOne(tenantId: string, id: string): Promise<PatientResponseDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id, tenantId, isActive: true },
    });
    if (!patient) throw new NotFoundException(`Paciente ${id} no encontrado`);
    return mapPatientResponse(patient);
  }

  async create(
    tenantId: string,
    dto: CreatePatientDto,
  ): Promise<PatientResponseDto> {
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

    if (!isPatientClinicalHistory(dto.clinicalHistory)) {
      throw new ConflictException('Historial clínico inválido');
    }

    return this.prisma.patient
      .create({
        data: {
          tenantId,
          documentType: dto.documentType,
          documentId: dto.documentId,
          name: dto.name,
          phone: dto.phone,
          email: dto.email,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          gender: dto.gender,
          clinicalHistory: dto.clinicalHistory as Prisma.InputJsonValue,
        },
      })
      .then(mapPatientResponse);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePatientDto,
  ): Promise<PatientResponseDto> {
    await this.findOne(tenantId, id);

    if (!isPatientClinicalHistory(dto.clinicalHistory)) {
      throw new ConflictException('Historial clínico inválido');
    }

    return this.prisma.patient
      .update({
        where: { id },
        data: {
          name: dto.name,
          phone: dto.phone,
          email: dto.email,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          gender: dto.gender,
          clinicalHistory: dto.clinicalHistory as Prisma.InputJsonValue,
        },
      })
      .then(mapPatientResponse);
  }

  async deactivate(tenantId: string, id: string): Promise<PatientResponseDto> {
    await this.findOne(tenantId, id);
    return this.prisma.patient
      .update({
        where: { id },
        data: { isActive: false },
      })
      .then(mapPatientResponse);
  }

  async findConsultations(
    tenantId: string,
    patientId: string,
  ): Promise<PatientConsultationResponseDto[]> {
    await this.findOne(tenantId, patientId);

    const consultations = await this.prisma.consultation.findMany({
      where: {
        tenantId,
        patientId,
        status: 'PAID',
        medicalRecord: null,
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        status: true,
        medicalRecord: {
          select: { id: true },
        },
        services: {
          select: {
            serviceName: true,
            specialtyName: true,
          },
        },
      },
    });

    return consultations.map((consultation) => ({
      id: consultation.id,
      date: consultation.date,
      status: 'PAID',
      hasMedicalRecord: false,
      canCreateMedicalRecord: true,
      services: consultation.services,
    }));
  }
}

function mapPatientResponse(patient: {
  id: string;
  tenantId: string;
  documentType: DocumentType;
  documentId: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthDate: Date | null;
  gender: GenderType | null;
  clinicalHistory: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PatientResponseDto {
  return {
    id: patient.id,
    tenantId: patient.tenantId,
    documentType: patient.documentType,
    documentId: patient.documentId,
    name: patient.name,
    phone: patient.phone,
    email: patient.email,
    birthDate: patient.birthDate,
    gender: patient.gender,
    clinicalHistory: isPatientClinicalHistory(patient.clinicalHistory)
      ? (patient.clinicalHistory as PatientClinicalHistory)
      : null,
    isActive: patient.isActive,
    createdAt: patient.createdAt,
  };
}
