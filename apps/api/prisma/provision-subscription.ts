import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { parseSubscriptionCommand } from './subscription-command';
import { provisionSubscription } from './subscription-provision';

const HELP = `Usage: pnpm run tenant:subscription
  --tenant SLUG --plan CODE --price USD --start YYYY-MM-DD --due-date YYYY-MM-DD
  [--create-plan --plan-name NAME --features JSON --limits JSON]
  [--dry-run | --apply] [--allow-production]

Preview is the default. Dates use America/Caracas; the period is one calendar month.
Creates a pending invoice, not a payment. Does not activate or renew access.
Existing plan settings and contractual terms are never overwritten.
Railway/production writes require both --apply and --allow-production.`;

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.warn(HELP);
    return;
  }
  const production =
    process.env['NODE_ENV'] === 'production' ||
    Boolean(process.env['RAILWAY_ENVIRONMENT_ID']);
  const command = parseSubscriptionCommand(args, production);
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const result = await prisma.$transaction(
      (tx) => provisionSubscription(tx, command),
      { timeout: 15000 },
    );
    console.warn(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Subscription provisioning failed',
  );
  process.exitCode = 1;
});
