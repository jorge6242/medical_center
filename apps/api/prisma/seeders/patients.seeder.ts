import type { PrismaClient } from '@prisma/client';

const TENANT_ID = 'tenant-demo-001';

const PATIENTS = [
  {
    documentType: 'V' as const,
    documentId: '11111111',
    name: 'Ana Pérez',
    phone: '0412-1111111',
    gender: 'FEMININE' as const,
    birthDate: new Date('1990-05-15'),
  },
  {
    documentType: 'V' as const,
    documentId: '22222222',
    name: 'Pedro Gómez',
    phone: '0414-2222222',
    gender: 'MASCULINE' as const,
    birthDate: new Date('1985-08-22'),
  },
  {
    documentType: 'V' as const,
    documentId: '33333333',
    name: 'Laura Torres',
    phone: '0416-3333333',
    gender: 'FEMININE' as const,
    birthDate: new Date('2000-01-10'),
  },
  {
    documentType: 'E' as const,
    documentId: '44444444',
    name: 'Sofía Ramírez',
    phone: '0424-4444444',
    gender: 'FEMININE' as const,
    birthDate: new Date('1978-11-30'),
  },
  {
    documentType: 'V' as const,
    documentId: '55555555',
    name: 'Miguel Hernández',
    phone: '0426-5555555',
    gender: 'MASCULINE' as const,
    birthDate: new Date('1995-03-18'),
  },
];

export async function seedPatients(prisma: PrismaClient): Promise<void> {
  for (const patData of PATIENTS) {
    await prisma.patient.upsert({
      where: {
        tenantId_documentType_documentId: {
          tenantId: TENANT_ID,
          documentType: patData.documentType,
          documentId: patData.documentId,
        },
      },
      update: {},
      create: {
        tenantId: TENANT_ID,
        ...patData,
      },
    });
  }

  console.warn('✓ Pacientes seeded');
}
