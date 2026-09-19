import { DEMO_TENANT_ID } from './types';

import type { Patient, PrismaClient } from '@prisma/client';

export async function seedDemoLabOrders(
  prisma: PrismaClient,
  patients: Patient[],
): Promise<void> {
  const labTests = await prisma.labTestCatalog.findMany({
    where: { tenantId: DEMO_TENANT_ID },
  });

  if (labTests.length === 0) return;

  // Use first 3 patients for lab orders
  const [patient1, patient2, patient3] = patients;
  if (!patient1 || !patient2 || !patient3) return;

  const orders = [
    { patient: patient1, testIndices: [0, 1, 2] },     // Hemograma, Glucosa, Perfil Lipídico
    { patient: patient2, testIndices: [3, 4, 5] },     // Creatinina, Urea, TSH
    { patient: patient3, testIndices: [6, 7, 8] },    // T3, T4, Orina
  ];

  for (const orderData of orders) {
    const selectedTests = orderData.testIndices
      .map((i) => labTests[i])
      .filter((t): t is NonNullable<typeof t> => Boolean(t));

    if (selectedTests.length === 0) continue;

    const totalUsd = selectedTests.reduce((sum, t) => sum + Number(t.priceUsd), 0);

    await prisma.labOrder.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        patientId: orderData.patient.id,
        totalUsd,
        status: 'PENDING',
        tests: {
          create: selectedTests.map((t) => ({
            labTestId: t.id,
            testName: t.name,
            priceUsd: t.priceUsd,
          })),
        },
      },
    });
  }

  console.warn('✓ Demo lab orders seeded');
}
