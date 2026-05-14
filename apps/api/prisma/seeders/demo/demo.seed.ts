
import { seedDemoConsultations } from './demo-consultations.seeder';
import { seedDemoDoctors } from './demo-doctors.seeder';
import { seedDemoExpenses } from './demo-expenses.seeder';
import { seedDemoPatients } from './demo-patients.seeder';
import { seedDemoPayments } from './demo-payments.seeder';
import { seedDemoRoles } from './demo-roles.seeder';
import { seedDemoSpecialties } from './demo-specialties.seeder';
import { seedDemoTenant } from './demo-tenant.seeder';
import { seedDemoUsers } from './demo-users.seeder';

import type { PrismaClient } from '@prisma/client';

export async function seedDemo(prisma: PrismaClient): Promise<void> {
  await seedDemoTenant(prisma);
  await seedDemoRoles(prisma);
  await seedDemoSpecialties(prisma);
  const users = await seedDemoUsers(prisma);
  const doctors = await seedDemoDoctors(prisma);
  const patients = await seedDemoPatients(prisma);
  const consultations = await seedDemoConsultations(prisma, doctors, patients, users);
  await seedDemoPayments(prisma, consultations, users);
  await seedDemoExpenses(prisma, users);
  console.warn('✓ Demo seed completo');
}
