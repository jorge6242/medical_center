CREATE TYPE "DoctorPayoutStatus" AS ENUM ('COMPLETED', 'VOIDED');

CREATE TABLE "doctor_payouts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "voidedById" TEXT,
    "status" "DoctorPayoutStatus" NOT NULL DEFAULT 'COMPLETED',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "currency" "Currency" NOT NULL,
    "amountUsd" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL,
    "bcvExchangeRate" DECIMAL(12,4),
    "referenceNumber" TEXT,
    "doctorName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT,
    "bankPhone" TEXT,
    "voidReason" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "doctor_payouts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "doctor_payout_items" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "totalConsultationUsd" DECIMAL(12,2) NOT NULL,
    "doctorShareUsd" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "doctor_payout_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "doctor_payouts_tenantId_doctorId_status_idx" ON "doctor_payouts"("tenantId", "doctorId", "status");
CREATE INDEX "doctor_payouts_tenantId_createdAt_idx" ON "doctor_payouts"("tenantId", "createdAt");
CREATE INDEX "doctor_payout_items_payoutId_idx" ON "doctor_payout_items"("payoutId");
CREATE UNIQUE INDEX "doctor_payout_items_payoutId_paymentId_key" ON "doctor_payout_items"("payoutId", "paymentId");
CREATE INDEX "doctor_payout_items_paymentId_idx" ON "doctor_payout_items"("paymentId");

ALTER TABLE "doctor_payouts" ADD CONSTRAINT "doctor_payouts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctor_payouts" ADD CONSTRAINT "doctor_payouts_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctor_payouts" ADD CONSTRAINT "doctor_payouts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctor_payouts" ADD CONSTRAINT "doctor_payouts_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "doctor_payout_items" ADD CONSTRAINT "doctor_payout_items_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "doctor_payouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctor_payout_items" ADD CONSTRAINT "doctor_payout_items_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
