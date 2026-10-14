import { seedDemoConsultations } from './demo-consultations.seeder';
import { seedDemoDoctors } from './demo-doctors.seeder';
import { seedDemoExpenses } from './demo-expenses.seeder';
import { seedDemoLabOrders } from './demo-lab-orders.seeder';
import { seedDemoPatients } from './demo-patients.seeder';
import { seedDemoPayments } from './demo-payments.seeder';
import { seedDemoRoles } from './demo-roles.seeder';
import { seedDemoSpecialties } from './demo-specialties.seeder';
import { seedDemoTenant } from './demo-tenant.seeder';
import { seedDemoUsers } from './demo-users.seeder';

import type { PrismaClient } from '@prisma/client';

export async function seedDemo(
  prisma: PrismaClient,
  resolvedTenantId?: string,
): Promise<void> {
  const tenantId =
    resolvedTenantId === undefined
      ? await seedDemoTenant(prisma)
      : await seedDemoTenant(prisma, resolvedTenantId);
  await seedDemoRoles(prisma, tenantId);
  await seedDemoSpecialties(prisma, tenantId);
  const users = await seedDemoUsers(prisma, tenantId);
  const doctors = await seedDemoDoctors(prisma, tenantId);
  const patients = await seedDemoPatients(prisma, tenantId);
  const consultations = await seedDemoConsultations(
    prisma,
    doctors,
    patients,
    users,
    tenantId,
  );
  await seedDemoLabOrders(prisma, patients, tenantId);
  await seedDemoPayments(prisma, consultations, users, tenantId);
  await seedDemoExpenses(prisma, users, tenantId);
  console.warn('✓ Demo seed completo');
}
