import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  type Prisma,
  type Consultation,
  type ConsultationService,
  type Patient,
  type Doctor,
} from '@prisma/client';

import { type AuditLogService } from '../audit-log/audit-log.service';
import {
  createPaginatedResponse,
  type PaginatedResponseDto,
} from '../common/dto/paginated-response.dto';
import { type PrismaService } from '../database/prisma.service';
import { type MailerService } from '../mailer/mailer.service';

import type { ConsultationDetailResponseDto } from './dto/consultation-detail-response.dto';
import type { ConsultationQueryDto } from './dto/consultation-query.dto';
import type { ConsultationResponseDto } from './dto/consultation-response.dto';
import type { CreateScheduledConsultationDto } from './dto/create-scheduled-consultation.dto';
import type { UpdateScheduledConsultationDto } from './dto/update-scheduled-consultation.dto';

// Shape returned by Prisma when including patient, doctor, services
type ConsultationWithRelations = Consultation & {
  patient: Pick<Patient, 'name' | 'documentType' | 'documentId'>;
  doctor: Pick<Doctor, 'name' | 'email'>;
  services: Pick<
    ConsultationService,
    'serviceName' | 'specialtyName' | 'priceUsd'
  >[];
};

@Injectable()
export class ConsultationsService {
  private readonly logger = new Logger(ConsultationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly auditLog: AuditLogService,
  ) {}

  // ─── createScheduled ──────────────────────────────────────────────────────

  async createScheduled(
    tenantId: string,
    userId: string,
    dto: CreateScheduledConsultationDto,
  ): Promise<ConsultationResponseDto> {
    const [patient, doctor, doctorServices, slotConfig] = await Promise.all([
      this.prisma.patient.findFirst({
        where: { id: dto.patientId, tenantId, isActive: true },
      }),
      this.prisma.doctor.findFirst({
        where: { id: dto.doctorId, tenantId, isActive: true },
      }),
      this.prisma.doctorService.findMany({
        where: {
          id: { in: dto.doctorServiceIds },
          tenantId,
          doctorId: dto.doctorId,
        },
        include: { service: true, specialty: true },
      }),
      this.prisma.systemConfig.findFirst({
        where: { tenantId, key: 'appointment_slot_minutes' },
      }),
    ]);

    if (!patient) {
      throw new NotFoundException(
        `Paciente ${dto.patientId} no encontrado o inactivo`,
      );
    }

    if (!doctor) {
      throw new NotFoundException(
        `Doctor ${dto.doctorId} no encontrado o inactivo`,
      );
    }

    if (doctorServices.length !== dto.doctorServiceIds.length) {
      throw new BadRequestException(
        'Uno o más servicios no son válidos o no pertenecen al doctor',
      );
    }

    // Overlap detection
    const slotMinutes = parseInt(slotConfig?.value ?? '60');
    const slotMs = slotMinutes * 60_000;
    const conflict = await this.prisma.consultation.findFirst({
      where: {
        tenantId,
        patientId: dto.patientId,
        status: { in: ['SCHEDULED', 'PENDING'] },
        date: {
          gte: new Date(dto.date.getTime() - slotMs),
          lte: new Date(dto.date.getTime() + slotMs),
        },
      },
    });

    if (conflict) {
      throw new ConflictException(
        'El paciente ya tiene una consulta agendada en ese horario',
      );
    }

    const totalUsd = doctorServices.reduce(
      (sum, ds) => sum + parseFloat(ds.priceUsd.toString()),
      0,
    );

    const consultation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.consultation.create({
        data: {
          tenantId,
          patientId: dto.patientId,
          doctorId: dto.doctorId,
          date: dto.date,
          status: 'SCHEDULED',
          notes: dto.notes,
        },
      });

      await tx.consultationService.createMany({
        data: doctorServices.map((ds) => ({
          consultationId: created.id,
          serviceId: ds.serviceId,
          specialtyId: ds.specialtyId,
          serviceName: ds.service.name,
          specialtyName: ds.specialty.name,
          priceUsd: ds.priceUsd,
        })),
      });

      await this.auditLog.log(
        {
          tenantId,
          userId,
          action: 'CREATE',
          entity: 'Consultation',
          entityId: created.id,
          newValues: {
            status: created.status,
            patientId: created.patientId,
            doctorId: created.doctorId,
            date: created.date,
          },
          changedFields: ['status', 'patientId', 'doctorId', 'date'],
        },
        tx,
      );

      return created;
    });

    // Send email notification (non-blocking, errors are logged)
    if (dto.sendEmailNotification && doctor.email) {
      try {
        const scheduledDate = dto.date.toLocaleDateString('es-VE');
        const scheduledTime = dto.date.toLocaleTimeString('es-VE', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const servicesText = doctorServices
          .map((ds) => ds.service.name)
          .join(', ');

        const { subject, html } = this.mailerService.renderTemplate(
          'appointmentEmail',
          {
            doctorName: doctor.name,
            patientName: patient.name,
            scheduledDate,
            scheduledTime,
            services: servicesText,
            totalUsd: totalUsd.toFixed(2),
            centerName: 'Centro Médico',
          },
        );

        await this.mailerService.sendEmail(doctor.email, subject, html);
      } catch (err) {
        this.logger.warn(
          `Failed to send appointment email for consultation ${consultation.id}: ${String(err)}`,
        );
      }
    }

    const full = await this.prisma.consultation.findFirstOrThrow({
      where: { id: consultation.id, tenantId },
      include: {
        patient: {
          select: { name: true, documentType: true, documentId: true },
        },
        doctor: { select: { name: true, email: true } },
        services: {
          select: { serviceName: true, specialtyName: true, priceUsd: true },
        },
      },
    });

    return this.toResponse(full as ConsultationWithRelations);
  }

  // ─── markAsAttended ───────────────────────────────────────────────────────

  async markAsAttended(
    tenantId: string,
    consultationId: string,
    userId: string,
  ): Promise<ConsultationResponseDto> {
    const consultation = await this.prisma.consultation.findFirst({
      where: { id: consultationId, tenantId },
      include: {
        patient: {
          select: { name: true, documentType: true, documentId: true },
        },
        doctor: { select: { name: true, email: true } },
        services: {
          select: { serviceName: true, specialtyName: true, priceUsd: true },
        },
      },
    });

    if (!consultation) {
      throw new NotFoundException(`Consulta ${consultationId} no encontrada`);
    }

    const canRegisterAttendance =
      consultation.status === 'SCHEDULED' || consultation.status === 'PAID';
    if (!canRegisterAttendance) {
      throw new BadRequestException(
        `Solo se puede confirmar la llegada de una consulta agendada o pagada. Estado actual: ${consultation.status}`,
      );
    }

    if (consultation.attendedAt) {
      throw new BadRequestException(
        'La llegada de esta consulta ya fue confirmada',
      );
    }

    const attendedAt = new Date();
    const nextStatus = consultation.status === 'SCHEDULED' ? 'PENDING' : 'PAID';

    await this.prisma.consultation.updateMany({
      where: { id: consultationId, tenantId },
      data: { status: nextStatus, attendedAt, attendedById: userId },
    });

    await this.auditLog.log({
      tenantId,
      userId,
      action: 'STATUS_CHANGE',
      entity: 'Consultation',
      entityId: consultationId,
      oldValues: { status: 'SCHEDULED' },
      newValues: { status: nextStatus, attendedAt, attendedById: userId },
      changedFields: ['status', 'attendedAt', 'attendedById'],
    });

    const updated = await this.prisma.consultation.findFirstOrThrow({
      where: { id: consultationId, tenantId },
      include: {
        patient: {
          select: { name: true, documentType: true, documentId: true },
        },
        doctor: { select: { name: true, email: true } },
        services: {
          select: { serviceName: true, specialtyName: true, priceUsd: true },
        },
      },
    });

    return this.toResponse(updated as ConsultationWithRelations);
  }

  // ─── updateScheduled ──────────────────────────────────────────────────────

  async updateScheduled(
    tenantId: string,
    consultationId: string,
    userId: string,
    dto: UpdateScheduledConsultationDto,
  ): Promise<ConsultationResponseDto> {
    const consultation = await this.prisma.consultation.findFirst({
      where: { id: consultationId, tenantId },
      include: {
        patient: {
          select: { name: true, documentType: true, documentId: true },
        },
        doctor: { select: { name: true, email: true } },
        services: {
          select: { serviceName: true, specialtyName: true, priceUsd: true },
        },
      },
    });

    if (!consultation) {
      throw new NotFoundException(`Consulta ${consultationId} no encontrada`);
    }

    if (consultation.status !== 'SCHEDULED') {
      throw new BadRequestException(
        'Solo se pueden editar consultas agendadas sin pago',
      );
    }

    const slotConfig = await this.prisma.systemConfig.findFirst({
      where: { tenantId, key: 'appointment_slot_minutes' },
    });
    const slotMs = parseInt(slotConfig?.value ?? '60') * 60_000;
    const conflict = await this.prisma.consultation.findFirst({
      where: {
        tenantId,
        patientId: consultation.patientId,
        id: { not: consultationId },
        status: { in: ['SCHEDULED', 'PENDING'] },
        date: {
          gte: new Date(dto.date.getTime() - slotMs),
          lte: new Date(dto.date.getTime() + slotMs),
        },
      },
    });

    if (conflict) {
      throw new ConflictException(
        'El paciente ya tiene una consulta agendada en ese horario',
      );
    }

    await this.prisma.consultation.updateMany({
      where: { id: consultationId, tenantId, status: 'SCHEDULED' },
      data: { date: dto.date, notes: dto.notes },
    });
    await this.auditLog.log({
      tenantId,
      userId,
      action: 'UPDATE',
      entity: 'Consultation',
      entityId: consultationId,
      oldValues: { date: consultation.date, notes: consultation.notes },
      newValues: { date: dto.date, notes: dto.notes },
      changedFields: ['date', 'notes'],
    });

    const updated = await this.prisma.consultation.findFirstOrThrow({
      where: { id: consultationId, tenantId },
      include: {
        patient: {
          select: { name: true, documentType: true, documentId: true },
        },
        doctor: { select: { name: true, email: true } },
        services: {
          select: { serviceName: true, specialtyName: true, priceUsd: true },
        },
      },
    });

    return this.toResponse(updated as ConsultationWithRelations);
  }

  // ─── findAll ──────────────────────────────────────────────────────────────

  async findAll(
    tenantId: string,
    query: ConsultationQueryDto,
  ): Promise<PaginatedResponseDto<ConsultationResponseDto>> {
    const { page, limit, date, doctorId, patientId, status } = query;
    const skip = (page - 1) * limit;

    const dateFilter: Prisma.ConsultationWhereInput = date
      ? {
          date: {
            gte: this.startOfDay(date),
            lte: this.endOfDay(date),
          },
        }
      : {};

    const where: Prisma.ConsultationWhereInput = {
      tenantId,
      ...(doctorId ? { doctorId } : {}),
      ...(patientId ? { patientId } : {}),
      ...(status ? { status } : {}),
      ...dateFilter,
    };

    const [total, consultations] = await this.prisma.$transaction([
      this.prisma.consultation.count({ where }),
      this.prisma.consultation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'asc' },
        include: {
          patient: {
            select: { name: true, documentType: true, documentId: true },
          },
          doctor: { select: { name: true, email: true } },
          services: {
            select: { serviceName: true, specialtyName: true, priceUsd: true },
          },
        },
      }),
    ]);

    return createPaginatedResponse(
      consultations.map((c) => this.toResponse(c as ConsultationWithRelations)),
      total,
      page,
      limit,
    );
  }

  async findOne(
    tenantId: string,
    consultationId: string,
  ): Promise<ConsultationDetailResponseDto> {
    const consultation = await this.prisma.consultation.findFirst({
      where: { id: consultationId, tenantId },
      include: {
        patient: {
          select: { name: true, documentType: true, documentId: true },
        },
        doctor: {
          select: {
            name: true,
            email: true,
            documentType: true,
            documentId: true,
          },
        },
        services: {
          select: { serviceName: true, specialtyName: true, priceUsd: true },
        },
        medicalRecord: { select: { id: true } },
      },
    });

    if (!consultation) {
      throw new NotFoundException(`Consulta ${consultationId} no encontrada`);
    }

    return {
      ...this.toResponse(consultation as ConsultationWithRelations),
      doctorDocument: `${consultation.doctor.documentType}-${consultation.doctor.documentId}`,
      medicalRecordId: consultation.medicalRecord?.id ?? null,
    };
  }

  // ─── findToday ────────────────────────────────────────────────────────────

  async findToday(tenantId: string): Promise<ConsultationResponseDto[]> {
    const now = new Date();
    const consultations = await this.prisma.consultation.findMany({
      where: {
        tenantId,
        status: { in: ['SCHEDULED', 'PENDING'] },
        date: {
          gte: this.startOfDay(now),
          lte: this.endOfDay(now),
        },
      },
      orderBy: { date: 'asc' },
      include: {
        patient: {
          select: { name: true, documentType: true, documentId: true },
        },
        doctor: { select: { name: true, email: true } },
        services: {
          select: { serviceName: true, specialtyName: true, priceUsd: true },
        },
      },
    });

    return consultations.map((c) =>
      this.toResponse(c as ConsultationWithRelations),
    );
  }

  // ─── void ─────────────────────────────────────────────────────────────────

  async void(
    tenantId: string,
    consultationId: string,
    reason: string,
    userId: string,
  ): Promise<ConsultationResponseDto> {
    const consultation = await this.prisma.consultation.findFirst({
      where: { id: consultationId, tenantId },
      include: {
        patient: {
          select: { name: true, documentType: true, documentId: true },
        },
        doctor: { select: { name: true, email: true } },
        services: {
          select: { serviceName: true, specialtyName: true, priceUsd: true },
        },
      },
    });

    if (!consultation) {
      throw new NotFoundException(`Consulta ${consultationId} no encontrada`);
    }

    if (consultation.status === 'PAID') {
      throw new BadRequestException(
        'No se puede anular una consulta ya pagada. Anule el pago primero.',
      );
    }

    await this.prisma.consultation.updateMany({
      where: { id: consultationId, tenantId },
      data: { status: 'VOIDED' },
    });

    await this.auditLog.log({
      tenantId,
      userId,
      action: 'VOID',
      entity: 'Consultation',
      entityId: consultationId,
      oldValues: { status: consultation.status },
      newValues: { status: 'VOIDED', voidReason: reason },
      changedFields: ['status'],
    });

    const updated = await this.prisma.consultation.findFirstOrThrow({
      where: { id: consultationId, tenantId },
      include: {
        patient: {
          select: { name: true, documentType: true, documentId: true },
        },
        doctor: { select: { name: true, email: true } },
        services: {
          select: { serviceName: true, specialtyName: true, priceUsd: true },
        },
      },
    });

    return this.toResponse(updated as ConsultationWithRelations);
  }

  // ─── findPendingById (internal, used by payments) ─────────────────────────

  async findPendingById(
    tenantId: string,
    consultationId: string,
  ): Promise<ConsultationWithRelations> {
    const consultation = await this.prisma.consultation.findFirst({
      where: { id: consultationId, tenantId, status: 'PENDING' },
      include: {
        patient: {
          select: { name: true, documentType: true, documentId: true },
        },
        doctor: { select: { name: true, email: true } },
        services: {
          select: { serviceName: true, specialtyName: true, priceUsd: true },
        },
      },
    });

    if (!consultation) {
      throw new NotFoundException(
        `Consulta ${consultationId} no encontrada o no está en estado PENDING`,
      );
    }

    return consultation as ConsultationWithRelations;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private toResponse(c: ConsultationWithRelations): ConsultationResponseDto {
    const totalUsd = c.services.reduce(
      (sum, s) => sum + parseFloat(s.priceUsd.toString()),
      0,
    );

    return {
      id: c.id,
      tenantId: c.tenantId,
      patientId: c.patientId,
      patientName: c.patient.name,
      patientDocument: `${c.patient.documentType}-${c.patient.documentId}`,
      doctorId: c.doctorId,
      doctorName: c.doctor.name,
      date: c.date,
      status: c.status,
      services: c.services.map((s) => ({
        serviceName: s.serviceName,
        specialtyName: s.specialtyName,
        priceUsd: s.priceUsd.toString(),
      })),
      totalUsd: totalUsd.toFixed(2),
      notes: c.notes,
      paymentId: c.paymentId,
      attendedAt: c.attendedAt,
      createdAt: c.createdAt,
    };
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}
