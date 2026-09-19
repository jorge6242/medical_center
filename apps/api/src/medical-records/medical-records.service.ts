import { isMedicalRecordClinicalData } from '@centro-medico/shared';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { toMedicalRecordResponse, toPatientMedicalRecordResponse } from './medical-records.mapper';
import { createPaginatedResponse, type PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../database/prisma.service';

import type { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import type { GenerateMedicalRecordExportDto } from './dto/generate-medical-record-export.dto';
import type { MedicalRecordExportJobResponseDto } from './dto/medical-record-export-job-response.dto';
import type { PaidConsultationResponseDto } from './dto/paid-consultation-response.dto';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class MedicalRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateMedicalRecordDto) {
    if (!isMedicalRecordClinicalData(dto.clinicalData)) {
      throw new BadRequestException('clinicalData inválido');
    }

    const consultation = await this.prisma.consultation.findFirst({
      where: { id: dto.consultationId, tenantId },
      select: {
        id: true,
        tenantId: true,
        patientId: true,
        doctorId: true,
        status: true,
        date: true,
        patient: {
          select: {
            id: true,
            name: true,
            documentType: true,
            documentId: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
        medicalRecord: {
          select: { id: true },
        },
      },
    });

    if (!consultation) {
      throw new NotFoundException(`Consulta ${dto.consultationId} no encontrada`);
    }

    if (consultation.patientId !== dto.patientId) {
      throw new ConflictException('La consulta no pertenece al paciente indicado');
    }

    if (consultation.status !== 'PAID') {
      throw new BadRequestException('Solo se puede crear informe médico para consultas pagadas');
    }

    if (consultation.medicalRecord) {
      throw new ConflictException('La consulta ya tiene un informe médico');
    }

    const record = await this.prisma.medicalRecord.create({
      data: {
        tenantId,
        patientId: consultation.patientId,
        consultationId: consultation.id,
        doctorId: consultation.doctorId,
        createdById: userId,
        templateType: dto.templateType,
        templateVersion: dto.templateVersion ?? '1.0.0',
        templateSnapshot: dto.templateSnapshot
          ? (dto.templateSnapshot as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        clinicalData: dto.clinicalData as Prisma.InputJsonValue,
        status: 'COMPLETED',
      },
      select: {
        id: true,
        tenantId: true,
        patientId: true,
        consultationId: true,
        doctorId: true,
        createdById: true,
        templateType: true,
        templateVersion: true,
        templateSnapshot: true,
        clinicalData: true,
        status: true,
        recordedAt: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            name: true,
            documentType: true,
            documentId: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
        consultation: {
          select: {
            id: true,
            date: true,
            services: {
              select: {
                specialtyName: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return toMedicalRecordResponse(record as never);
  }

  async findPaidConsultations(
    user: JwtPayload,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<PaidConsultationResponseDto>> {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ConsultationWhereInput = {
      tenantId: user.tenantId,
      status: 'PAID',
      ...(user.role === 'doctor' && user.doctorId
        ? { doctorId: user.doctorId }
        : {}),
      ...(search
        ? {
            OR: [
              { patient: { name: { contains: search, mode: 'insensitive' as const } } },
              { patient: { documentId: { contains: search, mode: 'insensitive' as const } } },
              { doctor: { name: { contains: search, mode: 'insensitive' as const } } },
              { services: { some: { serviceName: { contains: search, mode: 'insensitive' as const } } } },
              { services: { some: { specialtyName: { contains: search, mode: 'insensitive' as const } } } },
            ],
          }
        : {}),
    };

    const [total, consultations] = await this.prisma.$transaction([
      this.prisma.consultation.count({ where }),
      this.prisma.consultation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          patientId: true,
          doctorId: true,
          patient: {
            select: {
              documentType: true,
              documentId: true,
              name: true,
            },
          },
          doctor: {
            select: { name: true },
          },
          services: {
            select: {
              serviceName: true,
              specialtyName: true,
              priceUsd: true,
            },
          },
          medicalRecord: {
            select: { id: true },
          },
        },
      }),
    ]);

    return createPaginatedResponse(
      consultations.map((consultation) => ({
        id: consultation.id,
        date: consultation.date,
        status: 'PAID',
        patientId: consultation.patientId,
        patientName: consultation.patient.name,
        patientDocument: `${consultation.patient.documentType}-${consultation.patient.documentId}`,
        doctorId: consultation.doctorId,
        doctorName: consultation.doctor.name,
        services: consultation.services.map((service) => ({
          serviceName: service.serviceName,
          specialtyName: service.specialtyName,
          priceUsd: service.priceUsd.toString(),
        })),
        medicalRecordId: consultation.medicalRecord?.id ?? null,
        canCreateMedicalRecord: !consultation.medicalRecord,
      })),
      total,
      page,
      limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const record = await this.prisma.medicalRecord.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        tenantId: true,
        patientId: true,
        consultationId: true,
        doctorId: true,
        createdById: true,
        templateType: true,
        templateVersion: true,
        templateSnapshot: true,
        clinicalData: true,
        status: true,
        recordedAt: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            name: true,
            documentType: true,
            documentId: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
        consultation: {
          select: {
            id: true,
            date: true,
            services: {
              select: {
                specialtyName: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Informe médico ${id} no encontrado`);
    }

    return toMedicalRecordResponse(record as never);
  }

  async findByPatient(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId, isActive: true },
      select: { id: true, clinicalHistory: true },
    });

    if (!patient) {
      throw new NotFoundException(`Paciente ${patientId} no encontrado`);
    }

    const records = await this.prisma.medicalRecord.findMany({
      where: { tenantId, patientId },
      orderBy: { recordedAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        patientId: true,
        consultationId: true,
        doctorId: true,
        createdById: true,
        templateType: true,
        templateVersion: true,
        templateSnapshot: true,
        clinicalData: true,
        status: true,
        recordedAt: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            name: true,
            documentType: true,
            documentId: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
        consultation: {
          select: {
            id: true,
            date: true,
            services: {
              select: {
                specialtyName: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      clinicalHistory: patient.clinicalHistory,
      records: records.map((record) => toPatientMedicalRecordResponse(record as never)),
    };
  }

  async createExportJob(
    tenantId: string,
    userId: string,
    medicalRecordId: string,
    dto: GenerateMedicalRecordExportDto,
  ): Promise<MedicalRecordExportJobResponseDto> {
    const record = await this.prisma.medicalRecord.findFirst({
      where: { id: medicalRecordId, tenantId },
      select: { id: true },
    });

    if (!record) {
      throw new NotFoundException(`Informe médico ${medicalRecordId} no encontrado`);
    }

    const jobId = crypto.randomUUID();

    // Inline medical record export generation (previously handled by BullMQ worker)
    const reportData = {
      tenantId,
      userId,
      medicalRecordId,
      format: dto.format,
      generatedAt: new Date().toISOString(),
    };

    const content = JSON.stringify(reportData, null, 2);
    const blob = Buffer.from(content, 'utf-8');
    const filename = `informe-medico-${medicalRecordId}.pdf`;
    const mimeType = 'application/pdf';

    await this.prisma.generatedReport.upsert({
      where: { jobId },
      update: {
        status: 'completed',
        format: dto.format,
        filename,
        mimeType,
        blob,
        sizeBytes: blob.length,
        error: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      create: {
        jobId,
        tenantId,
        format: dto.format,
        filename,
        mimeType,
        blob,
        sizeBytes: blob.length,
        status: 'completed',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    return {
      jobId,
      status: 'completed',
      progress: 100,
      format: dto.format,
      createdAt: new Date(),
    };
  }

  async getExportJobStatus(tenantId: string, medicalRecordId: string, jobId: string) {
    const report = await this.prisma.generatedReport.findFirst({
      where: { jobId, tenantId },
    });

    const record = await this.prisma.medicalRecord.findFirst({
      where: { id: medicalRecordId, tenantId },
      select: { id: true },
    });

    if (!record) {
      throw new NotFoundException(`Informe médico ${medicalRecordId} no encontrado`);
    }

    if (!report) {
      return {
        jobId,
        status: 'pending' as const,
        progress: 0,
        format: 'pdf',
        createdAt: new Date(),
      };
    }

    return {
      jobId: report.jobId,
      status: report.status as 'pending' | 'processing' | 'completed' | 'failed',
      progress: report.status === 'completed' ? 100 : report.status === 'processing' ? 50 : 0,
      format: report.format,
      filename: report.filename,
      sizeBytes: report.sizeBytes,
      error: report.error || undefined,
      createdAt: report.createdAt,
      completedAt: report.status === 'completed' ? report.createdAt : undefined,
    };
  }

  async downloadExport(tenantId: string, medicalRecordId: string, jobId: string) {
    const report = await this.prisma.generatedReport.findFirst({
      where: { jobId, tenantId },
    });

    if (!report) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const record = await this.prisma.medicalRecord.findFirst({
      where: { id: medicalRecordId, tenantId },
      select: { id: true },
    });

    if (!record) {
      throw new NotFoundException(`Informe médico ${medicalRecordId} no encontrado`);
    }

    if (report.status === 'pending') {
      throw new ConflictException('El PDF aún se está generando');
    }

    if (report.status === 'failed') {
      throw new BadRequestException(`Report generation failed: ${report.error}`);
    }

    if (new Date() > report.expiresAt) {
      throw new BadRequestException('Report expired');
    }

    return report;
  }

  async inferTemplateType(tenantId: string, consultationId: string) {
    const consultation = await this.prisma.consultation.findFirst({
      where: { id: consultationId, tenantId },
      select: {
        id: true,
        services: {
          select: {
            specialtyId: true,
            specialtyName: true,
          },
        },
      },
    });

    if (!consultation) {
      throw new NotFoundException(`Consulta ${consultationId} no encontrada`);
    }

    if (consultation.services.length === 0) {
      return { templateType: null, specialtyName: null };
    }

    // Collect unique specialty IDs from all services
    const uniqueSpecialtyIds = [
      ...new Set(consultation.services.map((s) => s.specialtyId)),
    ];

    const specialties = await this.prisma.specialty.findMany({
      where: { id: { in: uniqueSpecialtyIds }, tenantId },
      select: { id: true, templateType: true, name: true },
    });

    // Priority 1: any specialty has explicit GYNECOLOGY_OBSTETRICS
    const combined = specialties.find((s) => s.templateType === 'GYNECOLOGY_OBSTETRICS');
    if (combined) {
      return { templateType: combined.templateType, specialtyName: combined.name };
    }

    // Priority 2: first specialty with any explicit templateType
    const withTemplate = specialties.find((s) => s.templateType);
    if (withTemplate?.templateType) {
      return { templateType: withTemplate.templateType, specialtyName: withTemplate.name };
    }

    // Fallback: no explicit templateType found → use GENERIC.
    // Configure templateType directly on the Specialty record in the DB.
    return { templateType: 'GENERIC', specialtyName: specialties[0]?.name ?? null };
  }
}
