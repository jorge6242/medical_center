import type { PrismaClient } from '@prisma/client';

const TENANT_ID = 'tenant-demo-001';

const LAB_TESTS = [
  { name: 'Hemograma Completo', priceUsd: 15 },
  { name: 'Glucosa en Ayunas', priceUsd: 10 },
  { name: 'Perfil Lipídico', priceUsd: 25 },
  { name: 'Creatinina', priceUsd: 12 },
  { name: 'Urea', priceUsd: 10 },
  { name: 'TSH (Hormona Tiroidea)', priceUsd: 18 },
  { name: 'T3 Libre', priceUsd: 20 },
  { name: 'T4 Libre', priceUsd: 20 },
  { name: 'Exámen de Orina', priceUsd: 8 },
  { name: 'PCR (Proteína C Reactiva)', priceUsd: 14 },
  { name: 'Hemoglobina Glicosilada (HbA1c)', priceUsd: 22 },
  { name: 'Grupo Sanguíneo y Factor Rh', priceUsd: 10 },
];

export async function seedLabTests(prisma: PrismaClient): Promise<void> {
  for (const test of LAB_TESTS) {
    await prisma.labTestCatalog.upsert({
      where: {
        tenantId_name: { tenantId: TENANT_ID, name: test.name },
      },
      update: {},
      create: {
        tenantId: TENANT_ID,
        name: test.name,
        priceUsd: test.priceUsd,
        isActive: true,
      },
    });
  }

  console.warn('✓ Tests de laboratorio seeded');
}
