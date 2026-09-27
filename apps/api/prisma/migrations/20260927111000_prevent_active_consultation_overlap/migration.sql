CREATE EXTENSION IF NOT EXISTS btree_gist;

DROP INDEX IF EXISTS "consultations_active_doctor_date_key";

ALTER TABLE "consultations"
ADD CONSTRAINT "consultations_active_doctor_interval_excl"
EXCLUDE USING gist (
  "tenantId" WITH =,
  "doctorId" WITH =,
  tsrange("date", "ends_at", '[)') WITH &&
)
WHERE ("status" IN ('PENDING', 'SCHEDULED'));

ALTER TABLE "consultations"
ADD CONSTRAINT "consultations_active_patient_interval_excl"
EXCLUDE USING gist (
  "tenantId" WITH =,
  "patientId" WITH =,
  tsrange("date", "ends_at", '[)') WITH &&
)
WHERE ("status" IN ('PENDING', 'SCHEDULED'));
