-- CreateTable
CREATE TABLE "representatives" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "documentId" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "representatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_representatives" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "representativeId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_representatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "representatives_tenantId_documentId_idx" ON "representatives"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "representatives_tenantId_name_idx" ON "representatives"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "representatives_tenantId_documentType_documentId_key" ON "representatives"("tenantId", "documentType", "documentId");

-- CreateIndex
CREATE INDEX "patient_representatives_tenantId_idx" ON "patient_representatives"("tenantId");

-- CreateIndex
CREATE INDEX "patient_representatives_representativeId_idx" ON "patient_representatives"("representativeId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_representatives_patientId_representativeId_key" ON "patient_representatives"("patientId", "representativeId");

-- AddForeignKey
ALTER TABLE "representatives" ADD CONSTRAINT "representatives_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_representatives" ADD CONSTRAINT "patient_representatives_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_representatives" ADD CONSTRAINT "patient_representatives_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_representatives" ADD CONSTRAINT "patient_representatives_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "representatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
