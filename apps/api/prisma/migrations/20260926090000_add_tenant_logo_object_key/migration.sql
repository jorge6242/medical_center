-- Align the database FK with the required TraceLog tenant relation before
-- introducing the tenant logo object key. This preserves all existing rows.
ALTER TABLE "trace_logs" DROP CONSTRAINT "trace_logs_tenantId_fkey";
ALTER TABLE "trace_logs"
  ADD CONSTRAINT "trace_logs_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenants" ADD COLUMN "logoObjectKey" TEXT;
