import { DEMO_TENANT_ID } from './types';

import type { PrismaClient, Doctor } from '@prisma/client';


const DOCTORS = [
  {
    id: 'demo-doc-001',
    name: 'Dra. Ana López',
    email: 'ana.lopez@demo.local',
    phone: '0412-1000001',
    documentType: 'V' as const,
    documentId: '90000001',
    splitPercentage: 70,
    specialtyNames: ['Ginecología', 'Obstetricia', 'Ginecología / Obstetricia'],
    bankName: 'Banco de Venezuela',
    accountNumber: '0102-0000-0000-00000001',
  },
  {
    id: 'demo-doc-002',
    name: 'Dr. Carlos Díaz',
    email: 'carlos.diaz@demo.local',
    phone: '0414-1000002',
    documentType: 'V' as const,
    documentId: '90000002',
    splitPercentage: 67.5,
    specialtyNames: ['Pediatría', 'Medicina General'],
    bankName: 'Banesco',
    accountNumber: '0134-0000-0000-00000002',
  },
  {
    id: 'demo-doc-003',
    name: 'Dr. Luis Pérez',
    email: 'luis.perez@demo.local',
    phone: '0424-1000003',
    documentType: 'V' as const,
    documentId: '90000003',
    splitPercentage: 60,
    specialtyNames: ['Cardiología'],
    bankName: 'Mercantil',
    accountNumber: '0105-0000-0000-00000003',
  },
  {
    id: 'demo-doc-004',
    name: 'Dra. María Torres',
    email: 'maria.torres@demo.local',
    phone: '0426-1000004',
    documentType: 'E' as const,
    documentId: '90000004',
    splitPercentage: 55,
    specialtyNames: ['Dermatología'],
    bankName: 'Provincial',
    accountNumber: '0108-0000-0000-00000004',
  },
] as const;

export async function seedDemoDoctors(prisma: PrismaClient): Promise<Doctor[]> {
  const doctors: Doctor[] = [];

  for (const data of DOCTORS) {
    const doctor = await prisma.doctor.upsert({
      where: {
        tenantId_documentType_documentId: {
          tenantId: DEMO_TENANT_ID,
          documentType: data.documentType,
          documentId: data.documentId,
        },
      },
      update: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        splitPercentage: data.splitPercentage,
      },
      create: {
        id: data.id,
        tenantId: DEMO_TENANT_ID,
        name: data.name,
        email: data.email,
        phone: data.phone,
        documentType: data.documentType,
        documentId: data.documentId,
        splitPercentage: data.splitPercentage,
      },
    });

    doctors.push(doctor);

    for (let i = 0; i < data.specialtyNames.length; i++) {
      const specialty = await prisma.specialty.findFirstOrThrow({
        where: { tenantId: DEMO_TENANT_ID, name: data.specialtyNames[i] },
      });

      await prisma.doctorSpecialty.upsert({
        where: { doctorId_specialtyId: { doctorId: doctor.id, specialtyId: specialty.id } },
        update: { isPrimary: i === 0 },
        create: {
          doctorId: doctor.id,
          specialtyId: specialty.id,
          isPrimary: i === 0,
        },
      });
    }

    await prisma.doctorBankAccount.upsert({
      where: { id: `${doctor.id}-bank-main` },
      update: {
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        documentId: data.documentId,
        phone: data.phone,
      },
      create: {
        id: `${doctor.id}-bank-main`,
        doctorId: doctor.id,
        bankName: data.bankName,
        accountType: 'SAVINGS',
        accountNumber: data.accountNumber,
        documentId: data.documentId,
        phone: data.phone,
        isDefault: true,
      },
    });
  }

  return doctors;
}
