ALTER TABLE "audit_logs" ADD COLUMN "result" TEXT NOT NULL DEFAULT 'SUCCESS', ADD COLUMN "correlationId" TEXT, ADD COLUMN "requestId" TEXT, ADD COLUMN "metadata" JSONB, ADD COLUMN "integrityHash" TEXT NOT NULL DEFAULT '';
CREATE INDEX "audit_logs_tenantId_correlationId_idx" ON "audit_logs"("tenantId", "correlationId");
CREATE INDEX "audit_logs_tenantId_action_entity_createdAt_idx" ON "audit_logs"("tenantId", "action", "entity", "createdAt");
CREATE TABLE "trace_logs" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "userId" TEXT,
  "correlationId" TEXT,
  "level" TEXT NOT NULL DEFAULT 'INFO',
  "event" TEXT NOT NULL,
  "route" TEXT,
  "method" TEXT,
  "statusCode" INTEGER,
  "durationMs" INTEGER,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trace_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trace_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "trace_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "trace_logs_tenantId_createdAt_idx" ON "trace_logs"("tenantId", "createdAt");
CREATE INDEX "trace_logs_correlationId_idx" ON "trace_logs"("correlationId");
CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit logs are append-only'; END; $$;
CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON "audit_logs" FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
