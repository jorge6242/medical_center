import { DEMO_TENANT_ID } from './types';

import type { PrismaClient, Specialty } from '@prisma/client';


const SPECIALTIES = [
  {
    id: 'demo-spec-gin',
    name: 'Ginecología',
    templateType: 'GYNECOLOGY_ONLY',
    services: [
      { id: 'demo-svc-gin-cons', name: 'Consulta', price: 30 },
      { id: 'demo-svc-gin-eco', name: 'Ecografía', price: 25 },
    ],
  },
  {
    id: 'demo-spec-obst',
    name: 'Obstetricia',
    templateType: 'OBSTETRICS_ECO',
    services: [
      { id: 'demo-svc-obst-control', name: 'Control prenatal', price: 35 },
      { id: 'demo-svc-obst-eco', name: 'Ecografía obstétrica', price: 45 },
    ],
  },
  {
    id: 'demo-spec-gin-obst',
    name: 'Ginecología / Obstetricia',
    templateType: 'GYNECOLOGY_OBSTETRICS',
    services: [
      { id: 'demo-svc-gin-obst-cons', name: 'Consulta gineco-obstétrica', price: 40 },
      { id: 'demo-svc-gin-obst-eco', name: 'Control gineco-obstétrico + ecografía', price: 60 },
    ],
  },
  {
    id: 'demo-spec-ped',
    name: 'Pediatría',
    templateType: null,
    services: [{ id: 'demo-svc-ped-cons', name: 'Consulta', price: 25 }],
  },
  {
    id: 'demo-spec-med',
    name: 'Medicina General',
    templateType: null,
    services: [{ id: 'demo-svc-med-cons', name: 'Consulta', price: 20 }],
  },
  {
    id: 'demo-spec-cardio',
    name: 'Cardiología',
    templateType: null,
    services: [
      { id: 'demo-svc-card-cons', name: 'Consulta', price: 40 },
      { id: 'demo-svc-card-eco', name: 'Ecocardiograma', price: 60 },
    ],
  },
  {
    id: 'demo-spec-derma',
    name: 'Dermatología',
    templateType: null,
    services: [{ id: 'demo-svc-der-cons', name: 'Consulta', price: 35 }],
  },
] as const;

export async function seedDemoSpecialties(prisma: PrismaClient): Promise<Specialty[]> {
  const specialties: Specialty[] = [];

  for (const specData of SPECIALTIES) {
    const specialty = await prisma.specialty.upsert({
      where: { tenantId_name: { tenantId: DEMO_TENANT_ID, name: specData.name } },
      update: { templateType: specData.templateType ?? null },
      create: {
        id: specData.id,
        tenantId: DEMO_TENANT_ID,
        name: specData.name,
        templateType: specData.templateType ?? null,
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
