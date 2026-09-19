-- CreateEnum
CREATE TYPE "MedicalRecordStatus" AS ENUM ('DRAFT', 'COMPLETED', 'VOIDED');

-- Add clinicalHistory to patients
ALTER TABLE "patients" ADD COLUMN "clinicalHistory" JSONB;

-- CreateTable: medical_records
CREATE TABLE "medical_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "clinicalData" JSONB NOT NULL,
    "status" "MedicalRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medical_records_consultationId_key" ON "medical_records"("consultationId");
CREATE UNIQUE INDEX "medical_records_tenantId_consultationId_key" ON "medical_records"("tenantId", "consultationId");
CREATE INDEX "medical_records_tenantId_idx" ON "medical_records"("tenantId");
CREATE INDEX "medical_records_tenantId_patientId_recordedAt_idx" ON "medical_records"("tenantId", "patientId", "recordedAt");
CREATE INDEX "medical_records_tenantId_doctorId_idx" ON "medical_records"("tenantId", "doctorId");
CREATE INDEX "medical_records_tenantId_templateType_idx" ON "medical_records"("tenantId", "templateType");

-- AddForeignKey: medical_records → tenants
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: medical_records → patients
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: medical_records → doctors
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: medical_records → consultations
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_consultationId_fkey"
    FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: medical_records → users
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
