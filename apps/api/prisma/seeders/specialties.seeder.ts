import type { PrismaClient } from '@prisma/client';

const TENANT_ID = 'tenant-demo-001';

const SPECIALTIES = [
  {
    id: 'spec-gin-001',
    name: 'Ginecología',
    services: [
      { id: 'svc-consult-001', name: 'Consulta', price: 30 },
      { id: 'svc-eco-001', name: 'Ecografía', price: 25 },
      { id: 'svc-consult-eco-001', name: 'Consulta + Ecografía', price: 50 },
    ],
  },
  {
    id: 'spec-ped-001',
    name: 'Pediatría',
    services: [
      { id: 'svc-consult-001', name: 'Consulta', price: 25 },
    ],
  },
  {
    id: 'spec-med-001',
    name: 'Medicina General',
    services: [
      { id: 'svc-consult-001', name: 'Consulta', price: 20 },
    ],
  },
  {
    id: 'spec-cardio-001',
    name: 'Cardiología',
    services: [
      { id: 'svc-consult-001', name: 'Consulta', price: 40 },
      { id: 'svc-eco-cord-001', name: 'Ecocardiograma', price: 60 },
    ],
  },
  {
    id: 'spec-derma-001',
    name: 'Dermatología',
    services: [
      { id: 'svc-consult-001', name: 'Consulta', price: 35 },
    ],
  },
  {
    id: 'spec-oftal-001',
    name: 'Oftalmología',
    services: [
      { id: 'svc-consult-001', name: 'Consulta', price: 30 },
      { id: 'svc-campo-001', name: 'Campo visual', price: 20 },
    ],
  },
];

export async function seedSpecialties(prisma: PrismaClient): Promise<void> {
  for (const specData of SPECIALTIES) {
    await prisma.specialty.upsert({
      where: { tenantId_name: { tenantId: TENANT_ID, name: specData.name } },
      update: {},
      create: {
        id: specData.id,
        tenantId: TENANT_ID,
        name: specData.name,
      },
    });

    for (const svcData of specData.services) {
      await prisma.service.upsert({
        where: { name: svcData.name },
        update: {},
        create: { id: svcData.id, name: svcData.name },
      });

      const specialty = await prisma.specialty.findFirstOrThrow({
        where: { tenantId: TENANT_ID, name: specData.name },
      });
      const service = await prisma.service.findFirstOrThrow({
        where: { name: svcData.name },
      });

      await prisma.servicePrice.upsert({
        where: { specialtyId_serviceId: { specialtyId: specialty.id, serviceId: service.id } },
        update: { priceUsd: svcData.price },
        create: {
          specialtyId: specialty.id,
          serviceId: service.id,
          priceUsd: svcData.price,
        },
      });
    }
  }

  console.warn('✓ Especialidades + servicios seeded');
}
