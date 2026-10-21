import {
  isPatientClinicalHistory,
  type PatientClinicalHistory,
} from '@centro-medico/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Prisma,
  type DocumentType,
  type GenderType,
} from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import { type LookupQueryDto } from '../common/dto/lookup-query.dto';
import {
  EntityLookupItemDto,
  type LookupResponseDto,
} from '../common/dto/lookup-response.dto';
import {
  createPaginatedResponse,
  type PaginatedResponseDto,
} from '../common/dto/paginated-response.dto';
import { type PaginationQueryDto } from '../common/dto/pagination-query.dto';
import {
  decodeNameCursor,
  encodeNameCursor,
} from '../common/utils/cursor-pagination.utils';
import { PrismaService } from '../database/prisma.service';
import {
  NotificationChannel,
  NotificationType,
} from '../notifications/notification.types';
import { NotificationService } from '../notifications/notifications.service';
import { RailwayBucketService } from '../railway-bucket/railway-bucket.service';

import type { CreatePatientDto } from './dto/create-patient.dto';
import type { PatientConsultationResponseDto } from './dto/patient-consultation-response.dto';
import type { PatientResponseDto } from './dto/patient-response.dto';
import type { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly railwayBucket: RailwayBucketService,
    private readonly auditLog?: AuditLogService,
  ) {}

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
        {
          representatives: {
            some: {
              representative: {
                OR: [
                  { name: { contains: search, mode: 'insensitive' as const } },
                  {
                    documentId: {
                      contains: search,
                      mode: 'insensitive' as const,
                    },
                  },
                ],
              },
            },
          },
        },
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
      select: {
        id: true,
        name: true,
        documentType: true,
        documentId: true,
        birthDate: true,
        representatives: {
          select: {
            relationship: true,
            representative: {
              select: { name: true, documentType: true, documentId: true },
            },
          },
          take: 1,
        },
      },
    });
    const hasNextPage = patients.length > query.limit;
    const data = patients.slice(0, query.limit).map((patient) => {
      const item = new EntityLookupItemDto();
      const firstRep = patient.representatives[0];
      Object.assign(item, {
        ...patient,
        ...(patient.birthDate ? { age: calculateAge(patient.birthDate) } : {}),
        ...(firstRep
          ? {
              representative: {
                name: firstRep.representative.name,
                documentType: firstRep.representative.documentType,
                documentId: firstRep.representative.documentId,
              },
            }
          : {}),
      });
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
      include: {
        representatives: {
          include: { representative: true },
        },
      },
    });
    if (!patient) throw new NotFoundException(`Paciente ${id} no encontrado`);
    return mapPatientResponse(patient);
  }

  async sendBirthdayEmail(
    tenantId: string,
    patientId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId, isActive: true },
      include: {
        tenant: {
          select: {
            name: true,
            logoObjectKey: true,
            logoUrl: true,
            email: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException(`Paciente ${patientId} no encontrado`);
    }

    if (!patient.email) {
      throw new BadRequestException(
        `El paciente ${patient.name} no tiene correo electrónico`,
      );
    }

    const logoUrl = await this.railwayBucket.resolveLogoUrl(
      patient.tenant.logoObjectKey,
      patient.tenant.logoUrl,
    );

    await this.notificationService.send(
      NotificationType.BIRTHDAY_PATIENT,
      tenantId,
      patient.email,
      {
        centerName: patient.tenant.name,
        logoUrl: logoUrl ?? '',
        patientName: patient.name,
      },
      NotificationChannel.EMAIL,
    );

    await this.prisma.reminderLog.create({
      data: {
        tenantId,
        type: 'BIRTHDAY',
        channel: NotificationChannel.EMAIL,
        patientId: patient.id,
        recipient: patient.email,
        notificationType: NotificationType.BIRTHDAY_PATIENT,
        status: 'sent',
      },
    });

    await this.auditLog?.log({
      tenantId,
      userId,
      action: 'SEND',
      entity: 'Patient',
      entityId: patient.id,
      newValues: { notificationType: NotificationType.BIRTHDAY_PATIENT },
      changedFields: ['birthdayEmailSent'],
    });

    return { message: 'Correo de cumpleaños enviado' };
  }

  async create(
    tenantId: string,
    dto: CreatePatientDto,
  ): Promise<PatientResponseDto> {
    const documentId = dto.documentId;
    if (!documentId) {
      throw new BadRequestException('El documento de identidad es obligatorio');
    }

    const existing = await this.prisma.patient.findFirst({
      where: {
        tenantId,
        documentType: dto.documentType,
        documentId,
        isActive: true,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Paciente con ${dto.documentType}-${documentId} ya existe`,
      );
    }

    if (!isPatientClinicalHistory(dto.clinicalHistory)) {
      throw new ConflictException('Historial clínico inválido');
    }

    try {
      const patient = await this.prisma.$transaction(async (tx) => {
        const created = await tx.patient.create({
          data: {
            tenantId,
            documentType: dto.documentType,
            documentId,
            name: dto.name,
            phone: dto.phone,
            email: dto.email,
            birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
            gender: dto.gender,
            clinicalHistory: dto.clinicalHistory as Prisma.InputJsonValue,
          },
        });

        if (dto.representative) {
          const rep = dto.representative;
          let existingRep = await tx.representative.findFirst({
            where: {
              tenantId,
              documentType: rep.documentType,
              documentId: rep.documentId,
            },
          });

          if (!existingRep) {
            existingRep = await tx.representative.create({
              data: {
                tenantId,
                name: rep.name,
                documentType: rep.documentType,
                documentId: rep.documentId,
                phone: rep.phone,
              },
            });
          }

          await tx.patientRepresentative.create({
            data: {
              tenantId,
              patientId: created.id,
              representativeId: existingRep.id,
              relationship: rep.relationship,
            },
          });
        }

        return created;
      });

      await this.auditLog?.log(
        {
          action: 'CREATE',
          entity: 'Patient',
          entityId: patient.id,
          newValues: patient,
          changedFields: Object.keys(dto),
        },
        this.prisma,
      );
      return mapPatientResponse(patient);
    } catch (err) {
      // P2002: conflicto de unicidad, incluso ante altas concurrentes.
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          'No se pudo registrar el paciente por conflicto de datos. Intentá de nuevo.',
        );
      }
      throw err;
    }
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

    // Actualización de documento: se envían ambos campos, incluido el tipo M.
    const documentUpdate =
      dto.documentType && dto.documentId
        ? { documentType: dto.documentType, documentId: dto.documentId }
        : {};

    await this.prisma.patient.updateMany({
      where: { id, tenantId },
      data: {
        ...documentUpdate,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        gender: dto.gender,
        clinicalHistory: dto.clinicalHistory as Prisma.InputJsonValue,
      },
    });

    if (dto.representative) {
      const rep = dto.representative;
      let existingRep = await this.prisma.representative.findFirst({
        where: {
          tenantId,
          documentType: rep.documentType,
          documentId: rep.documentId,
        },
      });

      if (!existingRep) {
        existingRep = await this.prisma.representative.create({
          data: {
            tenantId,
            name: rep.name,
            documentType: rep.documentType,
            documentId: rep.documentId,
            phone: rep.phone,
          },
        });
      }

      await this.prisma.patientRepresentative.upsert({
        where: {
          patientId_representativeId: {
            patientId: id,
            representativeId: existingRep.id,
          },
        },
        create: {
          tenantId,
          patientId: id,
          representativeId: existingRep.id,
          relationship: rep.relationship,
        },
        update: {
          relationship: rep.relationship,
        },
      });
    }

    const patient = await this.prisma.patient.findFirstOrThrow({
      where: { id, tenantId },
      include: {
        representatives: {
          include: { representative: true },
        },
      },
    });
    await this.auditLog?.log(
      {
        action: 'UPDATE',
        entity: 'Patient',
        entityId: patient.id,
        newValues: patient,
        changedFields: Object.keys(dto),
      },
      this.prisma,
    );
    return mapPatientResponse(patient);
  }

  async deactivate(tenantId: string, id: string): Promise<PatientResponseDto> {
    await this.findOne(tenantId, id);
    await this.prisma.patient.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    });
    const patient = await this.prisma.patient.findFirstOrThrow({
      where: { id, tenantId },
    });
    await this.auditLog?.log(
      {
        action: 'DEACTIVATE',
        entity: 'Patient',
        entityId: patient.id,
        newValues: { isActive: false },
        changedFields: ['isActive'],
      },
      this.prisma,
    );
    return mapPatientResponse(patient);
  }

  async permanentlyDelete(
    tenantId: string,
    id: string,
  ): Promise<{ id: string }> {
    const patient = await this.prisma.patient.findFirst({
      where: { id, tenantId, isActive: true },
    });

    if (!patient) {
      throw new NotFoundException(`Paciente ${id} no encontrado`);
    }

    const [consultations, medicalRecords, labOrders] = await Promise.all([
      this.prisma.consultation.count({ where: { tenantId, patientId: id } }),
      this.prisma.medicalRecord.count({ where: { tenantId, patientId: id } }),
      this.prisma.labOrder.count({ where: { tenantId, patientId: id } }),
    ]);

    if (consultations || medicalRecords || labOrders) {
      throw new ConflictException({
        message:
          'No se puede eliminar el paciente porque tiene movimientos registrados',
        reasons: { consultations, medicalRecords, labOrders },
      });
    }

    await this.auditLog?.log(
      {
        action: 'DELETE',
        entity: 'Patient',
        entityId: patient.id,
        oldValues: patient,
        changedFields: [],
      },
      this.prisma,
    );
    await this.prisma.patient.delete({ where: { id: patient.id } });

    return { id: patient.id };
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
      orderBy: { date: 'asc' },
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
      status: consultation.status,
      hasMedicalRecord: consultation.medicalRecord !== null,
      canCreateMedicalRecord: consultation.medicalRecord === null,
      services: consultation.services,
    }));
  }

  async lookupRepresentative(
    tenantId: string,
    documentType: string,
    documentId: string,
  ): Promise<{
    found: boolean;
    representative?: {
      name: string;
      documentType: string;
      documentId: string;
      phone: string | null;
    };
  }> {
    const rep = await this.prisma.representative.findFirst({
      where: {
        tenantId,
        documentType: documentType as DocumentType,
        documentId,
      },
    });
    if (!rep) return { found: false };
    return {
      found: true,
      representative: {
        name: rep.name,
        documentType: rep.documentType,
        documentId: rep.documentId,
        phone: rep.phone,
      },
    };
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
  representatives?: Array<{
    relationship: string;
    representative: {
      name: string;
      documentType: string;
      documentId: string;
      phone: string | null;
    };
  }>;
}): PatientResponseDto {
  return {
    id: patient.id,
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
    representatives: patient.representatives
      ? patient.representatives.map((pr) => ({
          relationship: pr.relationship,
          name: pr.representative.name,
          documentType: pr.representative.documentType,
          documentId: pr.representative.documentId,
          phone: pr.representative.phone,
        }))
      : null,
  };
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  const age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayHasNotOccurred =
    today.getUTCMonth() < birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() &&
      today.getUTCDate() < birthDate.getUTCDate());

  return birthdayHasNotOccurred ? age - 1 : age;
}
