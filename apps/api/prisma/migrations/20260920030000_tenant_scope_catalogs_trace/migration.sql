-- Tenant-scope shared business catalogs and make trace ownership mandatory.
ALTER TABLE "services" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "expense_categories" ADD COLUMN "tenantId" TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "services")
     AND NOT EXISTS (SELECT 1 FROM "tenants" WHERE "id" = 'tenant-demo-001') THEN
    RAISE EXCEPTION 'Cannot backfill services without tenant-demo-001';
  END IF;

  IF EXISTS (SELECT 1 FROM "expense_categories")
     AND NOT EXISTS (SELECT 1 FROM "tenants" WHERE "id" = 'tenant-demo-001') THEN
    RAISE EXCEPTION 'Cannot backfill expense_categories without tenant-demo-001';
  END IF;

  IF EXISTS (SELECT 1 FROM "trace_logs" WHERE "tenantId" IS NULL)
     AND NOT EXISTS (SELECT 1 FROM "tenants" WHERE "id" = 'tenant-demo-001') THEN
    RAISE EXCEPTION 'Cannot backfill trace_logs without tenant-demo-001';
  END IF;
END $$;

UPDATE "services" SET "tenantId" = 'tenant-demo-001' WHERE "tenantId" IS NULL;
UPDATE "expense_categories" SET "tenantId" = 'tenant-demo-001' WHERE "tenantId" IS NULL;
UPDATE "trace_logs" SET "tenantId" = 'tenant-demo-001' WHERE "tenantId" IS NULL;

ALTER TABLE "services" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "expense_categories" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "trace_logs" ALTER COLUMN "tenantId" SET NOT NULL;

DROP INDEX "services_name_key";
DROP INDEX "expense_categories_name_key";

CREATE UNIQUE INDEX "services_tenantId_name_key" ON "services"("tenantId", "name");
CREATE INDEX "services_tenantId_idx" ON "services"("tenantId");
CREATE UNIQUE INDEX "expense_categories_tenantId_name_key" ON "expense_categories"("tenantId", "name");
CREATE INDEX "expense_categories_tenantId_idx" ON "expense_categories"("tenantId");

ALTER TABLE "services"
  ADD CONSTRAINT "services_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expense_categories"
  ADD CONSTRAINT "expense_categories_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
