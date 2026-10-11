import { randomUUID } from 'node:crypto';

import { AuditWriter } from '../src/audit-log/audit-writer';

import type { SubscriptionCommand } from './subscription-command';
import type {
  Prisma,
  SubscriptionPeriod,
  SubscriptionPlan,
  TenantSubscription,
} from '@prisma/client';

type Transaction = Prisma.TransactionClient;

async function audit(
  tx: Transaction,
  tenantId: string,
  entity: string,
  row: Record<string, unknown>,
) {
  await new AuditWriter().write(
    {
      tenantId,
      action: 'CREATE',
      entity,
      entityId: String(row['id']),
      newValues: row,
      changedFields: Object.keys(row),
      metadata: { source: 'tenant:subscription' },
    },
    tx,
  );
}

function sortedJson(value: unknown): string {
  return JSON.stringify(
    Object.entries(value as object).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function validatePlan(
  plan: SubscriptionPlan | null,
  command: SubscriptionCommand,
) {
  if (!plan && !command.newPlan)
    throw new Error(
      'Unknown plan; use --create-plan with explicit configuration',
    );
  if (plan && !plan.isActive)
    throw new Error('The subscription plan is inactive');
  if (!plan || !command.newPlan) return;
  const sameConfiguration =
    plan.name === command.newPlan.name &&
    sortedJson(plan.features) === sortedJson(command.newPlan.features) &&
    sortedJson(plan.limits) === sortedJson(command.newPlan.limits);
  if (!sameConfiguration)
    throw new Error(
      'Existing plan configuration differs; this command does not edit plans',
    );
}

async function findTenant(tx: Transaction, command: SubscriptionCommand) {
  const tenant = await tx.tenant.findFirst({
    where: { slug: command.tenantSlug, isActive: true },
  });
  if (!tenant) throw new Error('Active tenant not found');
  if (command.apply) {
    const locked = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM tenants WHERE id = ${tenant.id} AND slug = ${command.tenantSlug} AND "isActive" = true FOR UPDATE`;
    if (locked.length !== 1) throw new Error('Active tenant not found');
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('subscription-plan:' || ${command.planCode}, 0))::text`;
  }
  return tenant;
}

function validateContract(
  subscription: TenantSubscription | null,
  command: SubscriptionCommand,
) {
  if (subscription && !['ACTIVE', 'TRIALING'].includes(subscription.status))
    throw new Error(`Cannot provision a ${subscription.status} subscription`);
  if (subscription && !subscription.agreedPriceUsd.equals(command.price))
    throw new Error(
      'The agreed price differs; this command does not edit contractual terms',
    );
}

function validateExistingPeriod(
  period: SubscriptionPeriod | null,
  plan: SubscriptionPlan | null,
  command: SubscriptionCommand,
) {
  if (
    period &&
    (!plan ||
      period.subscriptionPlanId !== plan.id ||
      !period.priceUsdSnapshot.equals(command.price))
  )
    throw new Error('Existing period conditions differ');
}

async function inspect(tx: Transaction, command: SubscriptionCommand) {
  const tenant = await findTenant(tx, command);
  const plan = await tx.subscriptionPlan.findUnique({
    where: { code: command.planCode },
  });
  validatePlan(plan, command);
  const subscription = await tx.tenantSubscription.findUnique({
    where: { tenantId: tenant.id },
  });
  validateContract(subscription, command);
  const period = subscription
    ? await tx.subscriptionPeriod.findFirst({
        where: {
          subscriptionId: subscription.id,
          subscription: { tenantId: tenant.id },
          startsAt: command.startsAt,
          endsAt: command.endsAt,
        },
        include: { invoice: true },
      })
    : null;
  validateExistingPeriod(period, plan, command);
  return { tenant, plan, subscription, period };
}

type Context = Awaited<ReturnType<typeof inspect>>;

async function validateNewPeriod(
  tx: Transaction,
  context: Context,
  command: SubscriptionCommand,
  now: Date,
) {
  if (!context.period?.invoice && command.dueAt < now)
    throw new Error('--due-date cannot precede invoice issuance');
  if (context.period || !context.subscription) return;
  const latest = await tx.subscriptionPeriod.findFirst({
    where: {
      subscriptionId: context.subscription.id,
      subscription: { tenantId: context.tenant.id },
    },
    orderBy: { endsAt: 'desc' },
  });
  if (latest && latest.endsAt.getTime() !== command.startsAt.getTime())
    throw new Error(
      'New periods must be contiguous with the latest period; no overlaps or gaps',
    );
}

async function ensurePlan(
  tx: Transaction,
  context: Context,
  command: SubscriptionCommand,
) {
  if (context.plan) return context.plan;
  if (!command.newPlan) throw new Error('Missing plan configuration');
  const plan = await tx.subscriptionPlan.create({
    data: {
      code: command.planCode,
      name: command.newPlan.name,
      basePriceUsd: command.price,
      features: command.newPlan.features,
      limits: command.newPlan.limits,
    },
  });
  await audit(tx, context.tenant.id, 'SubscriptionPlan', { ...plan });
  return plan;
}

async function ensureSubscription(
  tx: Transaction,
  context: Context,
  command: SubscriptionCommand,
) {
  if (context.subscription) return context.subscription;
  const subscription = await tx.tenantSubscription.create({
    data: {
      tenantId: context.tenant.id,
      agreedPriceUsd: command.price,
    },
  });
  await audit(tx, context.tenant.id, 'TenantSubscription', { ...subscription });
  return subscription;
}

async function createPeriod(
  tx: Transaction,
  context: Context,
  command: SubscriptionCommand,
) {
  if (context.period) return context.period;
  const plan = await ensurePlan(tx, context, command);
  const subscription = await ensureSubscription(tx, context, command);
  const period = await tx.subscriptionPeriod.create({
    data: {
      subscriptionId: subscription.id,
      subscriptionPlanId: plan.id,
      startsAt: command.startsAt,
      endsAt: command.endsAt,
      priceUsdSnapshot: command.price,
      planCodeSnapshot: plan.code,
      planNameSnapshot: plan.name,
      featuresSnapshot: plan.features as Prisma.InputJsonObject,
      limitsSnapshot: plan.limits as Prisma.InputJsonObject,
    },
  });
  await audit(tx, context.tenant.id, 'SubscriptionPeriod', { ...period });
  return period;
}

function summarize(context: Context, command: SubscriptionCommand) {
  return {
    tenant: context.tenant.slug,
    plan: command.planCode,
    priceUsd: command.price,
    startsAt: command.startsAt.toISOString(),
    endsAt: command.endsAt.toISOString(),
    dueAt: (context.period?.invoice?.dueAt ?? command.dueAt).toISOString(),
    invoiceStatus: context.period?.invoice?.status ?? 'PENDING',
    subscriptionId: context.subscription?.id ?? null,
    periodId: context.period?.id ?? null,
    invoiceId: context.period?.invoice?.id ?? null,
    subscriptionPeriodId: context.subscription?.subscriptionPeriodId ?? null,
    coverageActivated: false,
  };
}

async function createInvoice(
  tx: Transaction,
  context: Context,
  command: SubscriptionCommand,
  periodId: string,
  now: Date,
) {
  const invoice = await tx.subscriptionInvoice.create({
    data: {
      subscriptionPeriodId: periodId,
      number: `SUB-${randomUUID()}`,
      totalUsd: command.price,
      issuedAt: now,
      dueAt: command.dueAt,
    },
  });
  await audit(tx, context.tenant.id, 'SubscriptionInvoice', { ...invoice });
  return invoice;
}

export async function provisionSubscription(
  tx: Transaction,
  command: SubscriptionCommand,
  now = new Date(),
) {
  const context = await inspect(tx, command);
  await validateNewPeriod(tx, context, command, now);
  const summary = summarize(context, command);
  if (!command.apply) return { ...summary, mode: 'preview' as const };
  if (context.period?.invoice)
    return { ...summary, mode: 'unchanged' as const };
  const period = await createPeriod(tx, context, command);
  const invoice = await createInvoice(tx, context, command, period.id, now);
  return {
    ...summary,
    subscriptionId: period.subscriptionId,
    periodId: period.id,
    invoiceId: invoice.id,
    mode: 'created' as const,
  };
}
