import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ConsultationsService } from './consultations.service';

import type { AuditLogService } from '../audit-log/audit-log.service';
import type { PrismaService } from '../database/prisma.service';
import type { MailerService } from '../mailer/mailer.service';
import type { CreateScheduledConsultationDto } from './dto/create-scheduled-consultation.dto';
import type { ConfigService } from '@nestjs/config';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const USER_ID = 'user-1';
const PATIENT_ID = 'patient-1';
const DOCTOR_ID = 'doctor-1';
const DS_ID_1 = 'ds-1';
const CONSULTATION_ID = 'consultation-1';
const CENTER_NAME = 'Centro Médico Virgen del Rosario';

const activePatient = {
  id: PATIENT_ID,
  tenantId: TENANT_ID,
  name: 'Ana Pérez',
  email: 'ana@example.com',
  documentType: 'V' as const,
  documentId: '12345678',
  isActive: true,
};

const activeDoctor = {
  id: DOCTOR_ID,
  tenantId: TENANT_ID,
  name: 'Dr. García',
  email: 'doctor@clinic.com',
  splitPercentage: new Prisma.Decimal('70.00'),
  isActive: true,
};

const doctorServices = [
  {
    id: DS_ID_1,
    doctorId: DOCTOR_ID,
    tenantId: TENANT_ID,
    specialtyId: 'spec-1',
    serviceId: 'svc-1',
    priceUsd: new Prisma.Decimal('50.00'),
    service: { name: 'Consulta General' },
    specialty: { name: 'Medicina General' },
  },
];

const scheduledConsultation = {
  id: CONSULTATION_ID,
  tenantId: TENANT_ID,
  patientId: PATIENT_ID,
  doctorId: DOCTOR_ID,
  date: new Date('2026-10-01T13:00:00.000Z'),
  endsAt: new Date('2026-10-01T14:00:00.000Z'),
  status: 'SCHEDULED' as const,
  notes: 'Revisión anual',
  paymentId: null,
  createdAt: new Date('2026-09-22T00:00:00.000Z'),
  patient: activePatient,
  doctor: activeDoctor,
  services: [
    {
      serviceName: 'Consulta General',
      specialtyName: 'Medicina General',
      priceUsd: new Prisma.Decimal('50.00'),
    },
  ],
};

// ─── Mock builders ────────────────────────────────────────────────────────────

function buildPrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    consultation: {
      create: jest.fn().mockResolvedValue(scheduledConsultation),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      findFirstOrThrow: jest.fn().mockResolvedValue(scheduledConsultation),
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    consultationService: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    patient: {
      findFirst: jest.fn().mockResolvedValue(activePatient),
    },
    doctor: {
      findFirst: jest.fn().mockResolvedValue(activeDoctor),
    },
    doctorService: {
      findMany: jest.fn().mockResolvedValue(doctorServices),
    },
    systemConfig: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    tenant: {
      findUnique: jest.fn().mockResolvedValue({ name: CENTER_NAME }),
    },
    $transaction: jest
      .fn()
      .mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          consultation: {
            create: jest.fn().mockResolvedValue(scheduledConsultation),
            findFirstOrThrow: jest
              .fn()
              .mockResolvedValue(scheduledConsultation),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          consultationService: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        }),
      ),
    ...overrides,
  } as unknown as PrismaService;
}

function buildMailer(): MailerService {
  return {
    renderTemplate: jest.fn().mockReturnValue({
      subject: 'Cita médica agendada',
      html: '<p>Cita</p>',
    }),
    sendEmail: jest.fn().mockResolvedValue(undefined),
  } as unknown as MailerService;
}

function buildAuditLog(): AuditLogService {
  return {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as AuditLogService;
}

function buildConfigService(): ConfigService {
  return {
    get: jest.fn().mockReturnValue('America/Caracas'),
  } as unknown as ConfigService;
}

// ─── createScheduled ──────────────────────────────────────────────────────────

describe('ConsultationsService.createScheduled', () => {
  const dto: CreateScheduledConsultationDto = {
    patientId: PATIENT_ID,
    doctorId: DOCTOR_ID,
    startsAt: new Date('2026-10-01T13:00:00.000Z'),
    endsAt: new Date('2026-10-01T14:00:00.000Z'),
    doctorServiceIds: [DS_ID_1],
    notes: 'Revisión anual',
    sendEmailNotification: true,
  };

  it('creates a SCHEDULED consultation with services snapshot', async () => {
    const prisma = buildPrisma();
    const mailer = buildMailer();
    const auditLog = buildAuditLog();
    const configService = buildConfigService();
    const service = new ConsultationsService(
      prisma,
      mailer,
      auditLog,
      configService,
    );

    const result = await service.createScheduled(TENANT_ID, USER_ID, dto);

    expect(result.status).toBe('SCHEDULED');
    expect(result.services).toHaveLength(1);
    expect(result.services[0]?.serviceName).toBe('Consulta General');
    expect(result).not.toHaveProperty('tenantId');
  });

  it('rejects a schedule when the doctor already has an active consultation in that slot', async () => {
    const prisma = buildPrisma({
      consultation: {
        ...buildPrisma().consultation,
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'doctor-conflict' }),
      },
    });
    const service = new ConsultationsService(
      prisma,
      buildMailer(),
      buildAuditLog(),
      buildConfigService(),
    );

    await expect(
      service.createScheduled(TENANT_ID, USER_ID, dto),
    ).rejects.toThrow(
      'El doctor ya tiene una consulta agendada en ese horario',
    );
  });

  it('sends recipient-specific emails to the doctor and patient', async () => {
    const prisma = buildPrisma();
    const mailer = buildMailer();
    const auditLog = buildAuditLog();
    const configService = buildConfigService();
    const service = new ConsultationsService(
      prisma,
      mailer,
      auditLog,
      configService,
    );

    await service.createScheduled(TENANT_ID, USER_ID, {
      ...dto,
      sendEmailNotification: true,
    });

    expect(mailer.renderTemplate).toHaveBeenNthCalledWith(
      1,
      'appointmentDoctorEmail',
      expect.objectContaining({
        centerName: CENTER_NAME,
        doctorName: 'Dr. García',
        patientName: 'Ana Pérez',
        scheduledDate: '1/10/2026',
        scheduledTime: '09:00 a. m.',
      }),
    );
    expect(mailer.renderTemplate).toHaveBeenNthCalledWith(
      2,
      'appointmentPatientEmail',
      expect.objectContaining({
        centerName: CENTER_NAME,
        doctorName: 'Dr. García',
        patientName: 'Ana Pérez',
        scheduledDate: '1/10/2026',
        scheduledTime: '09:00 a. m.',
      }),
    );
    expect(mailer.sendEmail).toHaveBeenNthCalledWith(
      1,
      'doctor@clinic.com',
      'Cita médica agendada',
      '<p>Cita</p>',
    );
    expect(mailer.sendEmail).toHaveBeenNthCalledWith(
      2,
      'ana@example.com',
      'Cita médica agendada',
      '<p>Cita</p>',
    );
  });

  it('does NOT send email when sendEmailNotification=false', async () => {
    const prisma = buildPrisma();
    const mailer = buildMailer();
    const auditLog = buildAuditLog();
    const configService = buildConfigService();
    const service = new ConsultationsService(
      prisma,
      mailer,
      auditLog,
      configService,
    );

    await service.createScheduled(TENANT_ID, USER_ID, {
      ...dto,
      sendEmailNotification: false,
    });

    expect(mailer.sendEmail).not.toHaveBeenCalled();
  });

  it('does NOT send email when doctor has no email even if sendEmailNotification=true', async () => {
    const prisma = buildPrisma({
      doctor: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ ...activeDoctor, email: null }),
      },
    });
    const mailer = buildMailer();
    const auditLog = buildAuditLog();
    const configService = buildConfigService();
    const service = new ConsultationsService(
      prisma,
      mailer,
      auditLog,
      configService,
    );

    await service.createScheduled(TENANT_ID, USER_ID, {
      ...dto,
      sendEmailNotification: true,
    });

    expect(mailer.sendEmail).toHaveBeenCalledWith(
      'ana@example.com',
      'Cita médica agendada',
      '<p>Cita</p>',
    );
  });

  it('throws ConflictException when patient has overlapping scheduled/pending consultation', async () => {
    const conflictingConsultation = { id: 'other-consultation' };
    const prisma = buildPrisma({
      consultation: {
        findFirst: jest.fn().mockResolvedValue(conflictingConsultation),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirstOrThrow: jest.fn(),
        updateMany: jest.fn(),
      },
    });
    const mailer = buildMailer();
    const auditLog = buildAuditLog();
    const configService = buildConfigService();
    const service = new ConsultationsService(
      prisma,
      mailer,
      auditLog,
      configService,
    );

    await expect(
      service.createScheduled(TENANT_ID, USER_ID, dto),
    ).rejects.toThrow(ConflictException);
  });

  it('throws NotFoundException when patient is not found or inactive', async () => {
    const prisma = buildPrisma({
      patient: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const mailer = buildMailer();
    const auditLog = buildAuditLog();
    const configService = buildConfigService();
    const service = new ConsultationsService(
      prisma,
      mailer,
      auditLog,
      configService,
    );

    await expect(
      service.createScheduled(TENANT_ID, USER_ID, dto),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when doctorServiceIds do not belong to doctor', async () => {
    const prisma = buildPrisma({
      doctorService: { findMany: jest.fn().mockResolvedValue([]) },
      // Ensure no conflict is found first
      consultation: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirstOrThrow: jest.fn(),
        updateMany: jest.fn(),
      },
    });
    const mailer = buildMailer();
    const auditLog = buildAuditLog();
    const configService = buildConfigService();
    const service = new ConsultationsService(
      prisma,
      mailer,
      auditLog,
      configService,
    );

    await expect(
      service.createScheduled(TENANT_ID, USER_ID, dto),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('ConsultationsService.findDoctorAvailability', () => {
  it('returns only active consultation slots for the doctor on the requested day', async () => {
    const occupiedDate = new Date('2026-10-01T13:00:00.000Z');
    const prisma = buildPrisma({
      consultation: {
        ...buildPrisma().consultation,
        findMany: jest.fn().mockResolvedValue([
          {
            date: occupiedDate,
            endsAt: new Date('2026-10-01T14:00:00.000Z'),
          },
        ]),
      },
    });
    const service = new ConsultationsService(
      prisma,
      buildMailer(),
      buildAuditLog(),
      buildConfigService(),
    );

    await expect(
      service.findDoctorAvailability(TENANT_ID, DOCTOR_ID, '2026-10-01'),
    ).resolves.toEqual({
      occupiedSlots: [
        {
          startsAt: occupiedDate,
          endsAt: new Date('2026-10-01T14:00:00.000Z'),
        },
      ],
    });

    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
          doctorId: DOCTOR_ID,
          status: { in: ['SCHEDULED', 'PENDING', 'PAID'] },
        }),
      }),
    );
  });

  it('marks the requested slot unavailable when it overlaps an active consultation', async () => {
    const requestedStartsAt = new Date('2026-10-01T13:00:00.000Z');
    const requestedEndsAt = new Date('2026-10-01T14:00:00.000Z');
    const prisma = buildPrisma({
      consultation: {
        ...buildPrisma().consultation,
        findFirst: jest.fn().mockResolvedValue({ id: 'doctor-conflict' }),
      },
    });
    const service = new ConsultationsService(
      prisma,
      buildMailer(),
      buildAuditLog(),
      buildConfigService(),
    );

    await expect(
      service.findDoctorAvailability(
        TENANT_ID,
        DOCTOR_ID,
        '2026-10-01',
        requestedStartsAt,
        requestedEndsAt,
      ),
    ).resolves.toMatchObject({ isRequestedSlotAvailable: false });
  });
});

describe('ConsultationsService.resendScheduledNotifications', () => {
  it('resends recipient-specific emails only while the consultation is scheduled', async () => {
    const prisma = buildPrisma({
      consultation: {
        findFirst: jest.fn().mockResolvedValue(scheduledConsultation),
      },
    });
    const mailer = buildMailer();
    const auditLog = buildAuditLog();
    const configService = buildConfigService();
    const service = new ConsultationsService(
      prisma,
      mailer,
      auditLog,
      configService,
    );

    await service.resendScheduledNotifications(
      TENANT_ID,
      CONSULTATION_ID,
      USER_ID,
    );

    expect(mailer.sendEmail).toHaveBeenCalledWith(
      'doctor@clinic.com',
      'Cita médica agendada',
      '<p>Cita</p>',
    );
    expect(mailer.sendEmail).toHaveBeenCalledWith(
      'ana@example.com',
      'Cita médica agendada',
      '<p>Cita</p>',
    );
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        userId: USER_ID,
        action: 'SEND',
        entity: 'Consultation',
        entityId: CONSULTATION_ID,
      }),
    );
  });

  it('rejects notification resend after the patient arrival is confirmed', async () => {
    const prisma = buildPrisma({
      consultation: {
        findFirst: jest.fn().mockResolvedValue({
          ...scheduledConsultation,
          status: 'PENDING',
          attendedAt: new Date(),
        }),
      },
    });
    const service = new ConsultationsService(
      prisma,
      buildMailer(),
      buildAuditLog(),
      buildConfigService(),
    );

    await expect(
      service.resendScheduledNotifications(TENANT_ID, CONSULTATION_ID, USER_ID),
    ).rejects.toThrow('Solo se pueden reenviar correos de consultas agendadas');
  });
});

describe('ConsultationsService.findOne', () => {
  it('returns the consultation detail scoped to its tenant and its medical record id', async () => {
    const prisma = buildPrisma({
      consultation: {
        ...buildPrisma().consultation,
        findFirst: jest.fn().mockResolvedValue({
          ...scheduledConsultation,
          doctor: {
            ...activeDoctor,
            documentType: 'V',
            documentId: '87654321',
          },
          patient: {
            ...activePatient,
            birthDate: new Date('2000-09-01T00:00:00.000Z'),
          },
          medicalRecord: { id: 'medical-record-1' },
        }),
      },
    });
    const service = new ConsultationsService(
      prisma,
      buildMailer(),
      buildAuditLog(),
      buildConfigService(),
    );

    const result = await service.findOne(TENANT_ID, CONSULTATION_ID);

    expect(prisma.consultation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CONSULTATION_ID, tenantId: TENANT_ID },
      }),
    );
    expect(result).toMatchObject({
      id: CONSULTATION_ID,
      doctorDocument: 'V-87654321',
      medicalRecordId: 'medical-record-1',
      patientAge: expect.any(Number),
    });
  });
});

// ─── markAsAttended ───────────────────────────────────────────────────────────

describe('ConsultationsService.markAsAttended', () => {
  it('transitions SCHEDULED → PENDING', async () => {
    const pendingConsultation = {
      ...scheduledConsultation,
      status: 'PENDING' as const,
    };
    const prisma = buildPrisma({
      consultation: {
        findFirst: jest.fn().mockResolvedValue(scheduledConsultation),
        findFirstOrThrow: jest.fn().mockResolvedValue(pendingConsultation),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    });
    const service = new ConsultationsService(
      prisma,
      buildMailer(),
      buildAuditLog(),
      buildConfigService(),
    );

    const result = await service.markAsAttended(
      TENANT_ID,
      CONSULTATION_ID,
      USER_ID,
    );

    expect(result.status).toBe('PENDING');
    expect(prisma.consultation.updateMany).toHaveBeenCalledWith({
      where: { id: CONSULTATION_ID, tenantId: TENANT_ID },
      data: {
        status: 'PENDING',
        attendedAt: expect.any(Date),
        attendedById: USER_ID,
      },
    });
  });

  it('keeps PAID status when confirming arrival after an advance payment', async () => {
    const paidConsultation = {
      ...scheduledConsultation,
      status: 'PAID' as const,
    };
    const attendedPaidConsultation = {
      ...paidConsultation,
      attendedAt: new Date('2026-09-22T11:10:00.000Z'),
      attendedById: USER_ID,
    };
    const prisma = buildPrisma({
      consultation: {
        findFirst: jest.fn().mockResolvedValue(paidConsultation),
        findFirstOrThrow: jest.fn().mockResolvedValue(attendedPaidConsultation),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    });
    const service = new ConsultationsService(
      prisma,
      buildMailer(),
      buildAuditLog(),
      buildConfigService(),
    );

    const result = await service.markAsAttended(
      TENANT_ID,
      CONSULTATION_ID,
      USER_ID,
    );

    expect(result.status).toBe('PAID');
    expect(prisma.consultation.updateMany).toHaveBeenCalledWith({
      where: { id: CONSULTATION_ID, tenantId: TENANT_ID },
      data: {
        status: 'PAID',
        attendedAt: expect.any(Date),
        attendedById: USER_ID,
      },
    });
  });

  it('throws BadRequestException when consultation is not SCHEDULED', async () => {
    const pendingConsultation = {
      ...scheduledConsultation,
      status: 'PENDING' as const,
    };
    const prisma = buildPrisma({
      consultation: {
        findFirst: jest.fn().mockResolvedValue(pendingConsultation),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirstOrThrow: jest.fn(),
        updateMany: jest.fn(),
      },
    });
    const service = new ConsultationsService(
      prisma,
      buildMailer(),
      buildAuditLog(),
      buildConfigService(),
    );

    await expect(
      service.markAsAttended(TENANT_ID, CONSULTATION_ID, USER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when consultation does not exist', async () => {
    const prisma = buildPrisma({
      consultation: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirstOrThrow: jest.fn(),
        updateMany: jest.fn(),
      },
    });
    const service = new ConsultationsService(
      prisma,
      buildMailer(),
      buildAuditLog(),
      buildConfigService(),
    );

    await expect(
      service.markAsAttended(TENANT_ID, CONSULTATION_ID, USER_ID),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── void ─────────────────────────────────────────────────────────────────────

describe('ConsultationsService.void', () => {
  it('voids a SCHEDULED consultation', async () => {
    const voidedConsultation = {
      ...scheduledConsultation,
      status: 'VOIDED' as const,
    };
    const prisma = buildPrisma({
      consultation: {
        findFirst: jest.fn().mockResolvedValue(scheduledConsultation),
        findFirstOrThrow: jest.fn().mockResolvedValue(voidedConsultation),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    });
    const service = new ConsultationsService(
      prisma,
      buildMailer(),
      buildAuditLog(),
      buildConfigService(),
    );

    const result = await service.void(
      TENANT_ID,
      CONSULTATION_ID,
      'Cancelado por el paciente',
      USER_ID,
    );

    expect(result.status).toBe('VOIDED');
  });

  it('throws BadRequestException when trying to void a PAID consultation', async () => {
    const paidConsultation = {
      ...scheduledConsultation,
      status: 'PAID' as const,
    };
    const prisma = buildPrisma({
      consultation: {
        findFirst: jest.fn().mockResolvedValue(paidConsultation),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirstOrThrow: jest.fn(),
        updateMany: jest.fn(),
      },
    });
    const service = new ConsultationsService(
      prisma,
      buildMailer(),
      buildAuditLog(),
      buildConfigService(),
    );

    await expect(
      service.void(TENANT_ID, CONSULTATION_ID, 'Motivo', USER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when consultation does not exist', async () => {
    const prisma = buildPrisma({
      consultation: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirstOrThrow: jest.fn(),
        updateMany: jest.fn(),
      },
    });
    const service = new ConsultationsService(
      prisma,
      buildMailer(),
      buildAuditLog(),
      buildConfigService(),
    );

    await expect(
      service.void(TENANT_ID, CONSULTATION_ID, 'Motivo', USER_ID),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── findToday ────────────────────────────────────────────────────────────────

describe('ConsultationsService.findToday', () => {
  it('returns SCHEDULED and PENDING consultations for today ordered by date ASC', async () => {
    const todayConsultations = [
      {
        ...scheduledConsultation,
        status: 'SCHEDULED' as const,
        date: new Date('2026-09-22T08:00:00.000Z'),
      },
      {
        ...scheduledConsultation,
        id: 'c-2',
        status: 'PENDING' as const,
        date: new Date('2026-09-22T10:00:00.000Z'),
      },
    ];
    const prisma = buildPrisma({
      consultation: {
        findMany: jest.fn().mockResolvedValue(todayConsultations),
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
    });
    const service = new ConsultationsService(
      prisma,
      buildMailer(),
      buildAuditLog(),
      buildConfigService(),
    );

    const result = await service.findToday(TENANT_ID);

    expect(result).toHaveLength(2);
    expect(result[0]?.status).toBe('SCHEDULED');
    expect(result[1]?.status).toBe('PENDING');

    const findManyCall = (prisma.consultation.findMany as jest.Mock).mock
      .calls[0][0];
    expect(findManyCall.where.status).toEqual({ in: ['SCHEDULED', 'PENDING'] });
    expect(findManyCall.where.tenantId).toBe(TENANT_ID);
    expect(findManyCall.orderBy).toEqual({ date: 'asc' });
  });
});
