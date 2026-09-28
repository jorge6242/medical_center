import { PatientsService } from './patients.service';

import type { PrismaService } from '../database/prisma.service';
import type { NotificationService } from '../notifications/notifications.service';
import type { RailwayBucketService } from '../railway-bucket/railway-bucket.service';

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
