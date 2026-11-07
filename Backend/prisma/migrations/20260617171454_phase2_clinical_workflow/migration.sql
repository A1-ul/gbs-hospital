/*
  Warnings:

  - Added the required column `staffType` to the `HospitalStaff` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECHNICIAN', 'CASHIER', 'ADMIN');

-- DropIndex
DROP INDEX "HospitalAdmission_bedId_idx";

-- DropIndex
DROP INDEX "HospitalAdmission_roomId_idx";

-- DropIndex
DROP INDEX "HospitalAdmission_wardId_idx";

-- DropIndex
DROP INDEX "HospitalStaff_deletedAt_idx";

-- DropIndex
DROP INDEX "Patient_deletedAt_idx";

-- AlterTable
ALTER TABLE "HospitalStaff" ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "specialization" TEXT,
ADD COLUMN     "staffType" "StaffType" NOT NULL;

-- CreateTable
CREATE TABLE "PatientEncounter" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "encounterNumber" TEXT NOT NULL,
    "encounterType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chiefComplaint" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "assignedStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientEncounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientConsultation" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "doctorId" TEXT,
    "consultationType" TEXT,
    "history" TEXT,
    "examination" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientConsultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientDiagnosis" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "diagnosisCode" TEXT,
    "diagnosisName" TEXT NOT NULL,
    "diagnosisType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientDiagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientPrescription" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prescribedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientPrescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaboratoryRequest" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "requestedById" TEXT,
    "performedById" TEXT,
    "testName" TEXT NOT NULL,
    "testCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "result" TEXT,
    "resultDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaboratoryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientBill" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NursingRecord" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "recordedById" TEXT,
    "observation" TEXT,
    "nursingNote" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NursingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAllergy" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "allergyName" TEXT NOT NULL,
    "allergyType" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'MODERATE',
    "reaction" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "recordedBy" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientAllergy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientVitalSign" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION,
    "pulseRate" INTEGER,
    "respiratoryRate" INTEGER,
    "systolicBP" INTEGER,
    "diastolicBP" INTEGER,
    "oxygenSaturation" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "recordedBy" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientVitalSign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientMedication" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "route" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "prescribedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientMedication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientClinicalNote" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "noteType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientClinicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DischargeRecord" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "dischargeSummary" TEXT,
    "dischargeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DischargeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalWorkflow" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "currentStage" TEXT NOT NULL DEFAULT 'REGISTRATION',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientEncounter_encounterNumber_key" ON "PatientEncounter"("encounterNumber");

-- CreateIndex
CREATE INDEX "PatientEncounter_createdAt_idx" ON "PatientEncounter"("createdAt");

-- CreateIndex
CREATE INDEX "PatientEncounter_patientId_idx" ON "PatientEncounter"("patientId");

-- CreateIndex
CREATE INDEX "PatientEncounter_hospitalId_idx" ON "PatientEncounter"("hospitalId");

-- CreateIndex
CREATE INDEX "PatientEncounter_encounterNumber_idx" ON "PatientEncounter"("encounterNumber");

-- CreateIndex
CREATE INDEX "PatientEncounter_status_idx" ON "PatientEncounter"("status");

-- CreateIndex
CREATE INDEX "PatientConsultation_createdAt_idx" ON "PatientConsultation"("createdAt");

-- CreateIndex
CREATE INDEX "PatientConsultation_encounterId_idx" ON "PatientConsultation"("encounterId");

-- CreateIndex
CREATE INDEX "PatientConsultation_doctorId_idx" ON "PatientConsultation"("doctorId");

-- CreateIndex
CREATE INDEX "PatientDiagnosis_encounterId_idx" ON "PatientDiagnosis"("encounterId");

-- CreateIndex
CREATE INDEX "PatientPrescription_createdAt_idx" ON "PatientPrescription"("createdAt");

-- CreateIndex
CREATE INDEX "PatientPrescription_encounterId_idx" ON "PatientPrescription"("encounterId");

-- CreateIndex
CREATE INDEX "LaboratoryRequest_createdAt_idx" ON "LaboratoryRequest"("createdAt");

-- CreateIndex
CREATE INDEX "LaboratoryRequest_encounterId_idx" ON "LaboratoryRequest"("encounterId");

-- CreateIndex
CREATE INDEX "LaboratoryRequest_requestedById_idx" ON "LaboratoryRequest"("requestedById");

-- CreateIndex
CREATE INDEX "LaboratoryRequest_performedById_idx" ON "LaboratoryRequest"("performedById");

-- CreateIndex
CREATE UNIQUE INDEX "PatientBill_billNumber_key" ON "PatientBill"("billNumber");

-- CreateIndex
CREATE INDEX "PatientBill_createdAt_idx" ON "PatientBill"("createdAt");

-- CreateIndex
CREATE INDEX "PatientBill_encounterId_idx" ON "PatientBill"("encounterId");

-- CreateIndex
CREATE INDEX "NursingRecord_createdAt_idx" ON "NursingRecord"("createdAt");

-- CreateIndex
CREATE INDEX "NursingRecord_encounterId_idx" ON "NursingRecord"("encounterId");

-- CreateIndex
CREATE INDEX "NursingRecord_recordedById_idx" ON "NursingRecord"("recordedById");

-- CreateIndex
CREATE INDEX "PatientAllergy_patientId_idx" ON "PatientAllergy"("patientId");

-- CreateIndex
CREATE INDEX "PatientAllergy_status_idx" ON "PatientAllergy"("status");

-- CreateIndex
CREATE INDEX "PatientAllergy_active_idx" ON "PatientAllergy"("active");

-- CreateIndex
CREATE INDEX "PatientVitalSign_patientId_idx" ON "PatientVitalSign"("patientId");

-- CreateIndex
CREATE INDEX "PatientVitalSign_recordedAt_idx" ON "PatientVitalSign"("recordedAt");

-- CreateIndex
CREATE INDEX "PatientMedication_patientId_idx" ON "PatientMedication"("patientId");

-- CreateIndex
CREATE INDEX "PatientMedication_status_idx" ON "PatientMedication"("status");

-- CreateIndex
CREATE INDEX "PatientClinicalNote_patientId_idx" ON "PatientClinicalNote"("patientId");

-- CreateIndex
CREATE INDEX "PatientClinicalNote_noteType_idx" ON "PatientClinicalNote"("noteType");

-- CreateIndex
CREATE UNIQUE INDEX "DischargeRecord_encounterId_key" ON "DischargeRecord"("encounterId");

-- CreateIndex
CREATE INDEX "DischargeRecord_createdAt_idx" ON "DischargeRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalWorkflow_encounterId_key" ON "ClinicalWorkflow"("encounterId");

-- CreateIndex
CREATE INDEX "HospitalStaff_staffType_idx" ON "HospitalStaff"("staffType");

-- AddForeignKey
ALTER TABLE "HospitalPatientLocation" ADD CONSTRAINT "HospitalPatientLocation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientEncounter" ADD CONSTRAINT "PatientEncounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientEncounter" ADD CONSTRAINT "PatientEncounter_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientEncounter" ADD CONSTRAINT "PatientEncounter_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "HospitalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientConsultation" ADD CONSTRAINT "PatientConsultation_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "PatientEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientConsultation" ADD CONSTRAINT "PatientConsultation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "HospitalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDiagnosis" ADD CONSTRAINT "PatientDiagnosis_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "PatientEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPrescription" ADD CONSTRAINT "PatientPrescription_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "PatientEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPrescription" ADD CONSTRAINT "PatientPrescription_prescribedById_fkey" FOREIGN KEY ("prescribedById") REFERENCES "HospitalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaboratoryRequest" ADD CONSTRAINT "LaboratoryRequest_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "PatientEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaboratoryRequest" ADD CONSTRAINT "LaboratoryRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "HospitalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaboratoryRequest" ADD CONSTRAINT "LaboratoryRequest_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "HospitalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientBill" ADD CONSTRAINT "PatientBill_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "PatientEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingRecord" ADD CONSTRAINT "NursingRecord_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "PatientEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingRecord" ADD CONSTRAINT "NursingRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "HospitalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientVitalSign" ADD CONSTRAINT "PatientVitalSign_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMedication" ADD CONSTRAINT "PatientMedication_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientClinicalNote" ADD CONSTRAINT "PatientClinicalNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeRecord" ADD CONSTRAINT "DischargeRecord_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "PatientEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeRecord" ADD CONSTRAINT "DischargeRecord_dischargedById_fkey" FOREIGN KEY ("dischargedById") REFERENCES "HospitalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalWorkflow" ADD CONSTRAINT "ClinicalWorkflow_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "PatientEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
