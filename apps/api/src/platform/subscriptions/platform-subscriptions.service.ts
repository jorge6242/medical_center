import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  assertTransition,
  type SubscriptionStatus,
} from './subscription-transitions';
import { PrismaService } from '../../database/prisma.service';
import { writePlatformAudit } from '../audit/platform-audit';
import { PLATFORM_JWT_SECRET } from '../auth/platform-auth.constants';
import {
  billingPeriodFor,
  parseAgreedPrice,
  requestFingerprint,
} from '../tenants/platform-tenant-provisioning';

import type { PlatformIdentity } from '../auth/platform-auth.service';
import type { SubscriptionHistoryQueryDto } from './dto/subscription-history-query.dto';
import type { Prisma } from '@prisma/client';

const PERIOD_SCOPE = 'platform.subscription.period';
const VERSION_CONFLICT = 'El contrato cambió; recargá antes de guardar';
const GRACE_MIN = 0;
const GRACE_MAX = 30;
const UNIQUE_VIOLATION = 'P2002';

export interface ContractUpdateInput {
  agreedPriceUsd?: string;
  gracePeriodDays?: number;
  promoExpiresAt?: string | null;
  reason: string;
  expectedVersion: number;
}

export interface StatusChangeInput {
  status: SubscriptionStatus;
  reason: string;
  expectedVersion: number;
}

export interface PeriodCreateInput {
  planCode: string;
  startsAt: string;
  dueAt: string;
  idempotencyKey: string;
}

export interface ContractRecord {
  id: string;
  tenantId: string;
  status: SubscriptionStatus;
  agreedPriceUsd: string;
  gracePeriodDays: number;
  version: number;
  subscriptionPeriodId: string | null;
}

@Injectable()
export class PlatformSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PLATFORM_JWT_SECRET) private readonly secret: string,
  ) {}

  async getContract(tenantId: string, query: SubscriptionHistoryQueryDto = {}) {
    const pages = historyPages(query);
    const contract = await this.requireContract(tenantId);
    const periodWhere = { subscriptionId: contract.id };
    const invoiceWhere = { subscriptionPeriod: periodWhere };
    const paymentWhere = { subscriptionInvoice: invoiceWhere };
    const [
      periods,
      invoices,
      payments,
      periodTotal,
      invoiceTotal,
      paymentTotal,
    ] = await Promise.all([
      this.prisma.subscriptionPeriod.findMany({
        where: periodWhere,
        orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
        skip: (pages.periodPage - 1) * pages.limit,
        take: pages.limit,
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          priceUsdSnapshot: true,
          planCodeSnapshot: true,
        },
      }),
      this.prisma.subscriptionInvoice.findMany({
        where: invoiceWhere,
        orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }],
        skip: (pages.invoicePage - 1) * pages.limit,
        take: pages.limit,
        select: {
          id: true,
          number: true,
          status: true,
          totalUsd: true,
          dueAt: true,
        },
      }),
      this.prisma.subscriptionPayment.findMany({
        where: paymentWhere,
        orderBy: [{ paidAt: 'desc' }, { id: 'desc' }],
        skip: (pages.paymentPage - 1) * pages.limit,
        take: pages.limit,
        select: {
          id: true,
          subscriptionInvoiceId: true,
          status: true,
          amountUsd: true,
          paymentCurrency: true,
          amountPaid: true,
          paidAt: true,
        },
      }),
      this.prisma.subscriptionPeriod.count({ where: periodWhere }),
      this.prisma.subscriptionInvoice.count({ where: invoiceWhere }),
      this.prisma.subscriptionPayment.count({ where: paymentWhere }),
    ]);
    return {
      contract,
      periods,
      invoices,
      payments,
      pagination: {
        periods: {
          page: pages.periodPage,
          limit: pages.limit,
          total: periodTotal,
        },
        invoices: {
          page: pages.invoicePage,
          limit: pages.limit,
          total: invoiceTotal,
        },
        payments: {
          page: pages.paymentPage,
          limit: pages.limit,
          total: paymentTotal,
        },
      },
    };
  }

  async updateContract(
    actor: PlatformIdentity,
    tenantId: string,
    input: ContractUpdateInput,
  ) {
    if (!input.reason.trim())
      throw new BadRequestException('El motivo es obligatorio');
    const changes = buildContractChanges(input);
    await this.prisma.$transaction(async (tx) => {
      const current = await this.lockedContract(tx, tenantId);
      assertVersion(current.version, input.expectedVersion);
      await this.guardedWrite(tx, current.id, input.expectedVersion, changes);
      await writePlatformAudit(tx, actor, {
        action: 'UPDATE',
        entity: 'TenantSubscription',
        entityId: current.id,
        targetTenantId: tenantId,
        oldValues: pick(
          current,
          Object.keys(changes),
        ) as Prisma.InputJsonObject,
        newValues: changes as Prisma.InputJsonObject,
        changedFields: Object.keys(changes),
        reason: input.reason.trim(),
      });
    });
    return this.getContract(tenantId);
  }

  async changeStatus(
    actor: PlatformIdentity,
    tenantId: string,
    input: StatusChangeInput,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const current = await this.lockedContract(tx, tenantId);
      assertVersion(current.version, input.expectedVersion);
      assertTransition(current.status, input.status, input.reason);
      const changes: Record<string, unknown> = { status: input.status };
      if (input.status === 'CANCELED') changes['canceledAt'] = new Date();
      await this.guardedWrite(tx, current.id, input.expectedVersion, changes);
      await writePlatformAudit(tx, actor, {
        action: 'STATUS_CHANGE',
        entity: 'TenantSubscription',
        entityId: current.id,
        targetTenantId: tenantId,
        oldValues: { status: current.status },
        newValues: { status: input.status },
        changedFields: ['status'],
        reason: input.reason.trim(),
      });
    });
    return this.getContract(tenantId);
  }

  async createPeriod(
    actor: PlatformIdentity,
    tenantId: string,
    input: PeriodCreateInput,
  ) {
    const fingerprint = requestFingerprint(
      {
        tenantId,
        planCode: input.planCode,
        startsAt: input.startsAt,
        dueAt: input.dueAt,
      },
      this.secret,
    );
    const period = billingPeriodFor(input.startsAt);
    const dueAt = new Date(input.dueAt);
    if (dueAt.getTime() < period.startsAt.getTime()) {
      throw new BadRequestException(
        'dueAt no puede ser anterior al inicio del período',
      );
    }
    const created = await this.prisma
      .$transaction(async (tx) => {
        const contract = await this.lockedContract(tx, tenantId);
        const existing = await tx.platformIdempotencyKey.findUnique({
          where: {
            scope_key: { scope: PERIOD_SCOPE, key: input.idempotencyKey },
          },
        });
        if (existing) {
          if (existing.fingerprint !== fingerprint)
            throw new ConflictException(
              'La clave de idempotencia ya se usó con otro payload',
            );
          return { replayed: true, periodId: existing.resultRef };
        }
        if (!['ACTIVE', 'TRIALING'].includes(contract.status)) {
          throw new ConflictException(
            'El contrato no admite nuevos períodos en su estado actual',
          );
        }
        const plan = await tx.subscriptionPlan.findFirst({
          where: { code: input.planCode, isActive: true },
        });
        if (!plan) throw new BadRequestException('Plan no válido o inactivo');
        await this.assertContiguous(tx, contract.id, period.startsAt);
        const newPeriod = await tx.subscriptionPeriod.create({
          data: {
            subscriptionId: contract.id,
            subscriptionPlanId: plan.id,
            startsAt: period.startsAt,
            endsAt: period.endsAt,
            priceUsdSnapshot: contract.agreedPriceUsd,
            planCodeSnapshot: plan.code,
            planNameSnapshot: plan.name,
            featuresSnapshot: plan.features as Prisma.InputJsonObject,
            limitsSnapshot: plan.limits as Prisma.InputJsonObject,
          },
        });
        await tx.tenantSubscription.updateMany({
          where: { id: contract.id },
          data: { subscriptionPeriodId: newPeriod.id },
        });
        const invoice = await tx.subscriptionInvoice.create({
          data: {
            subscriptionPeriodId: newPeriod.id,
            number: `SUB-${randomUUID()}`,
            totalUsd: contract.agreedPriceUsd,
            issuedAt: new Date(),
            dueAt,
          },
        });
        await tx.platformIdempotencyKey.create({
          data: {
            scope: PERIOD_SCOPE,
            key: input.idempotencyKey,
            fingerprint,
            resultRef: newPeriod.id,
          },
        });
        await writePlatformAudit(tx, actor, {
          action: 'CREATE',
          entity: 'SubscriptionPeriod',
          entityId: newPeriod.id,
          targetTenantId: tenantId,
          newValues: {
            planCode: plan.code,
            startsAt: period.startsAt.toISOString(),
            priceUsd: contract.agreedPriceUsd,
          },
          changedFields: ['period', 'invoice'],
        });
        return {
          replayed: false,
          periodId: newPeriod.id,
          invoiceId: invoice.id,
        };
      })
      .catch((error: unknown) => {
        if (isUniqueViolation(error))
          throw new ConflictException('El período ya existe');
        throw error;
      });

    return created;
  }

  private async requireContract(tenantId: string): Promise<ContractRecord> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Centro no encontrado');
    const contract = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });
    if (!contract)
      throw new NotFoundException('El centro no tiene contrato SaaS');
    return contract as unknown as ContractRecord;
  }

  private async assertContiguous(
    tx: Prisma.TransactionClient,
    subscriptionId: string,
    startsAt: Date,
  ): Promise<void> {
    const latest = await tx.subscriptionPeriod.findFirst({
      where: { subscriptionId },
      orderBy: { endsAt: 'desc' },
    });
    if (latest && latest.endsAt.getTime() !== startsAt.getTime()) {
      throw new BadRequestException(
        'El período debe ser contiguo al último: sin solapamientos ni huecos',
      );
    }
  }

  private async guardedWrite(
    tx: Prisma.TransactionClient,
    contractId: string,
    expectedVersion: number,
    changes: Record<string, unknown>,
  ): Promise<void> {
    const result = await tx.tenantSubscription.updateMany({
      where: { id: contractId, version: expectedVersion },
      data: { ...changes, version: { increment: 1 } },
    });
    if (result.count === 0) throw new ConflictException(VERSION_CONFLICT);
  }

  private async lockedContract(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<ContractRecord> {
    const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Centro no encontrado');
    await tx.$queryRaw`SELECT id FROM tenant_subscriptions WHERE "tenantId" = ${tenantId} FOR UPDATE`;
    const contract = await tx.tenantSubscription.findUnique({
      where: { tenantId },
    });
    if (!contract)
      throw new NotFoundException('El centro no tiene contrato SaaS');
    return contract as unknown as ContractRecord;
  }
}

function historyPages(query: SubscriptionHistoryQueryDto) {
  const pages = {
    periodPage: query.periodPage ?? 1,
    invoicePage: query.invoicePage ?? 1,
    paymentPage: query.paymentPage ?? 1,
    limit: query.limit ?? 20,
  };
  if (
    Object.values(pages).some(
      (value) => !Number.isSafeInteger(value) || value < 1,
    ) ||
    pages.limit > 100
  ) {
    throw new BadRequestException(
      'Paginación inválida: páginas positivas y límite entre 1 y 100',
    );
  }
  return pages;
}

function buildContractChanges(
  input: ContractUpdateInput,
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  if (input.agreedPriceUsd !== undefined) {
    changes['agreedPriceUsd'] = parseAgreedPrice(input.agreedPriceUsd);
  }
  if (input.gracePeriodDays !== undefined) {
    if (
      input.gracePeriodDays < GRACE_MIN ||
      input.gracePeriodDays > GRACE_MAX
    ) {
      throw new BadRequestException('gracePeriodDays debe estar entre 0 y 30');
    }
    changes['gracePeriodDays'] = input.gracePeriodDays;
  }
  if (input.promoExpiresAt !== undefined) {
    changes['promoExpiresAt'] = input.promoExpiresAt
      ? new Date(input.promoExpiresAt)
      : null;
  }
  if (Object.keys(changes).length === 0) {
    throw new BadRequestException('No hay cambios para guardar');
  }
  return changes;
}

function assertVersion(current: number, expected: number): void {
  if (current !== expected) throw new ConflictException(VERSION_CONFLICT);
}

function pick(record: ContractRecord, keys: string[]): Record<string, unknown> {
  const source = record as unknown as Record<string, unknown>;
  return Object.fromEntries(keys.map((key) => [key, source[key]]));
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}
