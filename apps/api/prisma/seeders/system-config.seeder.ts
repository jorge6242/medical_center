import type { Prisma, PrismaClient } from '@prisma/client';

const TENANT_ID = 'tenant-demo-001';

export async function seedSystemConfig(
  prisma: PrismaClient | Prisma.TransactionClient,
  tenantId = TENANT_ID,
): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { tenantId_key: { tenantId, key: 'igtf_rate' } },
    update: {},
    create: {
      tenantId,
      key: 'igtf_rate',
      value: '0',
    },
  });

  console.warn('✓ SystemConfig seeded (igtf_rate=0)');
}
