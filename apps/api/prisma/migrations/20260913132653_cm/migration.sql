-- CreateEnum
CREATE TYPE "OnboardingTokenStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_tenantId_fkey";

-- DropIndex
DROP INDEX "medical_records_templateVersion_idx";

-- CreateTable
CREATE TABLE "onboarding_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "OnboardingTokenStatus" NOT NULL DEFAULT 'PENDING',
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "onboarding_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_tokens_token_key" ON "onboarding_tokens"("token");

-- CreateIndex
CREATE INDEX "onboarding_tokens_userId_sentAt_idx" ON "onboarding_tokens"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "onboarding_tokens_token_idx" ON "onboarding_tokens"("token");

-- AddForeignKey
ALTER TABLE "onboarding_tokens" ADD CONSTRAINT "onboarding_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
