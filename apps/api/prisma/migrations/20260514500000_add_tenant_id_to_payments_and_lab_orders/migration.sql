-- Add tenantId and idempotencyKey to payments (lab_orders already has tenantId from its creation migration).
ALTER TABLE "payments" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "payments" ADD COLUMN "idempotencyKey" TEXT;

-- Backfill payments from the related consultation.
UPDATE "payments" p
SET "tenantId" = c."tenantId"
FROM "consultations" c
WHERE c."paymentId" = p."id";

-- Make the column required once existing rows are populated.
ALTER TABLE "payments" ALTER COLUMN "tenantId" SET NOT NULL;

-- Add foreign key to keep tenant isolation consistent.
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add unique index for idempotency
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- Add tenant indexes for payments
CREATE INDEX "payments_tenantId_idx" ON "payments"("tenantId");
CREATE INDEX "payments_tenantId_status_idx" ON "payments"("tenantId", "status");
