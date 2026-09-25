ALTER TABLE "tenants" ADD COLUMN "logoUrl" TEXT;

CREATE TABLE "tenant_access_links" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_access_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_access_links_tokenHash_key" ON "tenant_access_links"("tokenHash");
CREATE INDEX "tenant_access_links_tenantId_idx" ON "tenant_access_links"("tenantId");
CREATE INDEX "tenant_access_links_expiresAt_idx" ON "tenant_access_links"("expiresAt");

ALTER TABLE "tenant_access_links"
  ADD CONSTRAINT "tenant_access_links_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_access_links"
  ADD CONSTRAINT "tenant_access_links_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
