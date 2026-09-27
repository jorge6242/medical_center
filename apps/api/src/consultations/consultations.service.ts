import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  type Consultation,
  type ConsultationService,
  type Patient,
  type Doctor,
} from '@prisma/client';
import { DateTime } from 'luxon';

import {
  assertValidConsultationInterval,
  buildIntervalOverlapFilter,
} from './consultation-interval.utils';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  createPaginatedResponse,
  type PaginatedResponseDto,
} from '../common/dto/paginated-response.dto';
import { PrismaService } from '../database/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { RailwayBucketService } from '../railway-bucket/railway-bucket.service';

import type { ConsultationDetailResponseDto } from './dto/consultation-detail-response.dto';
import type { ConsultationQueryDto } from './dto/consultation-query.dto';
import type { ConsultationResponseDto } from './dto/consultation-response.dto';
import type { CreateScheduledConsultationDto } from './dto/create-scheduled-consultation.dto';
import type { DoctorAvailabilityResponseDto } from './dto/doctor-availability-response.dto';
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
    private readonly configService: ConfigService,
    private readonly railwayBucket?: RailwayBucketService,
  ) {}

  // ─── createScheduled ──────────────────────────────────────────────────────

  async createScheduled(
    tenantId: string,
    userId: string,
    dto: CreateScheduledConsultationDto,
  ): Promise<ConsultationResponseDto> {
    assertValidConsultationInterval(dto.startsAt, dto.endsAt);

    const [patient, doctor, doctorServices] = await Promise.all([
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

    const [patientConflict, doctorConflict] = await Promise.all([
      this.findScheduleConflict(
        tenantId,
        dto.patientId,
        dto.startsAt,
        dto.endsAt,
      ),
      this.findScheduleConflict(
        tenantId,
        dto.doctorId,
        dto.startsAt,
        dto.endsAt,
        'doctorId',
      ),
    ]);

    if (patientConflict) {
      throw new ConflictException(
        'El paciente ya tiene una consulta agendada en ese horario',
      );
    }

    if (doctorConflict) {
      throw new ConflictException(
        'El doctor ya tiene una consulta agendada en ese horario',
      );
    }

    let consultation: Consultation;
    try {
      consultation = await this.prisma.$transaction(async (tx) => {
        const created = await tx.consultation.create({
          data: {
            tenantId,
            patientId: dto.patientId,
            doctorId: dto.doctorId,
            date: dto.startsAt,
            endsAt: dto.endsAt,
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
              startsAt: created.date,
              endsAt: created.endsAt,
            },
            changedFields: [
              'status',
              'patientId',
              'doctorId',
              'startsAt',
              'endsAt',
            ],
          },
          tx,
        );

        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2004'].includes(error.code)
      ) {
        throw new ConflictException(
          'El intervalo seleccionado ya no está disponible',
        );
      }
      throw error;
    }

    if (dto.sendEmailNotification) {
      await this.notifyScheduledConsultation(
        tenantId,
        consultation.id,
        doctor,
        patient,
        dto.startsAt,
        doctorServices.map((doctorService) => doctorService.service.name),
      );
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

  private findScheduleConflict(
    tenantId: string,
    entityId: string,
    startsAt: Date,
    endsAt: Date,
    field: 'patientId' | 'doctorId' = 'patientId',
    excludedConsultationId?: string,
  ) {
    return this.prisma.consultation.findFirst({
      where: {
        tenantId,
        [field]: entityId,
        ...(excludedConsultationId
          ? { id: { not: excludedConsultationId } }
          : {}),
        status: { in: ['SCHEDULED', 'PENDING', 'PAID'] },
        ...buildIntervalOverlapFilter(startsAt, endsAt),
      },
      select: { id: true },
    });
  }

  private async notifyScheduledConsultation(
    tenantId: string,
    consultationId: string,
    doctor: Pick<Doctor, 'name' | 'email'>,
    patient: Pick<Patient, 'name' | 'email'>,
    date: Date,
    services: string[],
  ): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, logoObjectKey: true, logoUrl: true },
    });
    const logoUrl = await this.railwayBucket?.resolveLogoUrl(
      tenant?.logoObjectKey ?? null,
      tenant?.logoUrl ?? null,
    );
    const timeZone = this.configService.get<string>('app.timezone') ?? 'America/Caracas';
    const context = {
      centerName: tenant?.name ?? 'Centro Médico',
      logoUrl: logoUrl ?? '',
      doctorName: doctor.name,
      patientName: patient.name,
      scheduledDate: date.toLocaleDateString('es-VE', { timeZone }),
      scheduledTime: date.toLocaleTimeString('es-VE', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
      }),
      services: services.join(', '),
    };

    await Promise.all([
      this.sendAppointmentEmail(
        doctor.email,
        'appointmentDoctorEmail',
        context,
        consultationId,
      ),
      this.sendAppointmentEmail(
        patient.email,
        'appointmentPatientEmail',
        context,
        consultationId,
      ),
    ]);
  }

  private async sendAppointmentEmail(
    recipient: string | null,
    template: 'appointmentDoctorEmail' | 'appointmentPatientEmail',
    context: Record<string, string>,
    consultationId: string,
  ): Promise<void> {
    if (!recipient) {
      return;
    }

    try {
      const { subject, html } = this.mailerService.renderTemplate(
        template,
        context,
      );
      await this.mailerService.sendEmail(recipient, subject, html);
    } catch (error) {
      this.logger.warn(
        `Failed to send ${template} for consultation ${consultationId}: ${String(error)}`,
      );
    }
  }

  async resendScheduledNotifications(
    tenantId: string,
    consultationId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const consultation = await this.prisma.consultation.findFirst({
      where: { id: consultationId, tenantId },
      include: {
        patient: { select: { name: true, email: true } },
        doctor: { select: { name: true, email: true } },
        services: { select: { serviceName: true } },
      },
    });

    if (!consultation) {
      throw new NotFoundException(`Consulta ${consultationId} no encontrada`);
    }

    if (consultation.status !== 'SCHEDULED') {
      throw new BadRequestException(
        'Solo se pueden reenviar correos de consultas agendadas',
      );
    }

    await this.notifyScheduledConsultation(
      tenantId,
      consultation.id,
      consultation.doctor,
      consultation.patient,
      consultation.date,
      consultation.services.map((service) => service.serviceName),
    );
    await this.auditLog.log({
      tenantId,
      userId,
      action: 'SEND',
      entity: 'Consultation',
      entityId: consultationId,
      newValues: { recipients: ['doctor', 'patient'] },
      changedFields: ['emailNotifications'],
    });

    return { message: 'Correos reenviados' };
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

    assertValidConsultationInterval(dto.startsAt, dto.endsAt);
    const [patientConflict, doctorConflict] = await Promise.all([
      this.findScheduleConflict(
        tenantId,
        consultation.patientId,
        dto.startsAt,
        dto.endsAt,
        'patientId',
        consultationId,
      ),
      this.findScheduleConflict(
        tenantId,
        consultation.doctorId,
        dto.startsAt,
        dto.endsAt,
        'doctorId',
        consultationId,
      ),
    ]);

    if (patientConflict) {
      throw new ConflictException(
        'El paciente ya tiene una consulta agendada en ese horario',
      );
    }

    if (doctorConflict) {
      throw new ConflictException(
        'El doctor ya tiene una consulta agendada en ese horario',
      );
    }

    await this.prisma.consultation.updateMany({
      where: { id: consultationId, tenantId, status: 'SCHEDULED' },
      data: { date: dto.startsAt, endsAt: dto.endsAt, notes: dto.notes },
    });
    await this.auditLog.log({
      tenantId,
      userId,
      action: 'UPDATE',
      entity: 'Consultation',
      entityId: consultationId,
      oldValues: {
        startsAt: consultation.date,
        endsAt: consultation.endsAt,
        notes: consultation.notes,
      },
      newValues: {
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        notes: dto.notes,
      },
      changedFields: ['startsAt', 'endsAt', 'notes'],
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
        orderBy: { createdAt: 'desc' },
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

  async findDoctorAvailability(
    tenantId: string,
    doctorId: string,
    date: string,
    startsAt?: Date,
    endsAt?: Date,
    excludedConsultationId?: string,
  ): Promise<DoctorAvailabilityResponseDto> {
    const timeZone = this.configService.get<string>('app.timezone') ?? 'America/Caracas';
    const day = DateTime.fromISO(date, { zone: timeZone });
    const start = day.startOf('day').toUTC().toJSDate();
    const end = day.endOf('day').toUTC().toJSDate();
    if (Boolean(startsAt) !== Boolean(endsAt)) {
      throw new BadRequestException(
        'startsAt y endsAt deben enviarse juntos para validar disponibilidad',
      );
    }
    const consultations = await this.prisma.consultation.findMany({
      where: {
        tenantId,
        doctorId,
        status: { in: ['SCHEDULED', 'PENDING', 'PAID'] },
        ...buildIntervalOverlapFilter(start, end),
      },
      select: { date: true, endsAt: true },
      orderBy: { date: 'asc' },
    });
    const hasRequestedInterval = Boolean(startsAt && endsAt);
    if (startsAt && endsAt) {
      assertValidConsultationInterval(startsAt, endsAt);
    }
    const conflict =
      startsAt && endsAt
        ? await this.findScheduleConflict(
            tenantId,
            doctorId,
            startsAt,
            endsAt,
            'doctorId',
            excludedConsultationId,
          )
        : null;

    return {
      occupiedSlots: consultations.map((consultation) => ({
        startsAt: consultation.date,
        endsAt: consultation.endsAt,
      })),
      ...(hasRequestedInterval ? { isRequestedSlotAvailable: !conflict } : {}),
    };
  }

  async findOne(
    tenantId: string,
    consultationId: string,
  ): Promise<ConsultationDetailResponseDto> {
    const consultation = await this.prisma.consultation.findFirst({
      where: { id: consultationId, tenantId },
      include: {
        patient: {
          select: {
            name: true,
            documentType: true,
            documentId: true,
            birthDate: true,
          },
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
      patientAge: consultation.patient.birthDate
        ? calculateAge(consultation.patient.birthDate)
        : null,
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
      patientId: c.patientId,
      patientName: c.patient.name,
      patientDocument: `${c.patient.documentType}-${c.patient.documentId}`,
      doctorId: c.doctorId,
      doctorName: c.doctor.name,
      date: c.date,
      startsAt: c.date,
      endsAt: c.endsAt,
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
    const timeZone = this.configService.get<string>('app.timezone') ?? 'America/Caracas';
    return DateTime.fromJSDate(date, { zone: timeZone }).startOf('day').toUTC().toJSDate();
  }

  private endOfDay(date: Date): Date {
    const timeZone = this.configService.get<string>('app.timezone') ?? 'America/Caracas';
    return DateTime.fromJSDate(date, { zone: timeZone }).endOf('day').toUTC().toJSDate();
  }
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
