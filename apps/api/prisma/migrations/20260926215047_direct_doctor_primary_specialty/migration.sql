/*
  Warnings:

  - The primary specialty is copied from the existing `doctor_specialties` relation before it is removed.

*/
-- AlterTable
ALTER TABLE "doctors" ADD COLUMN "primarySpecialtyId" TEXT;

-- Backfill the explicitly primary specialty, with a deterministic fallback for legacy rows.
UPDATE "doctors" AS doctor
SET "primarySpecialtyId" = COALESCE(
  (
    SELECT "specialtyId"
    FROM "doctor_specialties"
    WHERE "doctorId" = doctor.id AND "isPrimary" = true
    ORDER BY id
    LIMIT 1
  ),
  (
    SELECT "specialtyId"
    FROM "doctor_specialties"
    WHERE "doctorId" = doctor.id
    ORDER BY id
    LIMIT 1
  )
);

-- AlterTable
ALTER TABLE "doctors" ALTER COLUMN "primarySpecialtyId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "doctor_specialties" DROP CONSTRAINT "doctor_specialties_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "doctor_specialties" DROP CONSTRAINT "doctor_specialties_specialtyId_fkey";

-- DropTable
DROP TABLE "doctor_specialties";

-- CreateIndex
CREATE INDEX "doctors_primarySpecialtyId_idx" ON "doctors"("primarySpecialtyId");

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_primarySpecialtyId_fkey" FOREIGN KEY ("primarySpecialtyId") REFERENCES "specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
