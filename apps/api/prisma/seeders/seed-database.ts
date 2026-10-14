import { seedDemo } from './demo/demo.seed';
import { seedDoctors } from './doctors.seeder';
import { seedExchangeRates } from './exchange-rates.seeder';
import { seedExpenseCategories } from './expense-categories.seeder';
import { seedLabTests } from './lab-tests.seeder';
import { seedPatients } from './patients.seeder';
import { seedReminderConfig } from './reminder-config.seeder';
import { seedRoles } from './roles.seeder';
import { seedSpecialties } from './specialties.seeder';
import { seedSystemConfig } from './system-config.seeder';
import { seedTenant } from './tenant.seeder';
import { seedUsers } from './users.seeder';

import type { PrismaClient } from '@prisma/client';

export async function seedDatabase(prisma: PrismaClient) {
  console.warn('Seeding database...');

  const tenantId = await seedTenant(prisma);
  await seedRoles(prisma, tenantId);
  await seedUsers(prisma, tenantId);
  await seedSpecialties(prisma, tenantId);
  await seedDoctors(prisma, tenantId);
  await seedPatients(prisma, tenantId);
  await seedLabTests(prisma, tenantId);
  await seedExpenseCategories(prisma, tenantId);
  await seedSystemConfig(prisma, tenantId);
  await seedReminderConfig(prisma, tenantId);
  await seedExchangeRates(prisma, tenantId);
  await seedDemo(prisma, tenantId);

  console.warn('✓ Seed completo');
}
