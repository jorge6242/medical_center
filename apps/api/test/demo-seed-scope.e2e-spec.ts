import { seedDemoConsultations } from '../prisma/seeders/demo/demo-consultations.seeder';
import { seedDemoDoctors } from '../prisma/seeders/demo/demo-doctors.seeder';
import { seedDemoExpenses } from '../prisma/seeders/demo/demo-expenses.seeder';
import { seedDemoLabOrders } from '../prisma/seeders/demo/demo-lab-orders.seeder';
import { seedDemoPatients } from '../prisma/seeders/demo/demo-patients.seeder';
import { seedDemoPayments } from '../prisma/seeders/demo/demo-payments.seeder';
import { seedDemoRoles } from '../prisma/seeders/demo/demo-roles.seeder';
import { seedDemoSpecialties } from '../prisma/seeders/demo/demo-specialties.seeder';
import { seedDemoTenant } from '../prisma/seeders/demo/demo-tenant.seeder';
import { seedDemoUsers } from '../prisma/seeders/demo/demo-users.seeder';
import { seedDemo } from '../prisma/seeders/demo/demo.seed';

import type { PrismaClient } from '@prisma/client';

jest.mock('../prisma/seeders/demo/demo-tenant.seeder', () => ({
  seedDemoTenant: jest.fn(async () => 'tenant-demo-001'),
}));
jest.mock('../prisma/seeders/demo/demo-roles.seeder', () => ({
  seedDemoRoles: jest.fn(),
}));
jest.mock('../prisma/seeders/demo/demo-specialties.seeder', () => ({
  seedDemoSpecialties: jest.fn(),
}));
jest.mock('../prisma/seeders/demo/demo-users.seeder', () => ({
  seedDemoUsers: jest.fn(async () => ({})),
}));
jest.mock('../prisma/seeders/demo/demo-doctors.seeder', () => ({
  seedDemoDoctors: jest.fn(async () => []),
}));
jest.mock('../prisma/seeders/demo/demo-patients.seeder', () => ({
  seedDemoPatients: jest.fn(async () => []),
}));
jest.mock('../prisma/seeders/demo/demo-consultations.seeder', () => ({
  seedDemoConsultations: jest.fn(async () => []),
}));
jest.mock('../prisma/seeders/demo/demo-lab-orders.seeder', () => ({
  seedDemoLabOrders: jest.fn(),
}));
jest.mock('../prisma/seeders/demo/demo-payments.seeder', () => ({
  seedDemoPayments: jest.fn(),
}));
jest.mock('../prisma/seeders/demo/demo-expenses.seeder', () => ({
  seedDemoExpenses: jest.fn(),
}));

it('propagates resolved historical tenant ID into every demo relationship seeder', async () => {
  const prisma = {} as PrismaClient;
  await seedDemo(prisma);
  expect(seedDemoTenant).toHaveBeenCalledWith(prisma);
  for (const seeder of [
    seedDemoRoles,
    seedDemoSpecialties,
    seedDemoUsers,
    seedDemoDoctors,
    seedDemoPatients,
    seedDemoConsultations,
    seedDemoLabOrders,
    seedDemoPayments,
    seedDemoExpenses,
  ]) {
    const calls = jest.mocked(seeder).mock.calls;
    expect(calls[0]?.at(-1)).toBe('tenant-demo-001');
  }
});
