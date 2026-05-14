import type { PrismaClient } from '@prisma/client';

const TENANT_ID = 'tenant-demo-001';

export async function seedExchangeRates(prisma: PrismaClient): Promise<void> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.exchangeRate.upsert({
    where: { tenantId_date: { tenantId: TENANT_ID, date: today } },
    update: {},
    create: {
      tenantId: TENANT_ID,
      rate: 36.5,
      date: today,
      source: 'MANUAL',
    },
  });

  console.warn('✓ Tasa BCV demo seeded (36.50 Bs/USD)');
}
