CREATE UNIQUE INDEX "consultations_active_doctor_date_key"
ON "consultations" ("tenantId", "doctorId", "date")
WHERE "status" IN ('PENDING', 'SCHEDULED', 'PAID');
