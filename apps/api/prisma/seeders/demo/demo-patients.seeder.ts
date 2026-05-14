import { DEMO_TENANT_ID } from './types';

import type { PrismaClient, Patient } from '@prisma/client';


const PATIENTS = [
  ['V', '91000001', 'Ariana Silva'],
  ['V', '91000002', 'José Medina'],
  ['V', '91000003', 'Carla Pérez'],
  ['E', '91000004', 'Marta Rojas'],
  ['V', '91000005', 'Andrés Torres'],
  ['V', '91000006', 'Valentina Gómez'],
  ['V', '91000007', 'Luis Ortega'],
  ['V', '91000008', 'María Fuentes'],
  ['V', '91000009', 'Pedro López'],
  ['V', '91000010', 'Gabriela Díaz'],
] as const;

export async function seedDemoPatients(prisma: PrismaClient): Promise<Patient[]> {
  const patients: Patient[] = [];

  for (const [documentType, documentId, name] of PATIENTS) {
    const patient = await prisma.patient.upsert({
      where: {
        tenantId_documentType_documentId: {
          tenantId: DEMO_TENANT_ID,
          documentType,
          documentId,
        },
      },
      update: { name },
      create: {
        tenantId: DEMO_TENANT_ID,
        documentType,
        documentId,
        name,
      },
    });

    patients.push(patient);
  }

  return patients;
}
