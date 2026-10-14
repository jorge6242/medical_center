import {
  DEMO_DATA_TENANT_SLUG,
  DEMO_TENANT_ID,
  DEMO_TENANT_SLUG,
  LEGACY_DEMO_TENANT_ID,
} from './demo-tenant.constants';

import type { PrismaClient } from '@prisma/client';

export async function seedTenant(prisma: PrismaClient): Promise<string> {
  const matches = await Promise.all([
    prisma.tenant.findUnique({ where: { id: LEGACY_DEMO_TENANT_ID } }),
    prisma.tenant.findUnique({ where: { id: DEMO_TENANT_ID } }),
    prisma.tenant.findUnique({ where: { slug: DEMO_TENANT_SLUG } }),
    prisma.tenant.findUnique({ where: { slug: DEMO_DATA_TENANT_SLUG } }),
  ]);
  const existingIds = new Set(
    matches.flatMap((tenant) => (tenant ? [tenant.id] : [])),
  );
  if (existingIds.size > 1) {
    throw new Error(
      'Identidad demo ambigua: revisar tenants existentes antes de seedear',
    );
  }
  const existingId = existingIds.values().next().value as string | undefined;
  if (existingId) return existingId;

  const tenant = await prisma.tenant.upsert({
    where: { slug: DEMO_TENANT_SLUG },
    update: {},
    create: {
      id: DEMO_TENANT_ID,
      name: 'Centro Médico Demo',
      slug: DEMO_TENANT_SLUG,
    },
  });
  console.warn('✓ Tenant seeded');
  return tenant.id;
}
