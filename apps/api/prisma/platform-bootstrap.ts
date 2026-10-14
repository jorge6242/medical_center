import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { parsePlatformBootstrapInput } from './platform-bootstrap-command';
import {
  platformAuditTrace,
  withPlatformAuditContext,
} from '../src/platform/audit/platform-audit-context';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL is required');

const BCRYPT_ROUNDS = 12;
const EXIT_EXISTS = 3;

async function readStdinLines(): Promise<string[]> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8').split(/\r?\n/);
}

async function createAdmin(
  prisma: PrismaClient,
  username: string,
  passwordHash: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const admin = await tx.platformAdmin.create({
      data: { username, name: username, passwordHash },
    });
    await tx.platformAuditLog.create({
      data: {
        actorKind: 'SYSTEM',
        ...platformAuditTrace(),
        entity: 'PlatformAdmin',
        entityId: admin.id,
        action: 'PLATFORM_ADMIN_BOOTSTRAP',
        newValues: { username, isActive: true },
        changedFields: ['username', 'passwordHash', 'isActive'],
        reason: 'bootstrap',
      },
    });
  });
}

async function resetAdminPassword(
  prisma: PrismaClient,
  adminId: string,
  username: string,
  passwordHash: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.platformAdmin.update({
      where: { id: adminId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await tx.platformSession.updateMany({
      where: { platformAdminId: adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.platformAuditLog.create({
      data: {
        actorKind: 'SYSTEM',
        ...platformAuditTrace(),
        platformAdminId: adminId,
        entity: 'PlatformAdmin',
        entityId: adminId,
        action: 'PLATFORM_ADMIN_PASSWORD_RESET',
        newValues: { username },
        changedFields: ['passwordHash', 'sessionVersion'],
        reason: 'bootstrap',
      },
    });
  });
}

async function main(): Promise<void> {
  const input = parsePlatformBootstrapInput(await readStdinLines());
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: connectionString as string }),
  });

  try {
    const existing = await prisma.platformAdmin.findUnique({
      where: { username: input.username },
    });
    if (existing && !input.overwrite) {
      process.stdout.write('EXISTS\n');
      process.exitCode = EXIT_EXISTS;
      return;
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    if (existing) {
      await resetAdminPassword(
        prisma,
        existing.id,
        input.username,
        passwordHash,
      );
      process.stdout.write('UPDATED\n');
      return;
    }
    await createAdmin(prisma, input.username, passwordHash);
    process.stdout.write('CREATED\n');
  } finally {
    await prisma.$disconnect();
  }
}

withPlatformAuditContext('SYSTEM', main).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown error';
  process.stderr.write(`platform bootstrap failed: ${message}\n`);
  process.exitCode = 1;
});
