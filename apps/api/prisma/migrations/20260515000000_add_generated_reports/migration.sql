-- Create GeneratedReport table
CREATE TABLE "generated_reports" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "blob" BYTEA NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_reports_pkey" PRIMARY KEY ("id")
);

-- Create unique index on jobId
CREATE UNIQUE INDEX "generated_reports_jobId_key" ON "generated_reports"("jobId");

-- Create indexes for tenant queries and cleanup
CREATE INDEX "generated_reports_tenantId_createdAt_idx" ON "generated_reports"("tenantId", "createdAt");
CREATE INDEX "generated_reports_expiresAt_idx" ON "generated_reports"("expiresAt");

-- Add composite index for Payment date range queries
-- (lab_orders_tenantId_createdAt_status_idx already created in 20260514000000)
CREATE INDEX "payments_tenantId_createdAt_status_idx" ON "payments"("tenantId", "createdAt", "status");
