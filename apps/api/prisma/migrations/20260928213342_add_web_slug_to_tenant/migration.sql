/*
  Warnings:

  - A unique constraint covering the columns `[webSlug]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "webSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tenants_webSlug_key" ON "tenants"("webSlug");
