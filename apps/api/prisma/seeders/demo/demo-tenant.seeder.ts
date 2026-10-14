import { DEMO_DATA_TENANT_SLUG } from '../demo-tenant.constants';
import { seedTenant } from '../tenant.seeder';

import type { PrismaClient } from '@prisma/client';

export async function seedDemoTenant(
  prisma: PrismaClient,
  resolvedTenantId?: string,
): Promise<string> {
  const tenantId = resolvedTenantId ?? (await seedTenant(prisma));
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { name: 'Centro Médico Demo', slug: DEMO_DATA_TENANT_SLUG },
  });
  return tenantId;
}
