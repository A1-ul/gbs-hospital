-- CreateTable
CREATE TABLE "HospitalPatientLocation" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "wardId" TEXT,
    "roomId" TEXT,
    "bedId" TEXT,
    "patientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalPatientLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HospitalPatientLocation_hospitalId_idx" ON "HospitalPatientLocation"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalPatientLocation_patientId_idx" ON "HospitalPatientLocation"("patientId");

-- CreateIndex
CREATE INDEX "HospitalPatientLocation_wardId_idx" ON "HospitalPatientLocation"("wardId");

-- CreateIndex
CREATE INDEX "HospitalPatientLocation_roomId_idx" ON "HospitalPatientLocation"("roomId");

-- CreateIndex
CREATE INDEX "HospitalPatientLocation_bedId_idx" ON "HospitalPatientLocation"("bedId");

-- CreateIndex
CREATE INDEX "HospitalPatientLocation_status_idx" ON "HospitalPatientLocation"("status");

-- AddForeignKey
ALTER TABLE "HospitalPatientLocation" ADD CONSTRAINT "HospitalPatientLocation_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalPatientLocation" ADD CONSTRAINT "HospitalPatientLocation_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "HospitalWard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalPatientLocation" ADD CONSTRAINT "HospitalPatientLocation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HospitalRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalPatientLocation" ADD CONSTRAINT "HospitalPatientLocation_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "HospitalBed"("id") ON DELETE SET NULL ON UPDATE CASCADE;
