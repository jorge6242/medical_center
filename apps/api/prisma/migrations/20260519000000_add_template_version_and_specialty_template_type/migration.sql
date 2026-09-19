-- Add templateVersion and templateSnapshot to MedicalRecord
-- Add templateType to Specialty

-- MedicalRecord: add version tracking for immutability
ALTER TABLE "medical_records" ADD COLUMN "templateVersion" TEXT NOT NULL DEFAULT '1.0.0';
ALTER TABLE "medical_records" ADD COLUMN "templateSnapshot" JSONB;

-- Specialty: add template type for backend-driven inference
ALTER TABLE "specialties" ADD COLUMN "templateType" TEXT;

-- Index for template version lookups
CREATE INDEX "medical_records_templateVersion_idx" ON "medical_records"("templateVersion");
