-- CreateTable
CREATE TABLE "HospitalAdmission" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "wardId" TEXT,
    "roomId" TEXT,
    "bedId" TEXT,
    "admissionNumber" TEXT NOT NULL,
    "admissionType" TEXT NOT NULL DEFAULT 'GENERAL',
    "status" TEXT NOT NULL DEFAULT 'ADMITTED',
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalAdmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HospitalAdmission_admissionNumber_key" ON "HospitalAdmission"("admissionNumber");

-- CreateIndex
CREATE INDEX "HospitalAdmission_hospitalId_idx" ON "HospitalAdmission"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalAdmission_patientId_idx" ON "HospitalAdmission"("patientId");

-- CreateIndex
CREATE INDEX "HospitalAdmission_wardId_idx" ON "HospitalAdmission"("wardId");

-- CreateIndex
CREATE INDEX "HospitalAdmission_roomId_idx" ON "HospitalAdmission"("roomId");

-- CreateIndex
CREATE INDEX "HospitalAdmission_bedId_idx" ON "HospitalAdmission"("bedId");

-- CreateIndex
CREATE INDEX "HospitalAdmission_status_idx" ON "HospitalAdmission"("status");

-- AddForeignKey
ALTER TABLE "HospitalAdmission" ADD CONSTRAINT "HospitalAdmission_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAdmission" ADD CONSTRAINT "HospitalAdmission_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "HospitalWard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAdmission" ADD CONSTRAINT "HospitalAdmission_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HospitalRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAdmission" ADD CONSTRAINT "HospitalAdmission_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "HospitalBed"("id") ON DELETE SET NULL ON UPDATE CASCADE;
