import { seedDemo } from '../prisma/seeders/demo/demo.seed';
import { seedDoctors } from '../prisma/seeders/doctors.seeder';
import { seedExchangeRates } from '../prisma/seeders/exchange-rates.seeder';
import { seedExpenseCategories } from '../prisma/seeders/expense-categories.seeder';
import { seedLabTests } from '../prisma/seeders/lab-tests.seeder';
import { seedPatients } from '../prisma/seeders/patients.seeder';
import { seedReminderConfig } from '../prisma/seeders/reminder-config.seeder';
import { seedRoles } from '../prisma/seeders/roles.seeder';
import { seedDatabase } from '../prisma/seeders/seed-database';
import { seedSpecialties } from '../prisma/seeders/specialties.seeder';
import { seedSystemConfig } from '../prisma/seeders/system-config.seeder';
import { seedTenant } from '../prisma/seeders/tenant.seeder';
import { seedUsers } from '../prisma/seeders/users.seeder';

import type { PrismaClient } from '@prisma/client';

jest.mock('../prisma/seeders/tenant.seeder', () => ({
  seedTenant: jest.fn(async () => 'tenant-demo-001'),
}));
jest.mock('../prisma/seeders/demo/demo.seed', () => ({ seedDemo: jest.fn() }));
jest.mock('../prisma/seeders/users.seeder', () => ({ seedUsers: jest.fn() }));
jest.mock('../prisma/seeders/doctors.seeder', () => ({
  seedDoctors: jest.fn(),
}));
jest.mock('../prisma/seeders/patients.seeder', () => ({
  seedPatients: jest.fn(),
}));
jest.mock('../prisma/seeders/specialties.seeder', () => ({
  seedSpecialties: jest.fn(),
}));
jest.mock('../prisma/seeders/lab-tests.seeder', () => ({
  seedLabTests: jest.fn(),
}));
jest.mock('../prisma/seeders/exchange-rates.seeder', () => ({
  seedExchangeRates: jest.fn(),
}));
jest.mock('../prisma/seeders/expense-categories.seeder', () => ({
  seedExpenseCategories: jest.fn(),
}));
jest.mock('../prisma/seeders/reminder-config.seeder', () => ({
  seedReminderConfig: jest.fn(),
}));
jest.mock('../prisma/seeders/roles.seeder', () => ({ seedRoles: jest.fn() }));
jest.mock('../prisma/seeders/system-config.seeder', () => ({
  seedSystemConfig: jest.fn(),
}));

it('passes one resolved ID through every base/demo seeder, including reusable provisioning seeders', async () => {
  const prisma = {} as PrismaClient;
  await seedDatabase(prisma);
  expect(seedTenant).toHaveBeenCalledWith(prisma);
  for (const seed of [
    seedDemo,
    seedUsers,
    seedDoctors,
    seedPatients,
    seedSpecialties,
    seedLabTests,
    seedExchangeRates,
    seedExpenseCategories,
    seedReminderConfig,
    seedRoles,
    seedSystemConfig,
  ]) {
    expect(seed).toHaveBeenCalledWith(prisma, 'tenant-demo-001');
  }
});
