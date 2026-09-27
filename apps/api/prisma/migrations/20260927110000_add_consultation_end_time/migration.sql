ALTER TABLE "consultations" ADD COLUMN "ends_at" TIMESTAMP(3);

UPDATE "consultations" AS consultation
SET "ends_at" = consultation."date" + make_interval(
  mins => COALESCE(
    (
      SELECT NULLIF(config."value", '')::integer
      FROM "system_configs" AS config
      WHERE config."tenantId" = consultation."tenantId"
        AND config."key" = 'appointment_slot_minutes'
      LIMIT 1
    ),
    60
  )
);

ALTER TABLE "consultations" ALTER COLUMN "ends_at" SET NOT NULL;

CREATE INDEX "consultations_tenantId_doctorId_date_ends_at_idx"
ON "consultations"("tenantId", "doctorId", "date", "ends_at");
