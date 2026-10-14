import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import {
  billingPeriodFor,
  parseAgreedPrice,
  requestFingerprint,
} from './platform-tenant-provisioning';
import { TENANT_SELECT, type TenantRecord } from './platform-tenants.service';
import { validateDnsLabel, validateWebSlug } from './tenant-web-slug';
import { seedReminderConfig } from '../../common/provisioning/reminder-config.seeder';
import { seedRoles } from '../../common/provisioning/roles.seeder';
import { seedSystemConfig } from '../../common/provisioning/system-config.seeder';
import { PrismaService } from '../../database/prisma.service';
import { writePlatformAudit } from '../audit/platform-audit';
import { PLATFORM_JWT_SECRET } from '../auth/platform-auth.constants';

import type { PlatformIdentity } from '../auth/platform-auth.service';
import type { Prisma } from '@prisma/client';

const SCOPE = 'platform.tenants.create';
const BCRYPT_ROUNDS = 12;
const MIN_KEY_LENGTH = 8;
const MAX_KEY_LENGTH = 128;
const UNIQUE_VIOLATION = 'P2002';
const GRACE_PERIOD_RANGE = { min: 0, max: 30 };

export interface TenantCreateInput {
  name: string;
  slug: string;
  webSlug: string;
  email?: string | null;
  initialAdmin: { name: string; email: string; password: string };
  initialSubscription: {
    planCode: string;
    agreedPriceUsd: string;
    startsAt: string;
    dueAt: string;
    gracePeriodDays: number;
  };
}

export interface TenantCreateResult {
  tenant: TenantRecord;
  subscription: { id: string; status: string; agreedPriceUsd: string };
  invoice: { id: string; number: string; totalUsd: string; dueAt: Date } | null;
  replayed: boolean;
}

interface ValidatedCreate {
  price: string;
  period: { startsAt: Date; endsAt: Date };
  dueAt: Date;
  gracePeriodDays: number;
  plan: {
    id: string;
    code: string;
    name: string;
    features: unknown;
    limits: unknown;
  };
}

@Injectable()
export class PlatformTenantProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PLATFORM_JWT_SECRET) private readonly secret: string,
  ) {}

  async create(
    actor: PlatformIdentity,
    idempotencyKey: string | undefined,
    input: TenantCreateInput,
  ): Promise<TenantCreateResult> {
    const key = assertIdempotencyKey(idempotencyKey);
    const fingerprint = requestFingerprint(input, this.secret);

    const existing = await this.prisma.platformIdempotencyKey.findUnique({
      where: { scope_key: { scope: SCOPE, key } },
    });
    if (existing) return this.replay(existing, fingerprint);

    const validated = await this.validate(input);
    validateSlugs(input);
    const passwordHash = await bcrypt.hash(
      input.initialAdmin.password,
      BCRYPT_ROUNDS,
    );

    const created = await this.runAtomically((tx) =>
      this.provisionAll(
        tx,
        actor,
        key,
        fingerprint,
        input,
        validated,
        passwordHash,
      ),
    );
    return { ...created, replayed: false };
  }

  private async replay(
    existing: { fingerprint: string; resultRef: string | null },
    fingerprint: string,
  ): Promise<TenantCreateResult> {
    if (existing.fingerprint !== fingerprint) {
      throw new ConflictException(
        'La clave de idempotencia ya se usó con otro payload',
      );
    }
    const tenantId = existing.resultRef ?? '';
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: TENANT_SELECT,
    });
    if (!tenant)
      throw new ConflictException(
        'La clave de idempotencia no tiene resultado',
      );

    const contract = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });
    const invoice = contract?.subscriptionPeriodId
      ? await this.prisma.subscriptionInvoice.findFirst({
          where: { subscriptionPeriodId: contract.subscriptionPeriodId },
        })
      : null;
    return {
      tenant,
      subscription: contract
        ? {
            id: contract.id,
            status: contract.status,
            agreedPriceUsd: contract.agreedPriceUsd.toString(),
          }
        : { id: '', status: '', agreedPriceUsd: '' },
      invoice: invoice
        ? {
            id: invoice.id,
            number: invoice.number,
            totalUsd: invoice.totalUsd.toString(),
            dueAt: invoice.dueAt,
          }
        : null,
      replayed: true,
    };
  }

  private async validate(input: TenantCreateInput): Promise<ValidatedCreate> {
    const sub = input.initialSubscription;
    const price = parseAgreedPrice(sub.agreedPriceUsd);
    const period = billingPeriodFor(sub.startsAt);
    const dueAt = new Date(sub.dueAt);
    if (dueAt.getTime() < period.startsAt.getTime()) {
      throw new BadRequestException(
        'dueAt no puede ser anterior al inicio del contrato',
      );
    }
    if (
      !Number.isInteger(sub.gracePeriodDays) ||
      sub.gracePeriodDays < GRACE_PERIOD_RANGE.min ||
      sub.gracePeriodDays > GRACE_PERIOD_RANGE.max
    ) {
      throw new BadRequestException('gracePeriodDays debe estar entre 0 y 30');
    }
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { code: sub.planCode, isActive: true },
    });
    if (!plan) throw new BadRequestException('Plan no válido o inactivo');
    return { price, period, dueAt, gracePeriodDays: sub.gracePeriodDays, plan };
  }

  private async runAtomically<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction((tx) => work(tx));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Ya existe un centro con ese slug o webSlug, o la clave de idempotencia está en uso',
        );
      }
      throw error;
    }
  }

  private async provisionAll(
    tx: Prisma.TransactionClient,
    actor: PlatformIdentity,
    key: string,
    fingerprint: string,
    input: TenantCreateInput,
    v: ValidatedCreate,
    passwordHash: string,
  ) {
    const tenant = await tx.tenant.create({
      data: {
        name: input.name.trim(),
        slug: input.slug,
        webSlug: input.webSlug,
        email: input.email ?? null,
        isActive: true,
      },
    });
    await seedRoles(tx, tenant.id);
    await seedReminderConfig(tx, tenant.id);
    await seedSystemConfig(tx, tenant.id);

    const adminRole = await tx.role.findFirstOrThrow({
      where: { tenantId: tenant.id, name: 'admin', isActive: true },
    });
    await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: input.initialAdmin.email.trim().toLowerCase(),
        name: input.initialAdmin.name.trim(),
        passwordHash,
        roleId: adminRole.id,
      },
    });

    const subscription = await tx.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        agreedPriceUsd: v.price,
        gracePeriodDays: v.gracePeriodDays,
      },
    });
    const period = await tx.subscriptionPeriod.create({
      data: {
        subscriptionId: subscription.id,
        subscriptionPlanId: v.plan.id,
        startsAt: v.period.startsAt,
        endsAt: v.period.endsAt,
        priceUsdSnapshot: v.price,
        planCodeSnapshot: v.plan.code,
        planNameSnapshot: v.plan.name,
        featuresSnapshot: v.plan.features as Prisma.InputJsonObject,
        limitsSnapshot: v.plan.limits as Prisma.InputJsonObject,
      },
    });
    await tx.tenantSubscription.update({
      where: { id: subscription.id },
      data: { subscriptionPeriodId: period.id },
    });
    const invoice = await tx.subscriptionInvoice.create({
      data: {
        subscriptionPeriodId: period.id,
        number: `SUB-${randomUUID()}`,
        totalUsd: v.price,
        issuedAt: new Date(),
        dueAt: v.dueAt,
      },
    });

    await tx.platformIdempotencyKey.create({
      data: { scope: SCOPE, key, fingerprint, resultRef: tenant.id },
    });
    await writePlatformAudit(tx, actor, {
      action: 'CREATE',
      entity: 'Tenant',
      entityId: tenant.id,
      targetTenantId: tenant.id,
      newValues: {
        name: tenant.name,
        slug: tenant.slug,
        webSlug: input.webSlug,
      },
      changedFields: ['name', 'slug', 'webSlug', 'isActive'],
    });
    await writePlatformAudit(tx, actor, {
      action: 'CREATE',
      entity: 'TenantSubscription',
      entityId: subscription.id,
      targetTenantId: tenant.id,
      newValues: {
        planCode: v.plan.code,
        agreedPriceUsd: v.price,
        gracePeriodDays: v.gracePeriodDays,
        startsAt: v.period.startsAt.toISOString(),
        endsAt: v.period.endsAt.toISOString(),
      },
      changedFields: ['agreedPriceUsd', 'gracePeriodDays', 'planCode'],
    });

    // Dentro de la transacción: el cliente base aún no ve el centro (no commiteado).
    const detail = await tx.tenant.findUnique({
      where: { id: tenant.id },
      select: TENANT_SELECT,
    });
    return {
      tenant: detail as TenantRecord,
      subscription: {
        id: subscription.id,
        status: 'ACTIVE',
        agreedPriceUsd: v.price,
      },
      invoice: {
        id: invoice.id,
        number: invoice.number,
        totalUsd: v.price,
        dueAt: v.dueAt,
      },
    };
  }
}

function assertIdempotencyKey(key: string | undefined): string {
  if (!key || key.length < MIN_KEY_LENGTH || key.length > MAX_KEY_LENGTH) {
    throw new BadRequestException(
      `Idempotency-Key requerido (${MIN_KEY_LENGTH}-${MAX_KEY_LENGTH} caracteres)`,
    );
  }
  return key;
}

function validateSlugs(input: TenantCreateInput): void {
  validateDnsLabel(input.slug, 'slug');
  validateWebSlug(input.webSlug);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}
