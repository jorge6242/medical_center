/*
  Warnings:

  - A unique constraint covering the columns `[deduplicationKey]` on the table `reminder_logs` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "reminder_logs" ADD COLUMN     "deduplicationKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "reminder_logs_deduplicationKey_key" ON "reminder_logs"("deduplicationKey");
