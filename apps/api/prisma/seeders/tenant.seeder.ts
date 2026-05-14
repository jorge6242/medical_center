import type { PrismaClient } from '@prisma/client';

export async function seedTenant(prisma: PrismaClient): Promise<void> {
  await prisma.tenant.upsert({
    where: { id: 'tenant-demo-001' },
    update: {},
    create: {
      id: 'tenant-demo-001',
      name: 'Centro Médico Demo',
      slug: 'centro-medico-demo',
    },
  });

  console.warn('✓ Tenant seeded');
}
