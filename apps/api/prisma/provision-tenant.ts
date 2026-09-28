import { createHash, randomBytes } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { seedReminderConfig } from './seeders/reminder-config.seeder';
import { seedRoles } from './seeders/roles.seeder';
import { seedSystemConfig } from './seeders/system-config.seeder';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL is required');

const required = [
  'TENANT_NAME',
  'TENANT_SLUG',
  'ADMIN_NAME',
  'ADMIN_EMAIL',
] as const;
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0)
  throw new Error(`Missing provisioning variables: ${missing.join(', ')}`);

const tenantName = process.env['TENANT_NAME'] as string;
const tenantSlug = process.env['TENANT_SLUG'] as string;
const adminName = process.env['ADMIN_NAME'] as string;
const adminLastName = process.env['ADMIN_LAST_NAME'];
const adminIdentificationNumber = process.env['ADMIN_IDENTIFICATION_NUMBER'];
const adminEmail = process.env['ADMIN_EMAIL'] as string;
const adminPassword =
  process.env['ADMIN_PASSWORD'] ?? randomBytes(24).toString('base64url');
const resetAdminPassword = process.env['RESET_ADMIN_PASSWORD'] === 'true';
const logoUrl = process.env['TENANT_LOGO_URL'];
const accessLinkDays = Number(process.env['ACCESS_LINK_DAYS'] ?? '7');
const initialIgtfRate = process.env['INITIAL_IGTF_RATE'] ?? '0';
const initialBcvRate = process.env['INITIAL_BCV_RATE'];

if (
  !Number.isInteger(accessLinkDays) ||
  accessLinkDays < 1 ||
  accessLinkDays > 365
) {
  throw new Error('ACCESS_LINK_DAYS must be an integer between 1 and 365');
}

if (logoUrl && !['http:', 'https:'].includes(new URL(logoUrl).protocol)) {
  throw new Error('TENANT_LOGO_URL must use http or https');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function dateOnly(date = new Date()): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.upsert({
        where: { slug: tenantSlug },
        update: { name: tenantName, ...(logoUrl ? { logoUrl } : {}) },
        create: { name: tenantName, slug: tenantSlug, logoUrl },
      });

      await seedRoles(tx, tenant.id);
      await seedSystemConfig(tx, tenant.id);
      await seedReminderConfig(tx, tenant.id);
      await tx.systemConfig.update({
        where: { tenantId_key: { tenantId: tenant.id, key: 'igtf_rate' } },
        data: { value: initialIgtfRate },
      });

      if (initialBcvRate) {
        await tx.exchangeRate.upsert({
          where: { tenantId_date: { tenantId: tenant.id, date: dateOnly() } },
          update: { rate: initialBcvRate, source: 'MANUAL' },
          create: {
            tenantId: tenant.id,
            rate: initialBcvRate,
            date: dateOnly(),
            source: 'MANUAL',
          },
        });
      }

      const adminRole = await tx.role.findFirstOrThrow({
        where: { tenantId: tenant.id, name: 'admin', isActive: true },
      });
      const existingAdmin = await tx.user.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email: adminEmail } },
      });
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const admin = existingAdmin
        ? resetAdminPassword
          ? await tx.user.update({
              where: { id: existingAdmin.id },
              data: {
                passwordHash,
                name: adminName,
                ...(adminLastName ? { lastName: adminLastName } : {}),
                ...(adminIdentificationNumber
                  ? { identificationNumber: adminIdentificationNumber }
                  : {}),
                roleId: adminRole.id,
              },
            })
          : existingAdmin
        : await tx.user.create({
            data: {
              tenantId: tenant.id,
              email: adminEmail,
              lastName: adminLastName,
              identificationNumber: adminIdentificationNumber,
              passwordHash,
              name: adminName,
              roleId: adminRole.id,
            },
          });

      if (existingAdmin && existingAdmin.roleId !== adminRole.id) {
        throw new Error(
          `Existing user ${adminEmail} is not an admin in ${tenantSlug}`,
        );
      }

      const rawAccessToken = randomBytes(32).toString('hex');
      const accessLink = await tx.tenantAccessLink.create({
        data: {
          tenantId: tenant.id,
          createdById: admin.id,
          tokenHash: hashToken(rawAccessToken),
          expiresAt: new Date(
            Date.now() + accessLinkDays * 24 * 60 * 60 * 1000,
          ),
        },
      });

      return {
        tenant,
        accessLink,
        rawAccessToken,
        adminCreated: !existingAdmin,
        initialPassword:
          resetAdminPassword || !existingAdmin ? adminPassword : null,
      };
    });

    console.warn(
      `Tenant provisioned: ${result.tenant.name} (${result.tenant.slug})`,
    );
    console.warn(`Tenant ID: ${result.tenant.id}`);
    console.warn(`Admin: ${adminEmail}`);
    if (result.initialPassword)
      console.warn(`Initial password (show once): ${result.initialPassword}`);
    console.warn(`Access token (show once): ${result.rawAccessToken}`);
    console.warn(`Access path: /login?access=${result.rawAccessToken}`);
    console.warn(
      `Access link expires: ${result.accessLink.expiresAt?.toISOString() ?? 'never'}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
