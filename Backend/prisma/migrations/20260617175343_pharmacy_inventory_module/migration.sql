-- DropIndex
DROP INDEX "PatientPrescription_createdAt_idx";

-- CreateTable
CREATE TABLE "PharmacyItem" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyInventory" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "availableQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyBatch" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purchaseDate" TIMESTAMP(3),
    "supplier" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionDispense" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "pharmacistId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dispensedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionDispense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionDispenseItem" (
    "id" TEXT NOT NULL,
    "dispenseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityRequested" INTEGER NOT NULL,
    "quantityDispensed" INTEGER NOT NULL DEFAULT 0,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionDispenseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyStockMovement" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "referenceId" TEXT,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacyStockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PharmacyItem_hospitalId_idx" ON "PharmacyItem"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyItem_hospitalId_name_key" ON "PharmacyItem"("hospitalId", "name");

-- CreateIndex
CREATE INDEX "PharmacyInventory_itemId_idx" ON "PharmacyInventory"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyInventory_hospitalId_itemId_key" ON "PharmacyInventory"("hospitalId", "itemId");

-- CreateIndex
CREATE INDEX "PharmacyBatch_itemId_idx" ON "PharmacyBatch"("itemId");

-- CreateIndex
CREATE INDEX "PharmacyBatch_expiryDate_idx" ON "PharmacyBatch"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyBatch_hospitalId_batchNumber_key" ON "PharmacyBatch"("hospitalId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PrescriptionDispense_prescriptionId_key" ON "PrescriptionDispense"("prescriptionId");

-- CreateIndex
CREATE INDEX "PrescriptionDispense_hospitalId_idx" ON "PrescriptionDispense"("hospitalId");

-- CreateIndex
CREATE INDEX "PrescriptionDispense_prescriptionId_idx" ON "PrescriptionDispense"("prescriptionId");

-- CreateIndex
CREATE INDEX "PrescriptionDispense_pharmacistId_idx" ON "PrescriptionDispense"("pharmacistId");

-- CreateIndex
CREATE INDEX "PrescriptionDispenseItem_dispenseId_idx" ON "PrescriptionDispenseItem"("dispenseId");

-- CreateIndex
CREATE INDEX "PrescriptionDispenseItem_itemId_idx" ON "PrescriptionDispenseItem"("itemId");

-- CreateIndex
CREATE INDEX "PharmacyStockMovement_hospitalId_idx" ON "PharmacyStockMovement"("hospitalId");

-- CreateIndex
CREATE INDEX "PharmacyStockMovement_itemId_idx" ON "PharmacyStockMovement"("itemId");

-- CreateIndex
CREATE INDEX "PharmacyStockMovement_movementType_idx" ON "PharmacyStockMovement"("movementType");

-- CreateIndex
CREATE INDEX "PatientPrescription_prescribedById_idx" ON "PatientPrescription"("prescribedById");

-- AddForeignKey
ALTER TABLE "PharmacyItem" ADD CONSTRAINT "PharmacyItem_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyInventory" ADD CONSTRAINT "PharmacyInventory_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyInventory" ADD CONSTRAINT "PharmacyInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PharmacyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyBatch" ADD CONSTRAINT "PharmacyBatch_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyBatch" ADD CONSTRAINT "PharmacyBatch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PharmacyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionDispense" ADD CONSTRAINT "PrescriptionDispense_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionDispense" ADD CONSTRAINT "PrescriptionDispense_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "PatientPrescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionDispense" ADD CONSTRAINT "PrescriptionDispense_pharmacistId_fkey" FOREIGN KEY ("pharmacistId") REFERENCES "HospitalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionDispenseItem" ADD CONSTRAINT "PrescriptionDispenseItem_dispenseId_fkey" FOREIGN KEY ("dispenseId") REFERENCES "PrescriptionDispense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionDispenseItem" ADD CONSTRAINT "PrescriptionDispenseItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PharmacyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyStockMovement" ADD CONSTRAINT "PharmacyStockMovement_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyStockMovement" ADD CONSTRAINT "PharmacyStockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PharmacyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyStockMovement" ADD CONSTRAINT "PharmacyStockMovement_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "HospitalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
