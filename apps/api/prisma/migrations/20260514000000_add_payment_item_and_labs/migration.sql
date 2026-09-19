-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('CONSULTATION', 'LAB');

-- CreateEnum
CREATE TYPE "LabOrderStatus" AS ENUM ('PENDING', 'PAID', 'VOIDED');

-- CreateTable: lab_test_catalogs
CREATE TABLE "lab_test_catalogs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceUsd" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_test_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: lab_orders
CREATE TABLE "lab_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "LabOrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalUsd" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable: lab_order_tests
CREATE TABLE "lab_order_tests" (
    "id" TEXT NOT NULL,
    "labOrderId" TEXT NOT NULL,
    "labTestId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "priceUsd" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "lab_order_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payment_items
CREATE TABLE "payment_items" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceUsd" DECIMAL(12,2) NOT NULL,
    "totalPriceUsd" DECIMAL(12,2) NOT NULL,
    "consultationId" TEXT,
    "labOrderId" TEXT,

    CONSTRAINT "payment_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lab_test_catalogs_tenantId_name_key" ON "lab_test_catalogs"("tenantId", "name");
CREATE INDEX "lab_test_catalogs_tenantId_idx" ON "lab_test_catalogs"("tenantId");
CREATE INDEX "lab_test_catalogs_tenantId_isActive_idx" ON "lab_test_catalogs"("tenantId", "isActive");

CREATE INDEX "lab_orders_tenantId_idx" ON "lab_orders"("tenantId");
CREATE INDEX "lab_orders_tenantId_patientId_idx" ON "lab_orders"("tenantId", "patientId");
CREATE INDEX "lab_orders_tenantId_status_idx" ON "lab_orders"("tenantId", "status");
CREATE INDEX "lab_orders_tenantId_createdAt_status_idx" ON "lab_orders"("tenantId", "createdAt", "status");

CREATE INDEX "lab_order_tests_labOrderId_idx" ON "lab_order_tests"("labOrderId");

CREATE UNIQUE INDEX "payment_items_paymentId_key" ON "payment_items"("paymentId");
CREATE UNIQUE INDEX "payment_items_consultationId_key" ON "payment_items"("consultationId");
CREATE UNIQUE INDEX "payment_items_labOrderId_key" ON "payment_items"("labOrderId");
CREATE INDEX "payment_items_itemType_idx" ON "payment_items"("itemType");
CREATE INDEX "payment_items_consultationId_idx" ON "payment_items"("consultationId");
CREATE INDEX "payment_items_labOrderId_idx" ON "payment_items"("labOrderId");

-- AddForeignKey: lab_test_catalogs → tenants
ALTER TABLE "lab_test_catalogs" ADD CONSTRAINT "lab_test_catalogs_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: lab_orders → tenants
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: lab_orders → patients
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: lab_order_tests → lab_orders
ALTER TABLE "lab_order_tests" ADD CONSTRAINT "lab_order_tests_labOrderId_fkey"
    FOREIGN KEY ("labOrderId") REFERENCES "lab_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: lab_order_tests → lab_test_catalogs
ALTER TABLE "lab_order_tests" ADD CONSTRAINT "lab_order_tests_labTestId_fkey"
    FOREIGN KEY ("labTestId") REFERENCES "lab_test_catalogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: payment_items → payments
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: payment_items → consultations
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_consultationId_fkey"
    FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: payment_items → lab_orders
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_labOrderId_fkey"
    FOREIGN KEY ("labOrderId") REFERENCES "lab_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
