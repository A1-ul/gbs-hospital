-- CreateTable
CREATE TABLE "PatientProfile" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "occupation" TEXT,
    "maritalStatus" TEXT,
    "religion" TEXT,
    "nationality" TEXT,
    "identificationType" TEXT,
    "identificationNumber" TEXT,
    "allergies" TEXT,
    "medicalHistory" TEXT,
    "surgicalHistory" TEXT,
    "familyHistory" TEXT,
    "chronicConditions" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_patientId_key" ON "PatientProfile"("patientId");

-- CreateIndex
CREATE INDEX "PatientProfile_patientId_idx" ON "PatientProfile"("patientId");

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
