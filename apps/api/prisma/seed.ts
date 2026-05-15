import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { seedDemo } from './seeders/demo/demo.seed';
import { seedDoctors } from './seeders/doctors.seeder';
import { seedExchangeRates } from './seeders/exchange-rates.seeder';
import { seedExpenseCategories } from './seeders/expense-categories.seeder';
import { seedLabTests } from './seeders/lab-tests.seeder';
import { seedPatients } from './seeders/patients.seeder';
import { seedRoles } from './seeders/roles.seeder';
import { seedSpecialties } from './seeders/specialties.seeder';
import { seedSystemConfig } from './seeders/system-config.seeder';
import { seedTenant } from './seeders/tenant.seeder';
import { seedUsers } from './seeders/users.seeder';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.warn('Seeding database...');

  await seedTenant(prisma);
  await seedRoles(prisma);
  await seedUsers(prisma);
  await seedSpecialties(prisma);
  await seedDoctors(prisma);
  await seedPatients(prisma);
  await seedLabTests(prisma);
  await seedExpenseCategories(prisma);
  await seedSystemConfig(prisma);
  await seedExchangeRates(prisma);
  await seedDemo(prisma);

  console.warn('✓ Seed completo');
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
