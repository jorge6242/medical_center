import { DEMO_TENANT_ID } from './types';

import type { PrismaClient } from '@prisma/client';


export async function seedDemoTenant(prisma: PrismaClient): Promise<void> {
  await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    update: { name: 'Centro Médico Demo', slug: 'centro-medico-demo-demo' },
    create: {
      id: DEMO_TENANT_ID,
      name: 'Centro Médico Demo',
      slug: 'centro-medico-demo-demo',
    },
  });
}
