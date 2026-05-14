import { DEMO_TENANT_ID } from './types';

import type { PrismaClient, Specialty } from '@prisma/client';


const SPECIALTIES = [
  {
    id: 'demo-spec-gin',
    name: 'Ginecología',
    services: [
      { id: 'demo-svc-gin-cons', name: 'Consulta', price: 30 },
      { id: 'demo-svc-gin-eco', name: 'Ecografía', price: 25 },
    ],
  },
  {
    id: 'demo-spec-ped',
    name: 'Pediatría',
    services: [{ id: 'demo-svc-ped-cons', name: 'Consulta', price: 25 }],
  },
  {
    id: 'demo-spec-med',
    name: 'Medicina General',
    services: [{ id: 'demo-svc-med-cons', name: 'Consulta', price: 20 }],
  },
  {
    id: 'demo-spec-cardio',
    name: 'Cardiología',
    services: [
      { id: 'demo-svc-card-cons', name: 'Consulta', price: 40 },
      { id: 'demo-svc-card-eco', name: 'Ecocardiograma', price: 60 },
    ],
  },
  {
    id: 'demo-spec-derma',
    name: 'Dermatología',
    services: [{ id: 'demo-svc-der-cons', name: 'Consulta', price: 35 }],
  },
] as const;

export async function seedDemoSpecialties(prisma: PrismaClient): Promise<Specialty[]> {
  const specialties: Specialty[] = [];

  for (const specData of SPECIALTIES) {
    const specialty = await prisma.specialty.upsert({
      where: { tenantId_name: { tenantId: DEMO_TENANT_ID, name: specData.name } },
      update: {},
      create: {
        id: specData.id,
        tenantId: DEMO_TENANT_ID,
        name: specData.name,
      },
    });

    specialties.push(specialty);

    for (const svcData of specData.services) {
      const service = await prisma.service.upsert({
        where: { name: svcData.name },
        update: {},
        create: { id: svcData.id, name: svcData.name },
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

  return specialties;
}
