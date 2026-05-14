import { DEMO_TENANT_ID } from './types';

import type { PrismaClient, User } from '@prisma/client';


const USERS = [
  {
    id: 'demo-user-admin',
    email: 'admin.demo@centromedico.com',
    name: 'Admin Demo',
    roleName: 'admin',
  },
  {
    id: 'demo-user-reception',
    email: 'recepcion.demo@centromedico.com',
    name: 'Recepción Demo',
    roleName: 'recepcionista',
  },
] as const;

export async function seedDemoUsers(prisma: PrismaClient): Promise<{ admin: User; reception: User }> {
  const roles = await prisma.role.findMany({ where: { tenantId: DEMO_TENANT_ID } });
  const roleByName = new Map(roles.map((role) => [role.name, role]));

  const adminRole = roleByName.get('admin');
  const receptionRole = roleByName.get('recepcionista');

  if (!adminRole || !receptionRole) {
    throw new Error('Roles demo no encontrados');
  }

  const [adminUser, receptionUser] = USERS;

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: DEMO_TENANT_ID, email: adminUser.email } },
    update: { name: adminUser.name, roleId: adminRole.id },
    create: {
      id: adminUser.id,
      tenantId: DEMO_TENANT_ID,
      email: adminUser.email,
      passwordHash: 'demo-password-hash',
      name: adminUser.name,
      roleId: adminRole.id,
    },
  });

  const reception = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: DEMO_TENANT_ID, email: receptionUser.email } },
    update: { name: receptionUser.name, roleId: receptionRole.id },
    create: {
      id: receptionUser.id,
      tenantId: DEMO_TENANT_ID,
      email: receptionUser.email,
      passwordHash: 'demo-password-hash',
      name: receptionUser.name,
      roleId: receptionRole.id,
    },
  });

  return { admin, reception };
}
