import { createHash, randomBytes } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import {
  buildTenantAccessUrl,
  parseTenantAccessLinkCommand,
} from './tenant-access-link-command';

const connectionString = requiredEnvironment('DATABASE_URL');
const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';

const { tenantSlug, expiresInDays } = parseTenantAccessLinkCommand(
  process.argv.slice(2),
);

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: tenantSlug, isActive: true },
      select: {
        id: true,
        name: true,
        users: {
          where: { isActive: true, role: { name: 'admin', isActive: true } },
          select: { id: true },
          take: 1,
        },
      },
    });
    const createdById = tenant?.users[0]?.id;
    if (!tenant || !createdById) {
      throw new Error('Active tenant or administrator not found');
    }

    const accessToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    );
    await prisma.tenantAccessLink.create({
      data: {
        tenantId: tenant.id,
        createdById,
        tokenHash: hashToken(accessToken),
        expiresAt,
      },
    });

    console.warn(`Tenant: ${tenant.name} (${tenantSlug})`);
    console.warn(`Expires: ${expiresAt.toISOString()}`);
    console.warn(
      `Access URL: ${buildTenantAccessUrl(frontendUrl, accessToken)}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
