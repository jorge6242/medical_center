import type { PrismaClient } from '@prisma/client';

export async function seedExchangeRates(
  prisma: PrismaClient,
  tenantId: string,
): Promise<void> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.exchangeRate.upsert({
    where: { tenantId_date: { tenantId, date: today } },
    update: {},
    create: {
      tenantId,
      rate: 36.5,
      date: today,
      source: 'MANUAL',
    },
  });

  console.warn('✓ Tasa BCV demo seeded (36.50 Bs/USD)');
}
