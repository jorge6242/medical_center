/*
  Warnings:

  - You are about to drop the `consultation_reminders` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('APPOINTMENT', 'BIRTHDAY');

-- DropForeignKey
ALTER TABLE "consultation_reminders" DROP CONSTRAINT "consultation_reminders_consultationId_fkey";

-- DropForeignKey
ALTER TABLE "consultation_reminders" DROP CONSTRAINT "consultation_reminders_tenantId_fkey";

-- DropTable
DROP TABLE "consultation_reminders";

-- DropEnum
DROP TYPE "ConsultationReminderType";

-- CreateTable
CREATE TABLE "reminder_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sendToPatient" BOOLEAN NOT NULL DEFAULT true,
    "sendToDoctor" BOOLEAN NOT NULL DEFAULT false,
    "sendToAdmin" BOOLEAN NOT NULL DEFAULT true,
    "hoursBefore" INTEGER DEFAULT 24,
    "daysBefore" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "consultationId" TEXT,
    "patientId" TEXT,
    "recipient" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "error" TEXT,

    CONSTRAINT "reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reminder_configs_tenantId_type_isActive_idx" ON "reminder_configs"("tenantId", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "reminder_configs_tenantId_type_key" ON "reminder_configs"("tenantId", "type");

-- CreateIndex
CREATE INDEX "reminder_logs_tenantId_type_sentAt_idx" ON "reminder_logs"("tenantId", "type", "sentAt");

-- CreateIndex
CREATE INDEX "reminder_logs_consultationId_type_idx" ON "reminder_logs"("consultationId", "type");

-- CreateIndex
CREATE INDEX "reminder_logs_patientId_type_idx" ON "reminder_logs"("patientId", "type");

-- AddForeignKey
ALTER TABLE "reminder_configs" ADD CONSTRAINT "reminder_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
