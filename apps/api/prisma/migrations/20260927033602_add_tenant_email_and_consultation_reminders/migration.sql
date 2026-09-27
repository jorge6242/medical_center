-- CreateEnum
CREATE TYPE "ConsultationReminderType" AS ENUM ('DAY_BEFORE');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "email" TEXT;

-- CreateTable
CREATE TABLE "consultation_reminders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "type" "ConsultationReminderType" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultation_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consultation_reminders_tenantId_idx" ON "consultation_reminders"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_reminders_consultationId_type_key" ON "consultation_reminders"("consultationId", "type");

-- AddForeignKey
ALTER TABLE "consultation_reminders" ADD CONSTRAINT "consultation_reminders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_reminders" ADD CONSTRAINT "consultation_reminders_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
