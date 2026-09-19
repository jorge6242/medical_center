const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const ids = [
    'ec73c24d-20bd-4c8e-9548-7c539ec25e5a', // Obstetricia
    'a38ac10d-b935-410a-b8ce-e986f478e1cd', // Ginecologia / Obstetricia
    '76989e3d-e719-4bd7-a68f-23b4b38d49d2', // Ginecologia
    'f9774b3c-51fd-482a-8512-81638c9f095d', // Ginecologia (duplicated services)
  ];

  for (const id of ids) {
    const consultation = await prisma.consultation.findFirst({
      where: { id, tenantId: 'tenant-demo-001' },
      select: {
        id: true,
        services: {
          select: { specialtyId: true, specialtyName: true },
          take: 1,
        },
      },
    });

    if (!consultation) {
      console.log(id, 'NOT FOUND');
      continue;
    }

    const firstService = consultation.services[0];
    if (!firstService) {
      console.log(id, 'NO SERVICES');
      continue;
    }

    const specialty = await prisma.specialty.findFirst({
      where: { id: firstService.specialtyId, tenantId: 'tenant-demo-001' },
      select: { templateType: true, name: true },
    });

    console.log(id, firstService.specialtyName, specialty?.templateType ?? 'NULL');
  }
}

test().catch(console.error).finally(() => prisma.$disconnect());
