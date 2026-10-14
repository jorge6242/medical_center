import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, type PaymentMethod } from '@prisma/client';

import {
  assertMethodMatchesCurrency,
  invoiceStatusFor,
  paymentAmountUsd,
  remainingUsd,
  type PaymentCurrency,
} from './subscription-payment-math';
import { PrismaService } from '../../database/prisma.service';
import { writePlatformAudit } from '../audit/platform-audit';
import { PLATFORM_JWT_SECRET } from '../auth/platform-auth.constants';
import { requestFingerprint } from '../tenants/platform-tenant-provisioning';

import type { PlatformIdentity } from '../auth/platform-auth.service';

const PAYMENT_SCOPE = 'platform.subscription.payment';
const VOID_SCOPE = 'platform.subscription.payment.void';
const CONFLICT_DUPLICATE =
  'La clave de idempotencia ya se usó con otro payload';

export interface PaymentInput {
  currency: PaymentCurrency;
  amountPaid: string;
  rate: string | null;
  method: string;
  reference?: string;
  paidAt: string;
  idempotencyKey: string;
}

export interface VoidInput {
  reason: string;
  idempotencyKey: string;
}

@Injectable()
export class PlatformSubscriptionPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PLATFORM_JWT_SECRET) private readonly secret: string,
  ) {}

  async registerPayment(
    actor: PlatformIdentity,
    tenantId: string,
    invoiceId: string,
    input: PaymentInput,
  ) {
    const fingerprint = requestFingerprint(
      { tenantId, invoiceId, ...withoutKey(input) },
      this.secret,
    );
    const replay = await this.replayOf(
      PAYMENT_SCOPE,
      input.idempotencyKey,
      fingerprint,
    );
    if (replay) return replay;

    assertMethodMatchesCurrency(input.method, input.currency);
    const amountUsd = paymentAmountUsd(input);
    await this.requireInvoice(tenantId, invoiceId);

    return this.prisma.$transaction(async (tx) => {
      await lockInvoice(tx, invoiceId);
      const lockedReplay = await this.replayOf(
        PAYMENT_SCOPE,
        input.idempotencyKey,
        fingerprint,
        tx,
      );
      if (lockedReplay) return lockedReplay;
      const invoice = await tx.subscriptionInvoice.findFirst({
        where: { id: invoiceId },
      });
      if (!invoice) throw new NotFoundException('Factura no encontrada');
      if (invoice.status === 'VOIDED')
        throw new ConflictException('La factura está anulada');

      const confirmed = await confirmedSum(tx, invoiceId);
      if (
        new Prisma.Decimal(amountUsd).greaterThan(
          remainingUsd(invoice.totalUsd.toString(), confirmed),
        )
      ) {
        throw new ConflictException(
          'El pago supera el saldo pendiente de la factura',
        );
      }

      const payment = await tx.subscriptionPayment.create({
        data: {
          subscriptionInvoiceId: invoiceId,
          status: 'CONFIRMED',
          amountUsd,
          paymentCurrency: input.currency,
          amountPaid: input.amountPaid,
          exchangeRateSnapshot: input.currency === 'VES' ? input.rate : null,
          paymentMethod: input.method as PaymentMethod,
          referenceNumber: input.reference ?? null,
          idempotencyKey: input.idempotencyKey,
          paidAt: new Date(input.paidAt),
          confirmedAt: new Date(),
        },
      });
      const newStatus = invoiceStatusFor(
        invoice.totalUsd.toString(),
        new Prisma.Decimal(confirmed).plus(amountUsd).toFixed(2),
        invoice.dueAt,
      );
      await tx.subscriptionInvoice.update({
        where: { id: invoiceId },
        data: { status: newStatus },
      });
      await tx.platformIdempotencyKey.create({
        data: {
          scope: PAYMENT_SCOPE,
          key: input.idempotencyKey,
          fingerprint,
          resultRef: payment.id,
        },
      });
      await writePlatformAudit(tx, actor, {
        action: 'CREATE',
        entity: 'SubscriptionPayment',
        entityId: payment.id,
        targetTenantId: tenantId,
        newValues: {
          invoiceId,
          amountUsd,
          currency: input.currency,
          invoiceStatus: newStatus,
        },
        changedFields: ['payment', 'invoiceStatus'],
      });
      return {
        replayed: false,
        paymentId: payment.id,
        amountUsd,
        invoiceStatus: newStatus,
      };
    });
  }

  async voidPayment(
    actor: PlatformIdentity,
    tenantId: string,
    paymentId: string,
    input: VoidInput,
  ) {
    const reason = input.reason.trim();
    if (!reason) throw new BadRequestException('El motivo es obligatorio');
    const fingerprint = requestFingerprint(
      { tenantId, paymentId, reason },
      this.secret,
    );
    const replay = await this.replayOf(
      VOID_SCOPE,
      input.idempotencyKey,
      fingerprint,
    );
    if (replay) return replay;

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.subscriptionPayment.findFirst({
        where: {
          id: paymentId,
          subscriptionInvoice: {
            subscriptionPeriod: { subscription: { tenantId } },
          },
        },
      });
      if (!payment) throw new NotFoundException('Pago no encontrado');
      await lockInvoice(tx, payment.subscriptionInvoiceId);
      const lockedReplay = await this.replayOf(
        VOID_SCOPE,
        input.idempotencyKey,
        fingerprint,
        tx,
      );
      if (lockedReplay) return lockedReplay;
      const lockedPayment = await tx.subscriptionPayment.findFirst({
        where: {
          id: paymentId,
          subscriptionInvoice: {
            subscriptionPeriod: { subscription: { tenantId } },
          },
        },
      });
      if (!lockedPayment) throw new NotFoundException('Pago no encontrado');
      if (lockedPayment.status !== 'CONFIRMED')
        throw new ConflictException('El pago ya fue anulado');
      await tx.subscriptionPayment.update({
        where: { id: paymentId },
        data: { status: 'VOIDED' },
      });

      const invoice = await tx.subscriptionInvoice.findFirst({
        where: { id: payment.subscriptionInvoiceId },
      });
      if (!invoice) throw new NotFoundException('Factura no encontrada');
      const newStatus = invoiceStatusFor(
        invoice.totalUsd.toString(),
        await confirmedSum(tx, invoice.id),
        invoice.dueAt,
      );
      await tx.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      });

      await tx.platformIdempotencyKey.create({
        data: {
          scope: VOID_SCOPE,
          key: input.idempotencyKey,
          fingerprint,
          resultRef: paymentId,
        },
      });
      await writePlatformAudit(tx, actor, {
        action: 'VOID',
        entity: 'SubscriptionPayment',
        entityId: paymentId,
        targetTenantId: tenantId,
        oldValues: { status: 'CONFIRMED' },
        newValues: { status: 'VOIDED', invoiceStatus: newStatus },
        changedFields: ['status', 'invoiceStatus'],
        reason,
      });
      return { replayed: false, paymentId, invoiceStatus: newStatus };
    });
  }

  private async requireInvoice(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.subscriptionInvoice.findFirst({
      where: {
        id: invoiceId,
        subscriptionPeriod: { subscription: { tenantId } },
      },
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    if (invoice.status === 'VOIDED')
      throw new ConflictException('La factura está anulada');
    return invoice;
  }

  private async replayOf(
    scope: string,
    key: string,
    fingerprint: string,
    client: Pick<Prisma.TransactionClient, 'platformIdempotencyKey'> = this
      .prisma,
  ) {
    const existing = await client.platformIdempotencyKey.findUnique({
      where: { scope_key: { scope, key } },
    });
    if (!existing) return null;
    if (existing.fingerprint !== fingerprint)
      throw new ConflictException(CONFLICT_DUPLICATE);
    return { replayed: true, paymentId: existing.resultRef };
  }
}

// La huella no incluye la clave de idempotencia: la clave identifica la operación.
function withoutKey(input: PaymentInput) {
  return {
    currency: input.currency,
    amountPaid: input.amountPaid,
    rate: input.rate,
    method: input.method,
    reference: input.reference,
    paidAt: input.paidAt,
  };
}

async function lockInvoice(
  tx: Prisma.TransactionClient,
  invoiceId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM subscription_invoices WHERE id = ${invoiceId} FOR UPDATE`;
}

async function confirmedSum(
  tx: Prisma.TransactionClient,
  invoiceId: string,
): Promise<string> {
  const result = await tx.subscriptionPayment.aggregate({
    where: { subscriptionInvoiceId: invoiceId, status: 'CONFIRMED' },
    _sum: { amountUsd: true },
  });
  return (result._sum.amountUsd ?? new Prisma.Decimal(0)).toString();
}
