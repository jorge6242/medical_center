ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "attendedAt" TIMESTAMP(3);
ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "attendedById" TEXT;
