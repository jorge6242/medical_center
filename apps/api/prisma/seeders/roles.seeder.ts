import type { Prisma, PrismaClient } from '@prisma/client';

const TENANT_ID = 'tenant-demo-001';

export const BASE_ROLES = [
  {
    name: 'admin',
    version: 3,
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
      { resource: 'consultations', action: 'create' },
      { resource: 'consultations', action: 'read' },
      { resource: 'consultations', action: 'update' },
      { resource: 'consultations', action: 'delete' },
      { resource: 'doctor_payouts', action: 'create' },
      { resource: 'doctor_payouts', action: 'read' },
      { resource: 'doctor_payouts', action: 'delete' },
      { resource: 'expenses', action: 'create' },
      { resource: 'expenses', action: 'read' },
      { resource: 'expenses', action: 'delete' },
      { resource: 'reports', action: 'read' },
      { resource: 'audit_logs', action: 'read' },
      { resource: 'laboratories', action: 'create' },
      { resource: 'laboratories', action: 'read' },
      { resource: 'laboratories', action: 'update' },
      { resource: 'laboratories', action: 'delete' },
      { resource: 'tenant_access_links', action: 'create' },
      { resource: 'tenant_access_links', action: 'revoke' },
      { resource: 'tenant_settings', action: 'update' },
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'create' },
      { resource: 'users', action: 'update' },
      { resource: 'users', action: 'delete' },
      { resource: 'roles', action: 'read' },
    ],
  },
  {
    name: 'recepcionista',
    version: 10,
    permissions: [
      { resource: 'patients', action: 'create' },
      { resource: 'patients', action: 'read' },
      { resource: 'patients', action: 'update' },
      { resource: 'patients', action: 'delete' },
      { resource: 'specialties', action: 'read' },
      { resource: 'specialties', action: 'create' },
      { resource: 'specialties', action: 'update' },
      { resource: 'specialties', action: 'delete' },
      { resource: 'doctors', action: 'read' },
      { resource: 'doctors', action: 'create' },
      { resource: 'doctors', action: 'update' },
      { resource: 'doctors', action: 'delete' },
      { resource: 'payments', action: 'create' },
      { resource: 'payments', action: 'read' },
      { resource: 'consultations', action: 'create' },
      { resource: 'consultations', action: 'read' },
      { resource: 'consultations', action: 'update' },
      { resource: 'consultations', action: 'delete' },
      { resource: 'doctor_payouts', action: 'create' },
      { resource: 'doctor_payouts', action: 'read' },
      { resource: 'reports', action: 'read' },
      { resource: 'laboratories', action: 'create' },
      { resource: 'laboratories', action: 'read' },
      { resource: 'tenant_settings', action: 'update' },
    ],
  },
  {
    name: 'doctor',
    version: 1,
    permissions: [
      { resource: 'patients', action: 'create' },
      { resource: 'patients', action: 'read' },
      { resource: 'patients', action: 'update' },
      { resource: 'doctors', action: 'read' },
      { resource: 'doctors', action: 'update' },
    ],
  },
];

export async function seedRoles(
  prisma: PrismaClient | Prisma.TransactionClient,
  tenantId = TENANT_ID,
): Promise<void> {
  for (const roleData of BASE_ROLES) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId, name: roleData.name } },
      update: {},
      create: {
        id: `${tenantId}-${roleData.name}`,
        tenantId,
        name: roleData.name,
      },
    });

    await prisma.roleVersion.upsert({
      where: { roleId: role.id },
      update: { version: roleData.version },
      create: { roleId: role.id, version: roleData.version },
    });

    await prisma.permission.deleteMany({
      where: {
        roleId: role.id,
        NOT: {
          OR: roleData.permissions.map((permission) => ({
            resource: permission.resource,
            action: permission.action,
          })),
        },
      },
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
        create: {
          roleId: role.id,
          resource: perm.resource,
          action: perm.action,
        },
      });
    }
  }

  console.warn('✓ Roles + permisos seeded');
}
