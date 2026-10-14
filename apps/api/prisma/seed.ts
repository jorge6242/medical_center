import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { seedDatabase } from './seeders/seed-database';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL'] ?? '',
});
const prisma = new PrismaClient({ adapter });

seedDatabase(prisma)
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
