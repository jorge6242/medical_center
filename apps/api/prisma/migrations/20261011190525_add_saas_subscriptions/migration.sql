BEGIN;

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SubscriptionBillingCycle" AS ENUM ('MONTHLY');

-- CreateEnum
CREATE TYPE "SubscriptionInvoiceStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOIDED');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'VOIDED');

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionPeriodId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "agreedPriceUsd" DECIMAL(12,2) NOT NULL,
    "promoExpiresAt" TIMESTAMPTZ(3),
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 3,
    "canceledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePriceUsd" DECIMAL(12,2) NOT NULL,
    "billingCycle" "SubscriptionBillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "features" JSONB NOT NULL,
    "limits" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_periods" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "subscriptionPlanId" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "priceUsdSnapshot" DECIMAL(12,2) NOT NULL,
    "planCodeSnapshot" TEXT NOT NULL,
    "planNameSnapshot" TEXT NOT NULL,
    "featuresSnapshot" JSONB NOT NULL,
    "limitsSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invoices" (
    "id" TEXT NOT NULL,
    "subscriptionPeriodId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "SubscriptionInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "totalUsd" DECIMAL(12,2) NOT NULL,
    "issuedAt" TIMESTAMPTZ(3) NOT NULL,
    "dueAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "subscriptionInvoiceId" TEXT NOT NULL,
    "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountUsd" DECIMAL(12,2) NOT NULL,
    "paymentCurrency" "Currency" NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL,
    "exchangeRateSnapshot" DECIMAL(12,4),
    "paymentMethod" "PaymentMethod" NOT NULL,
    "referenceNumber" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "paidAt" TIMESTAMPTZ(3) NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscriptions_tenantId_key" ON "tenant_subscriptions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscriptions_subscriptionPeriodId_key" ON "tenant_subscriptions"("subscriptionPeriodId");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_status_idx" ON "tenant_subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscriptions_subscriptionPeriodId_id_key" ON "tenant_subscriptions"("subscriptionPeriodId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE INDEX "subscription_periods_subscriptionPlanId_idx" ON "subscription_periods"("subscriptionPlanId");

-- CreateIndex
CREATE INDEX "subscription_periods_endsAt_idx" ON "subscription_periods"("endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_periods_id_subscriptionId_key" ON "subscription_periods"("id", "subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_periods_subscriptionId_startsAt_endsAt_key" ON "subscription_periods"("subscriptionId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_subscriptionPeriodId_key" ON "subscription_invoices"("subscriptionPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_number_key" ON "subscription_invoices"("number");

-- CreateIndex
CREATE INDEX "subscription_invoices_status_dueAt_idx" ON "subscription_invoices"("status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_idempotencyKey_key" ON "subscription_payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "subscription_payments_subscriptionInvoiceId_status_idx" ON "subscription_payments"("subscriptionInvoiceId", "status");

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_subscriptionPeriodId_id_fkey" FOREIGN KEY ("subscriptionPeriodId", "id") REFERENCES "subscription_periods"("id", "subscriptionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscription_periods" ADD CONSTRAINT "subscription_periods_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "tenant_subscriptions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscription_periods" ADD CONSTRAINT "subscription_periods_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscriptionPeriodId_fkey" FOREIGN KEY ("subscriptionPeriodId") REFERENCES "subscription_periods"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscriptionInvoiceId_fkey" FOREIGN KEY ("subscriptionInvoiceId") REFERENCES "subscription_invoices"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Database invariants not expressible as Prisma field attributes.
ALTER TABLE "tenant_subscriptions"
ADD CONSTRAINT "tenant_subscriptions_price_check" CHECK ("agreedPriceUsd" >= 0),
ADD CONSTRAINT "tenant_subscriptions_grace_check" CHECK ("gracePeriodDays" >= 0);

ALTER TABLE "subscription_plans"
ADD CONSTRAINT "subscription_plans_price_check" CHECK ("basePriceUsd" >= 0),
ADD CONSTRAINT "subscription_plans_features_check" CHECK (jsonb_typeof("features") = 'object'),
ADD CONSTRAINT "subscription_plans_limits_check" CHECK (jsonb_typeof("limits") = 'object');

ALTER TABLE "subscription_periods"
ADD CONSTRAINT "subscription_periods_dates_check" CHECK ("endsAt" > "startsAt"),
ADD CONSTRAINT "subscription_periods_price_check" CHECK ("priceUsdSnapshot" >= 0),
ADD CONSTRAINT "subscription_periods_features_check" CHECK (jsonb_typeof("featuresSnapshot") = 'object'),
ADD CONSTRAINT "subscription_periods_limits_check" CHECK (jsonb_typeof("limitsSnapshot") = 'object');

ALTER TABLE "subscription_invoices"
ADD CONSTRAINT "subscription_invoices_total_check" CHECK ("totalUsd" >= 0),
ADD CONSTRAINT "subscription_invoices_dates_check" CHECK ("dueAt" >= "issuedAt");

ALTER TABLE "subscription_payments"
ADD CONSTRAINT "subscription_payments_amounts_check" CHECK ("amountUsd" > 0 AND "amountPaid" > 0),
ADD CONSTRAINT "subscription_payments_rate_check" CHECK ("exchangeRateSnapshot" IS NULL OR "exchangeRateSnapshot" > 0),
ADD CONSTRAINT "subscription_payments_ves_rate_check" CHECK ("paymentCurrency" <> 'VES' OR "exchangeRateSnapshot" IS NOT NULL),
ADD CONSTRAINT "subscription_payments_confirmation_check" CHECK ("status" <> 'CONFIRMED' OR "confirmedAt" IS NOT NULL);

COMMIT;
