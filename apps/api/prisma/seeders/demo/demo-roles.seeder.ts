import { DEMO_TENANT_ID } from './types';

import type { PrismaClient } from '@prisma/client';


const ROLES = [
  {
    name: 'admin',
    permissions: [
      { resource: 'patients', action: 'create' },
      { resource: 'patients', action: 'read' },
      { resource: 'patients', action: 'update' },
      { resource: 'patients', action: 'delete' },
      { resource: 'doctors', action: 'create' },
      { resource: 'doctors', action: 'read' },
      { resource: 'doctors', action: 'update' },
      { resource: 'doctors', action: 'delete' },
      { resource: 'specialties', action: 'create' },
      { resource: 'specialties', action: 'read' },
      { resource: 'specialties', action: 'update' },
      { resource: 'specialties', action: 'delete' },
      { resource: 'payments', action: 'create' },
      { resource: 'payments', action: 'read' },
      { resource: 'payments', action: 'delete' },
      { resource: 'expenses', action: 'create' },
      { resource: 'expenses', action: 'read' },
      { resource: 'expenses', action: 'delete' },
      { resource: 'reports', action: 'read' },
    ],
  },
  {
    name: 'recepcionista',
    permissions: [
      { resource: 'patients', action: 'create' },
      { resource: 'patients', action: 'read' },
      { resource: 'patients', action: 'update' },
      { resource: 'doctors', action: 'read' },
      { resource: 'specialties', action: 'read' },
      { resource: 'payments', action: 'create' },
      { resource: 'payments', action: 'read' },
      { resource: 'expenses', action: 'create' },
      { resource: 'expenses', action: 'read' },
    ],
  },
];

export async function seedDemoRoles(prisma: PrismaClient): Promise<void> {
  for (const roleData of ROLES) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: DEMO_TENANT_ID, name: roleData.name } },
      update: {},
      create: {
        tenantId: DEMO_TENANT_ID,
        name: roleData.name,
      },
    });

    await prisma.roleVersion.upsert({
      where: { roleId: role.id },
      update: {},
      create: { roleId: role.id, version: 1 },
    });

    for (const perm of roleData.permissions) {
      await prisma.permission.upsert({
        where: {
          roleId_resource_action: {
            roleId: role.id,
            resource: perm.resource,
            action: perm.action,
          },
        },
        update: {},
        create: { roleId: role.id, resource: perm.resource, action: perm.action },
      });
    }
  }
}
