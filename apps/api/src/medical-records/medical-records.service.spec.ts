import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { MedicalRecordExportFormat } from './dto/generate-medical-record-export.dto';
import { MedicalRecordsService } from './medical-records.service';

import type { PrismaService } from '../database/prisma.service';

describe('MedicalRecordsService', () => {
  const prisma = {
    consultation: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    medicalRecord: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    generatedReport: {
      upsert: jest.fn(),
      create: jest.fn(),
    },
    patient: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((operations: Array<Promise<unknown>>) => Promise.all(operations)),
  } as unknown as PrismaService;
  const service = new MedicalRecordsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a medical record from an existing consultation', async () => {
    (prisma.consultation.findFirst as jest.Mock).mockResolvedValue({
      id: 'consult-1',
      tenantId: 'tenant-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      status: 'PAID',
      date: new Date('2026-01-02T10:00:00.000Z'),
      patient: {
        id: 'patient-1',
        name: 'Maria Lopez',
        documentType: 'V',
        documentId: '123',
      },
      doctor: {
        id: 'doctor-1',
        name: 'Dr. Gomez',
      },
      medicalRecord: null,
    });
    (prisma.medicalRecord.create as jest.Mock).mockResolvedValue({
      id: 'record-1',
      tenantId: 'tenant-1',
      patientId: 'patient-1',
      consultationId: 'consult-1',
      createdById: 'user-1',
      doctorId: 'doctor-1',
      templateType: 'GYNECOLOGY_ONLY',
      templateVersion: '1.0.0',
      templateSnapshot: null,
      recordedAt: new Date('2026-01-02T11:00:00.000Z'),
      createdAt: new Date('2026-01-02T11:00:00.000Z'),
      updatedAt: new Date('2026-01-02T11:00:00.000Z'),
      clinicalData: { anamnesis: { reason: 'Dolor' } },
      status: 'COMPLETED',
      patient: {
        id: 'patient-1',
        name: 'Maria Lopez',
        documentType: 'V',
        documentId: '123',
      },
      doctor: {
        id: 'doctor-1',
        name: 'Dr. Gomez',
      },
      consultation: {
        id: 'consult-1',
        date: new Date('2026-01-02T10:00:00.000Z'),
        services: [{ specialtyName: 'Ginecología' }],
      },
      createdBy: {
        id: 'user-1',
        name: 'Admin',
      },
    });

    const result = await service.create('tenant-1', 'user-1', {
      patientId: 'patient-1',
      consultationId: 'consult-1',
      templateType: 'GYNECOLOGY_ONLY',
      templateVersion: '1.0.0',
      clinicalData: { anamnesis: { reason: 'Dolor' } },
    });

    expect(prisma.consultation.findFirst).toHaveBeenCalledWith({
      where: { id: 'consult-1', tenantId: 'tenant-1' },
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
    expect(prisma.medicalRecord.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        patientId: 'patient-1',
        consultationId: 'consult-1',
        doctorId: 'doctor-1',
        createdById: 'user-1',
        templateType: 'GYNECOLOGY_ONLY',
        templateVersion: '1.0.0',
        templateSnapshot: Prisma.JsonNull,
        clinicalData: { anamnesis: { reason: 'Dolor' } },
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
        recordedAt: true,
        createdAt: true,
        updatedAt: true,
        clinicalData: true,
        status: true,
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
    expect(result).toMatchObject({
      id: 'record-1',
      consultationId: 'consult-1',
      patientId: 'patient-1',
      doctorName: 'Dr. Gomez',
      patientName: 'Maria Lopez',
    });
  });

  it('rejects duplicate medical records for the same consultation', async () => {
    (prisma.consultation.findFirst as jest.Mock).mockResolvedValue({
      id: 'consult-1',
      tenantId: 'tenant-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      status: 'PAID',
      date: new Date('2026-01-02T10:00:00.000Z'),
      patient: {
        id: 'patient-1',
        name: 'Maria Lopez',
        documentType: 'V',
        documentId: '123',
      },
      doctor: {
        id: 'doctor-1',
        name: 'Dr. Gomez',
      },
      medicalRecord: { id: 'record-1' },
    });

    await expect(
      service.create('tenant-1', 'user-1', {
        patientId: 'patient-1',
        consultationId: 'consult-1',
        templateType: 'GYNECOLOGY_ONLY',
        clinicalData: { anamnesis: { reason: 'Dolor' } },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.medicalRecord.create).not.toHaveBeenCalled();
  });

  it('rejects consultations outside the tenant scope without creating a medical record', async () => {
    (prisma.consultation.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.create('tenant-1', 'user-1', {
        patientId: 'patient-1',
        consultationId: 'consult-other-tenant',
        templateType: 'GYNECOLOGY_ONLY',
        clinicalData: { anamnesis: { reason: 'Dolor' } },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.consultation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'consult-other-tenant', tenantId: 'tenant-1' },
      }),
    );
    expect(prisma.medicalRecord.create).not.toHaveBeenCalled();
  });

  it('rejects consultations that do not belong to the requested patient', async () => {
    (prisma.consultation.findFirst as jest.Mock).mockResolvedValue({
      id: 'consult-1',
      tenantId: 'tenant-1',
      patientId: 'patient-2',
      doctorId: 'doctor-1',
      status: 'PAID',
      date: new Date('2026-01-02T10:00:00.000Z'),
      patient: {
        id: 'patient-2',
        name: 'Otra Paciente',
        documentType: 'V',
        documentId: '456',
      },
      doctor: {
        id: 'doctor-1',
        name: 'Dr. Gomez',
      },
      medicalRecord: null,
    });

    await expect(
      service.create('tenant-1', 'user-1', {
        patientId: 'patient-1',
        consultationId: 'consult-1',
        templateType: 'GYNECOLOGY_ONLY',
        clinicalData: { anamnesis: { reason: 'Dolor' } },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.medicalRecord.create).not.toHaveBeenCalled();
  });

  it('rejects pending consultations without creating a medical record', async () => {
    (prisma.consultation.findFirst as jest.Mock).mockResolvedValue({
      id: 'consult-1',
      tenantId: 'tenant-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      status: 'PENDING',
      date: new Date('2026-01-02T10:00:00.000Z'),
      patient: {
        id: 'patient-1',
        name: 'Maria Lopez',
        documentType: 'V',
        documentId: '123',
      },
      doctor: {
        id: 'doctor-1',
        name: 'Dr. Gomez',
      },
      medicalRecord: null,
    });

    await expect(
      service.create('tenant-1', 'user-1', {
        patientId: 'patient-1',
        consultationId: 'consult-1',
        templateType: 'GYNECOLOGY_ONLY',
        clinicalData: { anamnesis: { reason: 'Dolor' } },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.medicalRecord.create).not.toHaveBeenCalled();
  });

  it('rejects voided consultations without creating a medical record', async () => {
    (prisma.consultation.findFirst as jest.Mock).mockResolvedValue({
      id: 'consult-1',
      tenantId: 'tenant-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      status: 'VOIDED',
      date: new Date('2026-01-02T10:00:00.000Z'),
      patient: {
        id: 'patient-1',
        name: 'Maria Lopez',
        documentType: 'V',
        documentId: '123',
      },
      doctor: {
        id: 'doctor-1',
        name: 'Dr. Gomez',
      },
      medicalRecord: null,
    });

    await expect(
      service.create('tenant-1', 'user-1', {
        patientId: 'patient-1',
        consultationId: 'consult-1',
        templateType: 'GYNECOLOGY_ONLY',
        clinicalData: { anamnesis: { reason: 'Dolor' } },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.medicalRecord.create).not.toHaveBeenCalled();
  });

  it('returns the latest records for a patient', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      clinicalHistory: null,
    });
    (prisma.medicalRecord.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'record-2',
        tenantId: 'tenant-1',
        patientId: 'patient-1',
        consultationId: 'consult-2',
        doctorId: 'doctor-1',
        createdById: 'user-1',
        templateType: 'GYNECOLOGY_ONLY',
        templateVersion: '1.0.0',
        templateSnapshot: null,
        recordedAt: new Date('2026-01-03T11:00:00.000Z'),
        createdAt: new Date('2026-01-03T11:00:00.000Z'),
        updatedAt: new Date('2026-01-03T11:00:00.000Z'),
        clinicalData: { diagnosis: 'Control' },
        status: 'COMPLETED',
        patient: {
          id: 'patient-1',
          name: 'Maria Lopez',
          documentType: 'V',
          documentId: '123',
        },
        doctor: { id: 'doctor-1', name: 'Dr. Gomez' },
        consultation: {
          id: 'consult-2',
          date: new Date('2026-01-03T10:00:00.000Z'),
          services: [{ specialtyName: 'Ginecología' }],
        },
        createdBy: { id: 'user-1', name: 'Admin' },
      },
      {
        id: 'record-1',
        tenantId: 'tenant-1',
        patientId: 'patient-1',
        consultationId: 'consult-1',
        doctorId: 'doctor-2',
        createdById: 'user-2',
        templateType: 'GYNECOLOGY_ONLY',
        templateVersion: '1.0.0',
        templateSnapshot: null,
        recordedAt: new Date('2026-01-02T11:00:00.000Z'),
        createdAt: new Date('2026-01-02T11:00:00.000Z'),
        updatedAt: new Date('2026-01-02T11:00:00.000Z'),
        clinicalData: { diagnosis: 'Primera consulta' },
        status: 'COMPLETED',
        patient: {
          id: 'patient-1',
          name: 'Maria Lopez',
          documentType: 'V',
          documentId: '123',
        },
        doctor: { id: 'doctor-2', name: 'Dr. Ruiz' },
        consultation: {
          id: 'consult-1',
          date: new Date('2026-01-02T10:00:00.000Z'),
          services: [{ specialtyName: 'Ginecología' }],
        },
        createdBy: { id: 'user-2', name: 'Admin 2' },
      },
    ]);

    const result = await service.findByPatient('tenant-1', 'patient-1');

    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: 'patient-1', tenantId: 'tenant-1', isActive: true },
      select: { id: true, clinicalHistory: true },
    });
    expect(prisma.medicalRecord.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', patientId: 'patient-1' },
      orderBy: { recordedAt: 'desc' },
      select: expect.any(Object),
    });
    expect(result.records).toHaveLength(2);
    expect(result.records[0]).toMatchObject({ id: 'record-2', doctorName: 'Dr. Gomez' });
    expect(result.records[1]).toMatchObject({ id: 'record-1', doctorName: 'Dr. Ruiz' });
  });

  it('throws when reading a missing medical record', async () => {
    (prisma.medicalRecord.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne('tenant-1', 'record-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists paid consultations with report state for the consultations view', async () => {
    (prisma.consultation.count as jest.Mock).mockResolvedValue(2);
    (prisma.consultation.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'consult-2',
        date: new Date('2026-01-03T10:00:00.000Z'),
        patientId: 'patient-2',
        doctorId: 'doctor-1',
        patient: { documentType: 'V', documentId: '456', name: 'Ana Perez' },
        doctor: { name: 'Dr. Gomez' },
        services: [
          {
            serviceName: 'Consulta obstétrica',
            specialtyName: 'Obstetricia',
            priceUsd: new Prisma.Decimal('50.00'),
          },
        ],
        medicalRecord: { id: 'record-2' },
      },
      {
        id: 'consult-1',
        date: new Date('2026-01-02T10:00:00.000Z'),
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        patient: { documentType: 'V', documentId: '123', name: 'Maria Lopez' },
        doctor: { name: 'Dr. Gomez' },
        services: [
          {
            serviceName: 'Consulta ginecológica',
            specialtyName: 'Ginecología',
            priceUsd: new Prisma.Decimal('40.00'),
          },
        ],
        medicalRecord: null,
      },
    ]);

    const result = await service.findPaidConsultations(
      { sub: 'user-1', tenantId: 'tenant-1', email: 'test@test.com', role: 'admin', doctorId: null, permissions: [], roleVersion: 1 },
      { page: 1, limit: 10, search: 'maria' },
    );

    expect(prisma.consultation.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tenantId: 'tenant-1',
        status: 'PAID',
      }),
    });
    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
        orderBy: { date: 'desc' },
      }),
    );
    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: 'consult-2',
          status: 'PAID',
          patientName: 'Ana Perez',
          patientDocument: 'V-456',
          doctorName: 'Dr. Gomez',
          medicalRecordId: 'record-2',
          canCreateMedicalRecord: false,
        }),
        expect.objectContaining({
          id: 'consult-1',
          patientName: 'Maria Lopez',
          patientDocument: 'V-123',
          medicalRecordId: null,
          canCreateMedicalRecord: true,
        }),
      ],
      meta: {
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  });

  it('generates a medical record export inline and stores it as completed', async () => {
    (prisma.medicalRecord.findFirst as jest.Mock).mockResolvedValue({ id: 'record-1' });

    const result = await service.createExportJob('tenant-1', 'user-1', 'record-1', {
      format: MedicalRecordExportFormat.PDF,
    });

    expect(prisma.medicalRecord.findFirst).toHaveBeenCalledWith({
      where: { id: 'record-1', tenantId: 'tenant-1' },
      select: { id: true },
    });
    expect(prisma.generatedReport.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tenantId: 'tenant-1',
          format: 'pdf',
          filename: 'informe-medico-record-1.pdf',
          mimeType: 'application/pdf',
          status: 'completed',
          sizeBytes: expect.any(Number),
        }),
      }),
    );
    expect(result).toMatchObject({
      status: 'completed',
      progress: 100,
      format: 'pdf',
      filename: 'informe-medico-record-1.pdf',
    });
  });

  it('does not generate an export for a missing medical record', async () => {
    (prisma.medicalRecord.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.createExportJob('tenant-1', 'user-1', 'missing-record', { format: MedicalRecordExportFormat.PDF }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.generatedReport.upsert).not.toHaveBeenCalled();
  });
});
