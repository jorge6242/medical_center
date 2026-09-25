/*
  Warnings:

  - You are about to drop the `service_prices` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "service_prices" DROP CONSTRAINT "service_prices_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "service_prices" DROP CONSTRAINT "service_prices_specialtyId_fkey";

-- DropTable
DROP TABLE "service_prices";

-- CreateTable
CREATE TABLE "doctor_services" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "priceUsd" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "doctor_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "doctor_services_tenantId_idx" ON "doctor_services"("tenantId");

-- CreateIndex
CREATE INDEX "doctor_services_tenantId_doctorId_idx" ON "doctor_services"("tenantId", "doctorId");

-- CreateIndex
CREATE INDEX "doctor_services_doctorId_idx" ON "doctor_services"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_services_doctorId_specialtyId_serviceId_key" ON "doctor_services"("doctorId", "specialtyId", "serviceId");

-- AddForeignKey
ALTER TABLE "doctor_services" ADD CONSTRAINT "doctor_services_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_services" ADD CONSTRAINT "doctor_services_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_services" ADD CONSTRAINT "doctor_services_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_services" ADD CONSTRAINT "doctor_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
