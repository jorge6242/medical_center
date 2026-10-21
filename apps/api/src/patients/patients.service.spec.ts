import { ConflictException, NotFoundException } from '@nestjs/common';

import { PatientsService } from './patients.service';

import type { PrismaService } from '../database/prisma.service';
import type { NotificationService } from '../notifications/notifications.service';
import type { RailwayBucketService } from '../railway-bucket/railway-bucket.service';

const patientWithRepresentatives = {
  id: 'patient-1',
  tenantId: 'tenant-1',
  documentType: 'M',
  documentId: '20260930A3F1',
  name: 'Ana menor',
  phone: '04140000000',
  email: null,
  birthDate: null,
  gender: null,
  isActive: true,
  clinicalHistory: { antecedentesPersonales: { alergias: 'Polen' } },
  createdAt: new Date('2026-09-30T00:00:00.000Z'),
  updatedAt: new Date('2026-09-30T00:00:00.000Z'),
  representatives: [
    {
      relationship: 'Madre',
      representative: {
        name: 'Maria Lopez',
        documentType: 'V',
        documentId: '12345678',
        phone: '04141111111',
      },
    },
    {
      relationship: 'Padre',
      representative: {
        name: 'Juan Lopez',
        documentType: 'V',
        documentId: '87654321',
        phone: '04142222222',
      },
    },
  ],
};

describe('PatientsService', () => {
  const prisma = {
    patient: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirstOrThrow: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    consultation: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    medicalRecord: { count: jest.fn() },
    labOrder: { count: jest.fn() },
    reminderLog: { create: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const notificationService = {
    send: jest.fn(),
  } as unknown as NotificationService;

  const railwayBucket = {
    resolveLogoUrl: jest.fn().mockResolvedValue(null),
  } as unknown as RailwayBucketService;

  const service = new PatientsService(
    prisma,
    notificationService,
    railwayBucket,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (railwayBucket.resolveLogoUrl as jest.Mock).mockResolvedValue(null);
  });

  it('persists the manually entered minor document on create', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.patient.create as jest.Mock).mockResolvedValue(
      patientWithRepresentatives,
    );
    (prisma.$transaction as jest.Mock).mockImplementation((callback) =>
      callback(prisma),
    );
    await service.create('tenant-1', {
      documentType: 'M',
      documentId: '87654321',
      name: 'Ana menor',
    });
    expect(prisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          documentType: 'M',
          documentId: '87654321',
        }),
      }),
    );
  });

  it('persists the manually entered minor document on update', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(
      patientWithRepresentatives,
    );
    (prisma.patient.findFirstOrThrow as jest.Mock).mockResolvedValue(
      patientWithRepresentatives,
    );
    await service.update('tenant-1', 'patient-1', {
      documentType: 'M',
      documentId: '87654321',
    });
    expect(prisma.patient.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'patient-1', tenantId: 'tenant-1' },
        data: expect.objectContaining({
          documentType: 'M',
          documentId: '87654321',
        }),
      }),
    );
  });

  it('rejects duplicate minor documents within the tenant before creating', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(
      patientWithRepresentatives,
    );
    await expect(
      service.create('tenant-1', {
        documentType: 'M',
        documentId: '87654321',
        name: 'Ana menor',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        documentType: 'M',
        documentId: '87654321',
        isActive: true,
      },
    });
    expect(prisma.patient.create).not.toHaveBeenCalled();
  });

  it('sends a tenant-scoped birthday email and records it', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      tenantId: 'tenant-1',
      name: 'Ana Pérez',
      email: 'ana@example.com',
      tenant: {
        name: 'Centro Médico',
        logoObjectKey: null,
        logoUrl: null,
        email: 'admin@example.com',
      },
    });

    await expect(
      service.sendBirthdayEmail('tenant-1', 'patient-1', 'user-1'),
    ).resolves.toEqual({ message: 'Correo de cumpleaños enviado' });

    expect(prisma.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'patient-1', tenantId: 'tenant-1', isActive: true },
      }),
    );
    expect(notificationService.send).toHaveBeenCalledWith(
      'BIRTHDAY_PATIENT',
      'tenant-1',
      'ana@example.com',
      expect.objectContaining({ patientName: 'Ana Pérez' }),
      'EMAIL',
    );
    expect(prisma.reminderLog.create).toHaveBeenCalled();
  });

  it('includes the patient age in lookup results', async () => {
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'patient-1',
        name: 'Ana Pérez',
        documentType: 'V',
        documentId: '12345678',
        birthDate: new Date('2000-09-01T00:00:00.000Z'),
        representatives: [],
      },
    ]);

    const result = await service.lookup('tenant-1', {
      q: 'Ana',
      limit: 20,
    });

    expect(result.data[0]).toMatchObject({
      name: 'Ana Pérez',
      age: expect.any(Number),
    });
  });

  it('returns clinicalHistory in patient detail responses', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      tenantId: 'tenant-1',
      documentType: 'V',
      documentId: '123',
      name: 'Maria Lopez',
      phone: null,
      email: null,
      birthDate: null,
      gender: null,
      isActive: true,
      clinicalHistory: { antecedentesPersonales: { alergias: 'Ninguna' } },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.findOne('tenant-1', 'patient-1');

    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: 'patient-1', tenantId: 'tenant-1', isActive: true },
      include: {
        representatives: { include: { representative: true } },
      },
    });
    expect(result).toMatchObject({
      id: 'patient-1',
      clinicalHistory: { antecedentesPersonales: { alergias: 'Ninguna' } },
    });
    expect(result).not.toHaveProperty('tenantId');
  });

  it('persists clinicalHistory when updating a patient', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({
      id: 'patient-1',
    });
    (prisma.patient.findFirstOrThrow as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      clinicalHistory: { antecedentesGinecologicos: { menarquiaEdad: 12 } },
    });

    await service.update('tenant-1', 'patient-1', {
      clinicalHistory: { antecedentesGinecologicos: { menarquiaEdad: 12 } },
    } as never);

    expect(prisma.patient.updateMany).toHaveBeenCalledWith({
      where: { id: 'patient-1', tenantId: 'tenant-1' },
      data: {
        name: undefined,
        phone: undefined,
        email: undefined,
        birthDate: undefined,
        gender: undefined,
        clinicalHistory: { antecedentesGinecologicos: { menarquiaEdad: 12 } },
      },
    });
  });

  it('returns all existing representatives after a personal-data update', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(
      patientWithRepresentatives,
    );
    (prisma.patient.findFirstOrThrow as jest.Mock).mockImplementation(
      (query: { include?: { representatives?: unknown } }) =>
        Promise.resolve({
          ...patientWithRepresentatives,
          name: 'Ana Lopez',
          representatives: query.include?.representatives
            ? patientWithRepresentatives.representatives
            : undefined,
        }),
    );

    const result = await service.update('tenant-1', 'patient-1', {
      name: 'Ana Lopez',
    });

    expect(result).toMatchObject({
      name: 'Ana Lopez',
      documentId: '20260930A3F1',
      clinicalHistory: patientWithRepresentatives.clinicalHistory,
      representatives: patientWithRepresentatives.representatives.map(
        ({ relationship, representative }) => ({
          relationship,
          ...representative,
        }),
      ),
    });
    expect(result).not.toHaveProperty('tenantId');
    expect(prisma.patient.findFirstOrThrow).toHaveBeenCalledWith({
      where: { id: 'patient-1', tenantId: 'tenant-1' },
      include: { representatives: { include: { representative: true } } },
    });
    expect(prisma.patient.updateMany).toHaveBeenCalledWith({
      where: { id: 'patient-1', tenantId: 'tenant-1' },
      data: {
        name: 'Ana Lopez',
        phone: undefined,
        email: undefined,
        birthDate: undefined,
        gender: undefined,
        clinicalHistory: undefined,
      },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.consultation.findMany).not.toHaveBeenCalled();
  });

  it('returns an empty representative list for an adult without links', async () => {
    const patient = {
      ...patientWithRepresentatives,
      documentType: 'V',
      representatives: [],
    };
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(patient);
    (prisma.patient.findFirstOrThrow as jest.Mock).mockResolvedValue({
      ...patient,
      phone: '04143333333',
    });

    const result = await service.update('tenant-1', 'patient-1', {
      phone: '04143333333',
    });

    expect(result).toMatchObject({ phone: '04143333333', representatives: [] });
  });

  it.each(['tenant-other', 'tenant-1'])(
    'rejects missing/foreign or inactive patient before writing for %s',
    async (tenantId) => {
      (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'patient-1', { name: 'No permitido' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.patient.findFirst).toHaveBeenCalledWith({
        where: { id: 'patient-1', tenantId, isActive: true },
        include: { representatives: { include: { representative: true } } },
      });
      expect(prisma.patient.updateMany).not.toHaveBeenCalled();
      expect(prisma.patient.findFirstOrThrow).not.toHaveBeenCalled();
    },
  );

  it('queries only paid consultations without medical records for report creation', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      tenantId: 'tenant-1',
      documentType: 'V',
      documentId: '123',
      name: 'Maria Lopez',
      phone: null,
      email: null,
      birthDate: null,
      gender: null,
      isActive: true,
      clinicalHistory: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    (prisma.consultation.findMany as jest.Mock).mockResolvedValue([]);

    await service.findConsultations('tenant-1', 'patient-1');

    expect(prisma.consultation.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        patientId: 'patient-1',
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
  });

  it('maps eligible patient consultations with explicit medical record eligibility', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      tenantId: 'tenant-1',
      documentType: 'V',
      documentId: '123',
      name: 'Maria Lopez',
      phone: null,
      email: null,
      birthDate: null,
      gender: null,
      isActive: true,
      clinicalHistory: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    (prisma.consultation.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'consult-1',
        date: new Date('2026-01-02T10:00:00.000Z'),
        status: 'PAID',
        medicalRecord: null,
        services: [
          {
            serviceName: 'Consulta ginecológica',
            specialtyName: 'Ginecología',
          },
        ],
      },
    ]);

    const result = await service.findConsultations('tenant-1', 'patient-1');

    expect(result).toEqual([
      {
        id: 'consult-1',
        date: new Date('2026-01-02T10:00:00.000Z'),
        status: 'PAID',
        hasMedicalRecord: false,
        canCreateMedicalRecord: true,
        services: [
          {
            serviceName: 'Consulta ginecológica',
            specialtyName: 'Ginecología',
          },
        ],
      },
    ]);
  });

  it('permanently deletes a patient with no clinical or financial movements', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({
      id: 'patient-1',
    });
    (prisma.consultation.count as jest.Mock).mockResolvedValue(0);
    (prisma.medicalRecord.count as jest.Mock).mockResolvedValue(0);
    (prisma.labOrder.count as jest.Mock).mockResolvedValue(0);
    (prisma.patient.delete as jest.Mock).mockResolvedValue({ id: 'patient-1' });

    await service.permanentlyDelete('tenant-1', 'patient-1');

    expect(prisma.consultation.count).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', patientId: 'patient-1' },
    });
    expect(prisma.patient.delete).toHaveBeenCalledWith({
      where: { id: 'patient-1' },
    });
  });

  it('rejects permanent deletion and includes the movement reason', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({
      id: 'patient-1',
    });
    (prisma.consultation.count as jest.Mock).mockResolvedValue(2);
    (prisma.medicalRecord.count as jest.Mock).mockResolvedValue(0);
    (prisma.labOrder.count as jest.Mock).mockResolvedValue(0);

    await expect(
      service.permanentlyDelete('tenant-1', 'patient-1'),
    ).rejects.toMatchObject({
      response: {
        message:
          'No se puede eliminar el paciente porque tiene movimientos registrados',
        reasons: { consultations: 2, medicalRecords: 0, labOrders: 0 },
      },
    });
    expect(prisma.patient.delete).not.toHaveBeenCalled();
  });
});
