import * as bcrypt from 'bcrypt';

import type { PrismaClient } from '@prisma/client';

const TENANT_ID = 'tenant-demo-001';

const USERS = [
  {
    id: 'user-admin-001',
    email: 'admin@centromedico.demo',
    password: 'Admin1234!',
    name: 'Administrador',
    roleName: 'admin',
  },
  {
    id: 'user-recep-001',
    email: 'recepcion@centromedico.demo',
    password: 'Recep1234!',
    name: 'Recepcionista Demo',
    roleName: 'recepcionista',
  },
  {
    id: 'user-doc-001',
    email: 'maria.gonzalez@centromedico.demo',
    password: 'Doc1234!',
    name: 'Dra. María González',
    roleName: 'doctor',
  },
  {
    id: 'user-doc-002',
    email: 'carlos.rodriguez@centromedico.demo',
    password: 'Doc1234!',
    name: 'Dr. Carlos Rodríguez',
    roleName: 'doctor',
  },
  {
    id: 'user-doc-003',
    email: 'luis.martinez@centromedico.demo',
    password: 'Doc1234!',
    name: 'Dr. Luis Martínez',
    roleName: 'doctor',
  },
];

export async function seedUsers(prisma: PrismaClient): Promise<void> {
  for (const userData of USERS) {
    const role = await prisma.role.findFirstOrThrow({
      where: { tenantId: TENANT_ID, name: userData.roleName },
    });

    const passwordHash = await bcrypt.hash(userData.password, 10);

    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: TENANT_ID, email: userData.email } },
      update: {},
      create: {
        id: userData.id,
        tenantId: TENANT_ID,
        email: userData.email,
        passwordHash,
        name: userData.name,
        roleId: role.id,
      },
    });
  }

  console.warn('✓ Users seeded');
}
