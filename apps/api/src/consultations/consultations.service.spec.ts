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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const USER_ID = 'user-1';
const PATIENT_ID = 'patient-1';
const DOCTOR_ID = 'doctor-1';
const DS_ID_1 = 'ds-1';
const CONSULTATION_ID = 'consultation-1';

const activePatient = {
  id: PATIENT_ID,
  tenantId: TENANT_ID,
  name: 'Ana Pérez',
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
  date: new Date('2026-10-01T09:00:00.000Z'),
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

// ─── createScheduled ──────────────────────────────────────────────────────────

describe('ConsultationsService.createScheduled', () => {
  const dto: CreateScheduledConsultationDto = {
    patientId: PATIENT_ID,
    doctorId: DOCTOR_ID,
    date: new Date('2026-10-01T09:00:00.000Z'),
    doctorServiceIds: [DS_ID_1],
    notes: 'Revisión anual',
    sendEmailNotification: true,
  };

  it('creates a SCHEDULED consultation with services snapshot', async () => {
    const prisma = buildPrisma();
    const mailer = buildMailer();
    const auditLog = buildAuditLog();
    const service = new ConsultationsService(prisma, mailer, auditLog);

    const result = await service.createScheduled(TENANT_ID, USER_ID, dto);

    expect(result.status).toBe('SCHEDULED');
    expect(result.services).toHaveLength(1);
    expect(result.services[0]?.serviceName).toBe('Consulta General');
  });

  it('sends email when sendEmailNotification=true and doctor has email', async () => {
    const prisma = buildPrisma();
    const mailer = buildMailer();
    const auditLog = buildAuditLog();
    const service = new ConsultationsService(prisma, mailer, auditLog);

    await service.createScheduled(TENANT_ID, USER_ID, {
      ...dto,
      sendEmailNotification: true,
    });

    expect(mailer.sendEmail).toHaveBeenCalled();
  });

  it('does NOT send email when sendEmailNotification=false', async () => {
    const prisma = buildPrisma();
    const mailer = buildMailer();
    const auditLog = buildAuditLog();
    const service = new ConsultationsService(prisma, mailer, auditLog);

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
    const service = new ConsultationsService(prisma, mailer, auditLog);

    await service.createScheduled(TENANT_ID, USER_ID, {
      ...dto,
      sendEmailNotification: true,
    });

    expect(mailer.sendEmail).not.toHaveBeenCalled();
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
    const service = new ConsultationsService(prisma, mailer, auditLog);

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
    const service = new ConsultationsService(prisma, mailer, auditLog);

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
    const service = new ConsultationsService(prisma, mailer, auditLog);

    await expect(
      service.createScheduled(TENANT_ID, USER_ID, dto),
    ).rejects.toThrow(BadRequestException);
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
          medicalRecord: { id: 'medical-record-1' },
        }),
      },
    });
    const service = new ConsultationsService(
      prisma,
      buildMailer(),
      buildAuditLog(),
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
