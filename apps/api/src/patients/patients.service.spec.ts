import { PatientsService } from './patients.service';

import type { PrismaService } from '../database/prisma.service';

describe('PatientsService', () => {
  const prisma = {
    patient: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    consultation: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const service = new PatientsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
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
  });

  it('persists clinicalHistory when updating a patient', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.patient.update as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      clinicalHistory: { antecedentesGinecologicos: { menarquiaEdad: 12 } },
    });

    await service.update('tenant-1', 'patient-1', {
      clinicalHistory: { antecedentesGinecologicos: { menarquiaEdad: 12 } },
    } as never);

    expect(prisma.patient.update).toHaveBeenCalledWith({
      where: { id: 'patient-1' },
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
        services: [{ serviceName: 'Consulta ginecológica', specialtyName: 'Ginecología' }],
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
        services: [{ serviceName: 'Consulta ginecológica', specialtyName: 'Ginecología' }],
      },
    ]);
  });
});
