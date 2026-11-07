-- CreateTable
CREATE TABLE "PatientMedicalRecord" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "medication" TEXT,
    "doctorName" TEXT,
    "recordedBy" TEXT,
    "recordDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientMedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientMedicalRecord_patientId_idx" ON "PatientMedicalRecord"("patientId");

-- CreateIndex
CREATE INDEX "PatientMedicalRecord_recordType_idx" ON "PatientMedicalRecord"("recordType");

-- CreateIndex
CREATE INDEX "PatientMedicalRecord_active_idx" ON "PatientMedicalRecord"("active");

-- CreateIndex
CREATE INDEX "PatientMedicalRecord_deletedAt_idx" ON "PatientMedicalRecord"("deletedAt");

-- AddForeignKey
ALTER TABLE "PatientMedicalRecord" ADD CONSTRAINT "PatientMedicalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
