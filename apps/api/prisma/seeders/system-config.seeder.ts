import type { PrismaClient } from '@prisma/client';

const TENANT_ID = 'tenant-demo-001';

export async function seedSystemConfig(prisma: PrismaClient): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { tenantId_key: { tenantId: TENANT_ID, key: 'igtf_rate' } },
    update: {},
    create: {
      tenantId: TENANT_ID,
      key: 'igtf_rate',
      value: '0',
    },
  });

  console.warn('✓ SystemConfig seeded (igtf_rate=0 — Decreto 4.972 jul-2024)');
}
