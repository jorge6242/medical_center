import type { PrismaClient } from '@prisma/client';

const TENANT_ID = 'tenant-demo-001';

const DOCTORS = [
  {
    id: 'doc-001',
    userId: 'user-doc-001',
    name: 'Dra. María González',
    email: 'maria.gonzalez@centromedico.demo',
    phone: '0412-1234567',
    documentType: 'V' as const,
    documentId: '12345678',
    splitPercentage: 70,
    specialties: ['Ginecología'],
    bankAccount: {
      bankName: 'Banco de Venezuela',
      accountType: 'SAVINGS' as const,
      accountNumber: '0102-1234-56-0000012345',
      documentId: '12345678',
      phone: '0412-1234567',
    },
  },
  {
    id: 'doc-002',
    userId: 'user-doc-002',
    name: 'Dr. Carlos Rodríguez',
    email: 'carlos.rodriguez@centromedico.demo',
    phone: '0414-7654321',
    documentType: 'V' as const,
    documentId: '87654321',
    splitPercentage: 67.5,
    specialties: ['Pediatría', 'Medicina General'],
    bankAccount: {
      bankName: 'Banesco',
      accountType: 'CHECKING' as const,
      accountNumber: '0134-8765-43-0000087654',
      documentId: '87654321',
      phone: '0414-7654321',
    },
  },
  {
    id: 'doc-003',
    userId: 'user-doc-003',
    name: 'Dr. Luis Martínez',
    email: 'luis.martinez@centromedico.demo',
    phone: '0424-5551234',
    documentType: 'V' as const,
    documentId: '55512345',
    splitPercentage: 33.33,
    specialties: ['Cardiología'],
    bankAccount: {
      bankName: 'Mercantil',
      accountType: 'SAVINGS' as const,
      accountNumber: '0105-5551-23-0000055512',
      documentId: '55512345',
      phone: '0424-5551234',
    },
  },
];

export async function seedDoctors(prisma: PrismaClient): Promise<void> {
  for (const docData of DOCTORS) {
    await prisma.doctor.upsert({
      where: {
        tenantId_documentType_documentId: {
          tenantId: TENANT_ID,
          documentType: docData.documentType,
          documentId: docData.documentId,
        },
      },
      update: {},
      create: {
        id: docData.id,
        tenantId: TENANT_ID,
        userId: docData.userId,
        name: docData.name,
        email: docData.email,
        phone: docData.phone,
        documentType: docData.documentType,
        documentId: docData.documentId,
        splitPercentage: docData.splitPercentage,
      },
    });

    const doctor = await prisma.doctor.findFirstOrThrow({ where: { id: docData.id } });

    for (let i = 0; i < docData.specialties.length; i++) {
      const specName = docData.specialties[i] as string;
      const specialty = await prisma.specialty.findFirstOrThrow({
        where: { tenantId: TENANT_ID, name: specName },
      });

      await prisma.doctorSpecialty.upsert({
        where: { doctorId_specialtyId: { doctorId: doctor.id, specialtyId: specialty.id } },
        update: {},
        create: {
          doctorId: doctor.id,
          specialtyId: specialty.id,
          isPrimary: i === 0,
        },
      });
    }

    const existingAccount = await prisma.doctorBankAccount.findFirst({
      where: { doctorId: doctor.id },
    });

    if (!existingAccount) {
      await prisma.doctorBankAccount.create({
        data: {
          doctorId: doctor.id,
          bankName: docData.bankAccount.bankName,
          accountType: docData.bankAccount.accountType,
          accountNumber: docData.bankAccount.accountNumber,
          documentId: docData.bankAccount.documentId,
          phone: docData.bankAccount.phone,
          isDefault: true,
        },
      });
    }
  }

  console.warn('✓ Doctores seeded');
}
