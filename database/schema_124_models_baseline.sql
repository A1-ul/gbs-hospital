-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECHNICIAN', 'CASHIER', 'ADMIN');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT,
    "tenantId" TEXT,
    "hospitalId" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,
    "affectedRecord" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'SUCCESS',
    "requestId" TEXT,
    "responseCode" TEXT,
    "httpStatus" INTEGER,
    "method" TEXT,
    "path" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "previousHash" TEXT,
    "integrityHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "logo" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalBranch" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalSetting" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalRoom" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "floor" TEXT,
    "roomType" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalDepartment" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalWard" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "unitId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalWard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalBed" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "bedType" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalBed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalStaff" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "department" TEXT,
    "staffType" "StaffType" NOT NULL,
    "specialization" TEXT,
    "licenseNumber" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalUnit" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalPatientLocation" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "wardId" TEXT,
    "roomId" TEXT,
    "bedId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalPatientLocation_pkey" PRIMARY KEY ("id")
);

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
    "encounterId" TEXT,
    "admittingDoctorId" TEXT,
    "admittingDoctorName" TEXT,
    "admissionDiagnosis" TEXT,
    "dischargeSummary" TEXT,
    "dischargeCondition" TEXT,
    "dischargeDisposition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalAdmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "emergencyContact" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "nationalId" TEXT,
    "nhisNumber" TEXT,
    "occupation" TEXT,
    "maritalStatus" TEXT,
    "nationality" TEXT DEFAULT 'Ghanaian',
    "bloodGroup" TEXT,
    "genotype" TEXT,
    "photoUrl" TEXT,
    "userId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

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
    "queueToken" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "triageStatus" TEXT NOT NULL DEFAULT 'WAITING_TRIAGE',
    "triageRiskLevel" TEXT,
    "triageNotes" TEXT,
    "assignedRoom" TEXT,
    "assignedDoctorId" TEXT,
    "assignedDoctorName" TEXT,
    "triagedAt" TIMESTAMP(3),
    "consultationStartedAt" TIMESTAMP(3),
    "consultationCompletedAt" TIMESTAMP(3),
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
    "prescribedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientPrescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaboratoryRequest" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "requestNumber" TEXT,
    "requestedById" TEXT,
    "performedById" TEXT,
    "testName" TEXT NOT NULL,
    "testCode" TEXT,
    "department" TEXT,
    "priority" TEXT DEFAULT 'ROUTINE',
    "clinicalNotes" TEXT,
    "specimenType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "result" TEXT,
    "resultDate" TIMESTAMP(3),
    "verifiedById" TEXT,
    "verifiedByName" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaboratoryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaboratorySample" (
    "id" TEXT NOT NULL,
    "sampleBarcode" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "patientId" TEXT,
    "specimenType" TEXT NOT NULL,
    "tubeColor" TEXT,
    "collectionVolume" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedById" TEXT,
    "collectedByName" TEXT,
    "receivedAt" TIMESTAMP(3),
    "receivedById" TEXT,
    "receivedByName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COLLECTED',
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaboratorySample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaboratoryTestResult" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "parameterCode" TEXT,
    "measuredValue" TEXT NOT NULL,
    "numericValue" DOUBLE PRECISION,
    "unit" TEXT,
    "referenceRangeMin" DOUBLE PRECISION,
    "referenceRangeMax" DOUBLE PRECISION,
    "referenceRangeText" TEXT,
    "abnormalFlag" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaboratoryTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaboratoryCatalogItem" (
    "id" TEXT NOT NULL,
    "testCode" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "specimenType" TEXT NOT NULL,
    "containerTube" TEXT NOT NULL,
    "turnaroundHours" INTEGER NOT NULL DEFAULT 4,
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaboratoryCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyOrder" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT,
    "accessionNumber" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "procedureCode" TEXT,
    "bodyPart" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "clinicalIndication" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ORDERED',
    "requestedById" TEXT,
    "requestedByName" TEXT,
    "requestedByRole" TEXT DEFAULT 'DOCTOR',
    "scheduledDate" TIMESTAMP(3),
    "performingRadiographerId" TEXT,
    "performingRadiographerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadiologyOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DicomStudy" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "studyInstanceUid" TEXT NOT NULL,
    "seriesInstanceUid" TEXT,
    "sopClassUid" TEXT,
    "modality" TEXT NOT NULL,
    "patientId" TEXT,
    "patientName" TEXT,
    "accessionNumber" TEXT,
    "seriesCount" INTEGER NOT NULL DEFAULT 1,
    "instanceCount" INTEGER NOT NULL DEFAULT 1,
    "imageStorageUri" TEXT,
    "thumbnailUri" TEXT,
    "windowWidth" DOUBLE PRECISION,
    "windowCenter" DOUBLE PRECISION,
    "kvp" DOUBLE PRECISION,
    "exposureTime" DOUBLE PRECISION,
    "sliceThickness" DOUBLE PRECISION,
    "pixelSpacing" TEXT,
    "patientPosition" TEXT,
    "acquisitionDevice" TEXT,
    "notes" TEXT,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DicomStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyReport" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "studyId" TEXT,
    "reportNumber" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "radiologistId" TEXT,
    "radiologistName" TEXT,
    "technique" TEXT,
    "comparison" TEXT,
    "findings" TEXT NOT NULL,
    "impression" TEXT NOT NULL,
    "classification" TEXT NOT NULL DEFAULT 'NORMAL',
    "criticalAlert" BOOLEAN NOT NULL DEFAULT false,
    "criticalAlertNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "verifiedById" TEXT,
    "verifiedByName" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadiologyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyCatalogItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "bodyPart" TEXT NOT NULL,
    "standardViews" TEXT,
    "defaultWindowWidth" DOUBLE PRECISION,
    "defaultWindowCenter" DOUBLE PRECISION,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 15,
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadiologyCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientBill" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT,
    "billNumber" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payorType" TEXT NOT NULL DEFAULT 'CASH',
    "insuranceProvider" TEXT,
    "insurancePolicyNumber" TEXT,
    "grossAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "nhisCoveredAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "insuranceCoveredAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "patientPayableAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "balanceDue" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "description" TEXT,
    "notes" TEXT,
    "issuedById" TEXT,
    "issuedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillItem" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "serviceCode" TEXT,
    "serviceName" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "nhisCovered" BOOLEAN NOT NULL DEFAULT false,
    "nhisRate" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientPayment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentReference" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT,
    "receivedByName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceClaim" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "patientId" TEXT,
    "payorType" TEXT NOT NULL,
    "insuranceProvider" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "claimedAmount" DECIMAL(10,2) NOT NULL,
    "approvedAmount" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "icd10Diagnosis" TEXT,
    "submittedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingTariffItem" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "standardCashPrice" DECIMAL(10,2) NOT NULL,
    "nhisPrice" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "nhisCovered" BOOLEAN NOT NULL DEFAULT true,
    "privateInsurancePrice" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingTariffItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatingTheatre" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "theatreType" TEXT NOT NULL DEFAULT 'GENERAL_SURGERY',
    "floor" TEXT,
    "building" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "currentCaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatingTheatre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgicalCase" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT,
    "theatreId" TEXT,
    "caseNumber" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "procedureCode" TEXT,
    "procedureCategory" TEXT NOT NULL DEFAULT 'GENERAL_SURGERY',
    "priority" TEXT NOT NULL DEFAULT 'ELECTIVE',
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "scheduledDate" TIMESTAMP(3),
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "preOpDiagnosis" TEXT,
    "postOpDiagnosis" TEXT,
    "informedConsentSigned" BOOLEAN NOT NULL DEFAULT false,
    "npoStatus" TEXT,
    "bloodProductsReserved" TEXT,
    "leadSurgeonId" TEXT,
    "leadSurgeonName" TEXT,
    "assistantSurgeonName" TEXT,
    "anesthesiologistId" TEXT,
    "anesthesiologistName" TEXT,
    "scrubNurseName" TEXT,
    "circulatingNurseName" TEXT,
    "operativeFindings" TEXT,
    "operativeTechnique" TEXT,
    "estimatedBloodLossMl" DOUBLE PRECISION,
    "implantsUsed" TEXT,
    "specimensRemoved" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurgicalCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgicalChecklist" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "signInCompleted" BOOLEAN NOT NULL DEFAULT false,
    "patientIdentityConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "siteMarked" BOOLEAN NOT NULL DEFAULT false,
    "consentVerified" BOOLEAN NOT NULL DEFAULT false,
    "pulseOximeterFunctioning" BOOLEAN NOT NULL DEFAULT false,
    "allergyRiskChecked" BOOLEAN NOT NULL DEFAULT false,
    "difficultAirwayRiskChecked" BOOLEAN NOT NULL DEFAULT false,
    "bloodLossRiskChecked" BOOLEAN NOT NULL DEFAULT false,
    "timeOutCompleted" BOOLEAN NOT NULL DEFAULT false,
    "teamIntroduced" BOOLEAN NOT NULL DEFAULT false,
    "surgeonAnesthesiaNurseConfirmPatient" BOOLEAN NOT NULL DEFAULT false,
    "antibioticProphylaxisGiven" BOOLEAN NOT NULL DEFAULT false,
    "sterilityConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "imagingDisplayed" BOOLEAN NOT NULL DEFAULT false,
    "signOutCompleted" BOOLEAN NOT NULL DEFAULT false,
    "procedureNameConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "spongeNeedleCountsCorrect" BOOLEAN NOT NULL DEFAULT false,
    "specimenLabeledCorrectly" BOOLEAN NOT NULL DEFAULT false,
    "equipmentIssuesAddressed" BOOLEAN NOT NULL DEFAULT false,
    "pacuConcernsReviewed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "checkedById" TEXT,
    "checkedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurgicalChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnesthesiaRecord" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "anesthesiaType" TEXT NOT NULL,
    "asaStatus" TEXT NOT NULL DEFAULT 'ASA_I',
    "airwayAssessment" TEXT,
    "inductionTime" TIMESTAMP(3),
    "intubationTime" TIMESTAMP(3),
    "extubationTime" TIMESTAMP(3),
    "anesthesiaStopTime" TIMESTAMP(3),
    "agentsAdministered" TEXT,
    "totalFluidsInfusedMl" DOUBLE PRECISION DEFAULT 0.0,
    "totalBloodLossMl" DOUBLE PRECISION DEFAULT 0.0,
    "urineOutputMl" DOUBLE PRECISION DEFAULT 0.0,
    "anesthesiologistId" TEXT,
    "anesthesiologistName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnesthesiaRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PacuRecord" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedAt" TIMESTAMP(3),
    "aldreteActivity" INTEGER NOT NULL DEFAULT 2,
    "aldreteRespiration" INTEGER NOT NULL DEFAULT 2,
    "aldreteCirculation" INTEGER NOT NULL DEFAULT 2,
    "aldreteConsciousness" INTEGER NOT NULL DEFAULT 2,
    "aldreteO2Saturation" INTEGER NOT NULL DEFAULT 2,
    "aldreteTotalScore" INTEGER NOT NULL DEFAULT 10,
    "painScore" INTEGER DEFAULT 0,
    "nauseaVomitingStatus" TEXT DEFAULT 'NONE',
    "postOpDestination" TEXT NOT NULL DEFAULT 'SURGICAL_WARD',
    "clearedForDischarge" BOOLEAN NOT NULL DEFAULT false,
    "clearedById" TEXT,
    "clearedByName" TEXT,
    "recoveryNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PacuRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgicalCatalogItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "estimatedDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "standardFee" DECIMAL(10,2) NOT NULL,
    "nhisCovered" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurgicalCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NursingRecord" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "recordedById" TEXT,
    "observation" TEXT,
    "nursingNote" TEXT,
    "patientId" TEXT,
    "admissionId" TEXT,
    "shift" TEXT DEFAULT 'MORNING',
    "temperature" DOUBLE PRECISION,
    "pulseRate" INTEGER,
    "respiratoryRate" INTEGER,
    "bloodPressure" TEXT,
    "oxygenSaturation" DOUBLE PRECISION,
    "intakeOutputNotes" TEXT,
    "medicationsAdministered" TEXT,
    "nurseName" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NursingRecord_pkey" PRIMARY KEY ("id")
);

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
    "encounterId" TEXT,
    "temperature" DOUBLE PRECISION,
    "pulseRate" INTEGER,
    "respiratoryRate" INTEGER,
    "systolicBP" INTEGER,
    "diastolicBP" INTEGER,
    "oxygenSaturation" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bmiCategory" TEXT,
    "bloodGlucose" DOUBLE PRECISION,
    "painScore" INTEGER,
    "consciousness" TEXT DEFAULT 'ALERT',
    "news2Score" INTEGER,
    "riskCategory" TEXT DEFAULT 'LOW',
    "triageNotes" TEXT,
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

-- CreateTable
CREATE TABLE "PharmacyItem" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "itemCode" TEXT,
    "genericName" TEXT,
    "brandName" TEXT,
    "dosageForm" TEXT,
    "strength" TEXT,
    "category" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 10,
    "active" BOOLEAN NOT NULL DEFAULT true,
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
    "remainingQuantity" INTEGER,
    "unitCost" DOUBLE PRECISION DEFAULT 0.0,
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
    "dispenseNumber" TEXT,
    "pharmacistId" TEXT,
    "pharmacistName" TEXT,
    "pharmacistUserId" TEXT,
    "counselingNotes" TEXT,
    "paymentStatus" TEXT DEFAULT 'PENDING',
    "totalAmount" DOUBLE PRECISION DEFAULT 0.0,
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
    "batchNumber" TEXT,
    "unitPrice" DOUBLE PRECISION DEFAULT 0.0,
    "totalPrice" DOUBLE PRECISION DEFAULT 0.0,
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
    "batchNumber" TEXT,
    "balanceAfter" INTEGER,
    "referenceId" TEXT,
    "performedById" TEXT,
    "performedByName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacyStockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantCode" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERAL_HOSPITAL',
    "country" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "officialEmail" TEXT NOT NULL,
    "officialPhone" TEXT NOT NULL,
    "website" TEXT,
    "registrationNumber" TEXT,
    "licenseNumber" TEXT,
    "taxId" TEXT,
    "logoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "systemLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockReason" TEXT,
    "lockedAt" TIMESTAMP(3),
    "representativeName" TEXT,
    "representativePosition" TEXT,
    "representativeEmail" TEXT,
    "representativePhone" TEXT,
    "hospitalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSubscription" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'ENTERPRISE_TRIAL',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE_TRIAL',
    "trialStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndDate" TIMESTAMP(3) NOT NULL,
    "subscriptionStartDate" TIMESTAMP(3),
    "subscriptionEndDate" TIMESTAMP(3),
    "gracePeriodEndDate" TIMESTAMP(3),
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL DEFAULT 'DEVELOPER',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantLocationPing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantLocationPing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoCallSession" (
    "id" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "developerUserId" TEXT NOT NULL,
    "adminUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "VideoCallSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalFolder" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "folderNumber" TEXT NOT NULL,
    "archiveZone" TEXT NOT NULL DEFAULT 'MAIN_ARCHIVE',
    "shelfLocation" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "rfidTag" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_ARCHIVE',
    "currentHolderId" TEXT,
    "currentDepartment" TEXT,
    "lastCheckedOutAt" TIMESTAMP(3),
    "lastReturnedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolderRetrievalRequest" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedByRole" TEXT NOT NULL DEFAULT 'DOCTOR',
    "destinationDepartment" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retrievedById" TEXT,
    "notes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retrievedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),

    CONSTRAINT "FolderRetrievalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolderMovementLog" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "performedByRole" TEXT NOT NULL DEFAULT 'FOLDER_RETRIEVER',
    "action" TEXT NOT NULL,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FolderMovementLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpdQueueTicket" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "encounterId" TEXT,
    "patientId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'GENERAL_OPD',
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "status" TEXT NOT NULL DEFAULT 'WAITING_TRIAGE',
    "calledAt" TIMESTAMP(3),
    "triagedAt" TIMESTAMP(3),
    "consultedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assignedRoom" TEXT,
    "assignedStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpdQueueTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ambulance" (
    "id" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "registrationPlate" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ADVANCED_LIFE_SUPPORT',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "currentSpeedKmh" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "fuelLevelPercent" INTEGER DEFAULT 100,
    "assignedDriver" TEXT,
    "assignedParamedic" TEXT,
    "equipmentChecklist" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ambulance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbulanceDispatch" (
    "id" TEXT NOT NULL,
    "dispatchNumber" TEXT NOT NULL,
    "ambulanceId" TEXT NOT NULL,
    "callerName" TEXT NOT NULL,
    "callerPhone" TEXT NOT NULL,
    "incidentLocation" TEXT NOT NULL,
    "pickupLatitude" DOUBLE PRECISION,
    "pickupLongitude" DOUBLE PRECISION,
    "triageSeverity" TEXT NOT NULL DEFAULT 'ORANGE_EMERGENT',
    "chiefComplaint" TEXT NOT NULL,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enRouteAt" TIMESTAMP(3),
    "arrivedSceneAt" TIMESTAMP(3),
    "departedSceneAt" TIMESTAMP(3),
    "arrivedHospitalAt" TIMESTAMP(3),
    "clearedAt" TIMESTAMP(3),
    "responseTimeSeconds" INTEGER,
    "transitTimeSeconds" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DISPATCHED',
    "vitalSignsAtScene" JSONB,
    "handoverNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbulanceDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyCase" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "patientId" TEXT,
    "patientName" TEXT,
    "triageCategory" TEXT NOT NULL DEFAULT 'ORANGE_EMERGENT',
    "arrivalMode" TEXT NOT NULL DEFAULT 'AMBULANCE',
    "dispatchId" TEXT,
    "assignedBay" TEXT,
    "attendingPhysician" TEXT,
    "triageNurse" TEXT,
    "clinicalNotes" TEXT,
    "emergencyOverrideLogged" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'TRIAGED',
    "arrivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stabilizedAt" TIMESTAMP(3),
    "dispositionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodDonor" (
    "id" TEXT NOT NULL,
    "donorNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "age" INTEGER,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "nationalId" TEXT,
    "bloodGroup" TEXT NOT NULL,
    "rhFactor" TEXT NOT NULL DEFAULT 'POSITIVE',
    "weightKg" DOUBLE PRECISION,
    "hemoglobinLevel" DOUBLE PRECISION,
    "donorType" TEXT NOT NULL DEFAULT 'VOLUNTARY',
    "eligibilityStatus" TEXT NOT NULL DEFAULT 'ELIGIBLE',
    "deferralReason" TEXT,
    "lastDonationDate" TIMESTAMP(3),
    "totalDonations" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BloodDonor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodUnit" (
    "id" TEXT NOT NULL,
    "unitBarcode" TEXT NOT NULL,
    "donorId" TEXT,
    "bloodGroup" TEXT NOT NULL,
    "componentType" TEXT NOT NULL DEFAULT 'PACKED_RED_CELLS',
    "volumeMl" INTEGER NOT NULL DEFAULT 450,
    "collectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "storageLocation" TEXT NOT NULL DEFAULT 'FRIDGE-BB-01-SHELF-A',
    "storageTemperature" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "status" TEXT NOT NULL DEFAULT 'QUARANTINE',
    "hivScreening" TEXT NOT NULL DEFAULT 'NEGATIVE',
    "hepatitisBScreening" TEXT NOT NULL DEFAULT 'NEGATIVE',
    "hepatitisCScreening" TEXT NOT NULL DEFAULT 'NEGATIVE',
    "syphilisScreening" TEXT NOT NULL DEFAULT 'NEGATIVE',
    "screeningNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BloodUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodTransfusionRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientBloodGroup" TEXT NOT NULL,
    "requiredComponent" TEXT NOT NULL DEFAULT 'PACKED_RED_CELLS',
    "unitsRequested" INTEGER NOT NULL DEFAULT 1,
    "urgencyLevel" TEXT NOT NULL DEFAULT 'ROUTINE',
    "clinicalIndication" TEXT NOT NULL,
    "requestingDoctor" TEXT NOT NULL,
    "departmentWard" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "emergencyOverrideLogged" BOOLEAN NOT NULL DEFAULT false,
    "clinicalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BloodTransfusionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodCrossMatch" (
    "id" TEXT NOT NULL,
    "crossMatchNumber" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "bloodUnitId" TEXT NOT NULL,
    "majorCrossmatchResult" TEXT NOT NULL DEFAULT 'COMPATIBLE',
    "minorCrossmatchResult" TEXT NOT NULL DEFAULT 'COMPATIBLE',
    "antibodyScreeningResult" TEXT NOT NULL DEFAULT 'NEGATIVE',
    "compatibilityStatus" TEXT NOT NULL DEFAULT 'COMPATIBLE',
    "testedByLabTechnician" TEXT NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BloodCrossMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodTransfusionRecord" (
    "id" TEXT NOT NULL,
    "transfusionNumber" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "bloodUnitId" TEXT NOT NULL,
    "primaryClinician" TEXT NOT NULL,
    "verifyingClinician" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "initialVitals" JSONB,
    "postVitals" JSONB,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "hadAdverseReaction" BOOLEAN NOT NULL DEFAULT false,
    "reactionType" TEXT,
    "reactionSeverity" TEXT,
    "actionTaken" TEXT,
    "investigationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BloodTransfusionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorpseRecord" (
    "id" TEXT NOT NULL,
    "corpseNumber" TEXT NOT NULL,
    "patientId" TEXT,
    "deceasedName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "age" INTEGER,
    "dateOfBirth" TIMESTAMP(3),
    "dateOfDeath" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeOfDeath" TEXT,
    "placeOfDeath" TEXT NOT NULL,
    "caseCategory" TEXT NOT NULL DEFAULT 'NON_CORONER_CLINICAL',
    "deathCertificateNumber" TEXT,
    "certifyingPhysician" TEXT NOT NULL,
    "immediateCauseOfDeath" TEXT NOT NULL,
    "underlyingCauseOfDeath" TEXT,
    "intakeNurseOrOfficer" TEXT NOT NULL,
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chamberId" TEXT,
    "compartmentNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_STORAGE',
    "isCoronerCleared" BOOLEAN NOT NULL DEFAULT true,
    "propertyItems" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorpseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MortuaryChamber" (
    "id" TEXT NOT NULL,
    "chamberCode" TEXT NOT NULL,
    "vaultName" TEXT NOT NULL,
    "storageTier" TEXT NOT NULL DEFAULT 'REFRIGERATED',
    "targetTemperature" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "currentTemperature" DOUBLE PRECISION NOT NULL DEFAULT 3.2,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "occupiedCount" INTEGER NOT NULL DEFAULT 0,
    "isOperational" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MortuaryChamber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutopsyCase" (
    "id" TEXT NOT NULL,
    "autopsyNumber" TEXT NOT NULL,
    "corpseId" TEXT NOT NULL,
    "autopsyType" TEXT NOT NULL DEFAULT 'CLINICAL_PATHOLOGY',
    "leadPathologist" TEXT NOT NULL,
    "assistingTechnician" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "externalFindings" TEXT,
    "internalFindings" TEXT,
    "finalPostMortemDiagnosis" TEXT,
    "toxicologySamplesTaken" BOOLEAN NOT NULL DEFAULT false,
    "histopathologySamplesTaken" BOOLEAN NOT NULL DEFAULT false,
    "coronerApprovalIssued" BOOLEAN NOT NULL DEFAULT false,
    "coronerOfficerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutopsyCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorpseRelease" (
    "id" TEXT NOT NULL,
    "releaseNumber" TEXT NOT NULL,
    "corpseId" TEXT NOT NULL,
    "nextOfKinName" TEXT NOT NULL,
    "nextOfKinPhone" TEXT NOT NULL,
    "nextOfKinNationalId" TEXT NOT NULL,
    "relationshipToDeceased" TEXT NOT NULL,
    "funeralHomeOrUndertaker" TEXT,
    "hearseVehiclePlate" TEXT,
    "releasingOfficer" TEXT NOT NULL,
    "billingSettled" BOOLEAN NOT NULL DEFAULT true,
    "burialPermitNumber" TEXT,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handoverSignatureConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorpseRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalEquipment" (
    "id" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelNumber" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'MEDIUM_RISK',
    "department" TEXT NOT NULL,
    "roomLocation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPERATIONAL',
    "acquisitionDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "ppmIntervalDays" INTEGER NOT NULL DEFAULT 90,
    "lastPpmDate" TIMESTAMP(3),
    "nextPpmDate" TIMESTAMP(3),
    "calibrationIntervalDays" INTEGER NOT NULL DEFAULT 180,
    "lastCalibrationDate" TIMESTAMP(3),
    "nextCalibrationDate" TIMESTAMP(3),
    "powerRatingWatts" DOUBLE PRECISION,
    "electricalSafetyCertified" BOOLEAN NOT NULL DEFAULT true,
    "safetyOverrideActive" BOOLEAN NOT NULL DEFAULT false,
    "safetyOverrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalWorkOrder" (
    "id" TEXT NOT NULL,
    "workOrderNumber" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "reportedBy" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failureDescription" TEXT NOT NULL,
    "assignedEngineer" TEXT,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rootCause" TEXT,
    "actionTaken" TEXT,
    "partsReplaced" TEXT,
    "partsCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "laborHours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "electricalSafetyTested" BOOLEAN NOT NULL DEFAULT false,
    "leakageCurrentMicroAmps" DOUBLE PRECISION,
    "groundResistanceOhms" DOUBLE PRECISION,
    "qaApprovedBy" TEXT,
    "qaApprovedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalWorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentCalibration" (
    "id" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "calibrationStandard" TEXT NOT NULL,
    "testEquipmentUsed" TEXT NOT NULL,
    "parametersTested" TEXT NOT NULL,
    "toleranceDeviationPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "calibrationResult" TEXT NOT NULL,
    "certifiedByEngineer" TEXT NOT NULL,
    "calibratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentCalibration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementVendor" (
    "id" TEXT NOT NULL,
    "vendorCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "taxIdentificationNumber" TEXT,
    "contactPerson" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankBranch" TEXT,
    "paymentTerms" TEXT NOT NULL DEFAULT 'NET_30',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorContract" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contractType" TEXT NOT NULL DEFAULT 'FRAMEWORK_AGREEMENT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "contractValue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "termsConditions" TEXT,
    "signedByRepresentative" TEXT,
    "signedByHospitalDirector" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'CENTRAL_STORES',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDeliveryDate" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "emergencyStockoutLogged" BOOLEAN NOT NULL DEFAULT false,
    "requisitionedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantityOrdered" INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'UNIT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptNote" (
    "id" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "waybillOrInvoiceNumber" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" TEXT NOT NULL,
    "inspectedBy" TEXT,
    "inspectionStatus" TEXT NOT NULL DEFAULT 'INSPECTION_PASSED',
    "rejectionReason" TEXT,
    "temperatureCompliant" BOOLEAN NOT NULL DEFAULT true,
    "threeWayMatchVerified" BOOLEAN NOT NULL DEFAULT false,
    "matchedInvoiceAmount" DOUBLE PRECISION,
    "varianceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'INSPECTED_ACCEPTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceiptNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptItem" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "poItemId" TEXT,
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantityReceived" INTEGER NOT NULL,
    "quantityAccepted" INTEGER NOT NULL,
    "quantityRejected" INTEGER NOT NULL DEFAULT 0,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "unitCost" DOUBLE PRECISION NOT NULL,
    "destinationDepartment" TEXT NOT NULL DEFAULT 'CENTRAL_STORES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffCredential" (
    "id" TEXT NOT NULL,
    "credentialNumber" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "regulatoryBody" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "cadre" TEXT NOT NULL,
    "specialty" TEXT,
    "issuedDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "credentialStatus" TEXT NOT NULL DEFAULT 'ACTIVE_VERIFIED',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "emergencyPracticePermitted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutyShiftRoster" (
    "id" TEXT NOT NULL,
    "rosterNumber" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "wardOrUnit" TEXT,
    "shiftType" TEXT NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DutyShiftRoster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftHandover" (
    "id" TEXT NOT NULL,
    "handoverNumber" TEXT NOT NULL,
    "rosterId" TEXT,
    "department" TEXT NOT NULL,
    "wardOrUnit" TEXT,
    "outgoingStaffName" TEXT NOT NULL,
    "incomingStaffName" TEXT NOT NULL,
    "handoverDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shiftFrom" TEXT NOT NULL,
    "shiftTo" TEXT NOT NULL,
    "censusTotalPatients" INTEGER NOT NULL DEFAULT 0,
    "criticalPatientCount" INTEGER NOT NULL DEFAULT 0,
    "situation" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "assessment" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "controlledDrugsCountOk" BOOLEAN NOT NULL DEFAULT true,
    "outgoingSignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incomingCoSignedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING_COSIGNATURE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftHandover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAttendance" (
    "id" TEXT NOT NULL,
    "attendanceNumber" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "clockInDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clockInTime" TEXT NOT NULL,
    "clockOutTime" TEXT,
    "workstationOrTerminal" TEXT NOT NULL DEFAULT 'BIOMETRIC_TERMINAL_MAIN',
    "status" TEXT NOT NULL DEFAULT 'PRESENT_ON_TIME',
    "hoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffLeaveRequest" (
    "id" TEXT NOT NULL,
    "leaveNumber" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "daysRequested" INTEGER NOT NULL,
    "relievingStaffName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffLeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalIncident" (
    "id" TEXT NOT NULL,
    "incidentNumber" TEXT NOT NULL,
    "incidentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "department" TEXT NOT NULL,
    "wardOrLocation" TEXT,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "patientMrn" TEXT,
    "patientName" TEXT,
    "immediateActionTaken" TEXT,
    "reportedBy" TEXT NOT NULL DEFAULT 'ANONYMOUS',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "investigatorName" TEXT,
    "rootCause" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfectionControlCase" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "patientMrn" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "wardOrBed" TEXT NOT NULL,
    "infectionType" TEXT NOT NULL,
    "pathogenDetected" TEXT,
    "isolationType" TEXT NOT NULL DEFAULT 'CONTACT',
    "detectedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE_ISOLATION',
    "notifiedPublicHealth" BOOLEAN NOT NULL DEFAULT false,
    "clearanceDate" TIMESTAMP(3),
    "clearedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfectionControlCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalAudit" (
    "id" TEXT NOT NULL,
    "auditNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "auditType" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "leadAuditor" TEXT NOT NULL,
    "auditDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sampleSize" INTEGER NOT NULL DEFAULT 1,
    "complianceScore" DOUBLE PRECISION NOT NULL,
    "findingsSummary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectiveActionPlan" (
    "id" TEXT NOT NULL,
    "capaNumber" TEXT NOT NULL,
    "incidentId" TEXT,
    "auditId" TEXT,
    "rootCauseMethod" TEXT NOT NULL DEFAULT 'FIVE_WHYS',
    "rootCauseFindings" TEXT NOT NULL,
    "correctiveAction" TEXT NOT NULL,
    "preventiveAction" TEXT NOT NULL,
    "responsiblePerson" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "completionDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING_EXECUTION',
    "verifiedBy" TEXT,
    "verificationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectiveActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientSafetyAlert" (
    "id" TEXT NOT NULL,
    "alertCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "urgencyLevel" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL DEFAULT 'ALL_CLINICAL_STAFF',
    "message" TEXT NOT NULL,
    "actionRequired" TEXT NOT NULL,
    "broadcastActive" BOOLEAN NOT NULL DEFAULT true,
    "issuedBy" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientSafetyAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NhiaClaimBatch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "providerNumber" TEXT NOT NULL DEFAULT 'HOSP-ACC-00124',
    "providerName" TEXT NOT NULL DEFAULT 'GBS Hospital Central',
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "submissionType" TEXT NOT NULL DEFAULT 'E_CLAIMS_XML',
    "totalClaimsCount" INTEGER NOT NULL DEFAULT 0,
    "totalClaimedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalApprovedAmount" DECIMAL(12,2),
    "totalRejectedAmount" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submissionReceipt" TEXT,
    "submissionPayload" TEXT,
    "submittedAt" TIMESTAMP(3),
    "adjudicatedAt" TIMESTAMP(3),
    "reconciledAt" TIMESTAMP(3),
    "vettedBy" TEXT,
    "submittedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NhiaClaimBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NhiaClaimItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT,
    "claimNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "nhisNumber" TEXT NOT NULL,
    "nhisCardValidity" TEXT NOT NULL DEFAULT 'VALID',
    "gender" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "encounterDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargeDate" TIMESTAMP(3),
    "encounterType" TEXT NOT NULL DEFAULT 'OPD',
    "gdrgCode" TEXT NOT NULL,
    "gdrgDescription" TEXT NOT NULL,
    "primaryDiagnosisIcd10" TEXT NOT NULL,
    "secondaryDiagnosisIcd10" TEXT,
    "claimedAmount" DECIMAL(10,2) NOT NULL,
    "approvedAmount" DECIMAL(10,2),
    "copayPaid" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "adjudicationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "vettingWarnings" TEXT,
    "rejectionCode" TEXT,
    "rejectionReason" TEXT,
    "appealNotes" TEXT,
    "servicesRendered" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NhiaClaimItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NhiaReconciliationVoucher" (
    "id" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "grossClaimed" DECIMAL(12,2) NOT NULL,
    "approvedAmount" DECIMAL(12,2) NOT NULL,
    "disallowedAmount" DECIMAL(12,2) NOT NULL,
    "withholdingTax" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "netDisbursedAmount" DECIMAL(12,2) NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "adjudicatorNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NhiaReconciliationVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NhisMemberPolicy" (
    "id" TEXT NOT NULL,
    "nhisNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "ghanaCardNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "memberType" TEXT NOT NULL DEFAULT 'INFORMAL',
    "primaryFacilityCode" TEXT DEFAULT 'HOSP-ACC-00124',
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NhisMemberPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationJob" (
    "id" TEXT NOT NULL,
    "jobCode" TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSizeBytes" INTEGER,
    "fileHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "validRecords" INTEGER NOT NULL DEFAULT 0,
    "duplicateRecords" INTEGER NOT NULL DEFAULT 0,
    "invalidRecords" INTEGER NOT NULL DEFAULT 0,
    "importedRecords" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "mappingConfig" TEXT,
    "validationErrors" TEXT,
    "previewData" TEXT,
    "rollbackLog" TEXT,
    "initiatedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rollbackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MigrationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationRecordItem" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "sourceData" TEXT NOT NULL,
    "mappedData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "destinationId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MigrationRecordItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "columnMappings" TEXT NOT NULL,
    "transformationRules" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MigrationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityGeofence" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "facilityType" TEXT NOT NULL DEFAULT 'HOSPITAL_CAMPUS',
    "hospitalId" TEXT,
    "centerLatitude" DOUBLE PRECISION NOT NULL,
    "centerLongitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" DOUBLE PRECISION NOT NULL DEFAULT 500.0,
    "polygonCoordinates" TEXT,
    "alertOnBreach" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityGeofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeofenceBreachEvent" (
    "id" TEXT NOT NULL,
    "geofenceId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeofenceBreachEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityFloorPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "buildingName" TEXT NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "floorName" TEXT NOT NULL,
    "totalBeds" INTEGER NOT NULL DEFAULT 0,
    "totalRooms" INTEGER NOT NULL DEFAULT 0,
    "layoutData" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityFloorPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemedicineConsultation" (
    "id" TEXT NOT NULL,
    "sessionCode" TEXT NOT NULL,
    "hospitalId" TEXT,
    "patientId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientPhone" TEXT,
    "doctorId" TEXT NOT NULL,
    "doctorName" TEXT NOT NULL,
    "specialty" TEXT NOT NULL DEFAULT 'GENERAL_MEDICINE',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "clinicalReason" TEXT,
    "roomToken" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "signalingState" TEXT,
    "clinicalNotes" TEXT,
    "diagnosisCode" TEXT,
    "prescriptionSummary" TEXT,
    "followUpDate" TIMESTAMP(3),
    "callQualityRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelemedicineConsultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricVoiceprint" (
    "id" TEXT NOT NULL,
    "enrollmentCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "role" TEXT,
    "sampleRate" INTEGER NOT NULL DEFAULT 16000,
    "durationSeconds" DOUBLE PRECISION NOT NULL DEFAULT 3.5,
    "voiceprintHash" TEXT NOT NULL,
    "passphraseText" TEXT NOT NULL,
    "passphraseHash" TEXT NOT NULL,
    "featureVector" TEXT NOT NULL,
    "livenessThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.96,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "verifiedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiometricVoiceprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricSecurityCredential" (
    "id" TEXT NOT NULL,
    "credentialCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "role" TEXT,
    "biometricType" TEXT NOT NULL,
    "credentialPayload" TEXT NOT NULL,
    "securityLevel" TEXT NOT NULL DEFAULT 'HIGH',
    "hardwareEnclaveId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiometricSecurityCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricVerificationLog" (
    "id" TEXT NOT NULL,
    "logCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "role" TEXT,
    "biometricType" TEXT NOT NULL,
    "actionAttempted" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "thresholdRequired" DOUBLE PRECISION NOT NULL,
    "livenessPassed" BOOLEAN NOT NULL DEFAULT true,
    "antiSpoofingStatus" TEXT NOT NULL DEFAULT 'PASSED',
    "status" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "clientDeviceId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricVerificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricSecurityPolicy" (
    "id" TEXT NOT NULL,
    "policyCode" TEXT NOT NULL,
    "policyName" TEXT NOT NULL DEFAULT 'Enterprise Multi-Factor Biometric Zero-Trust Policy',
    "requireVoiceForNarcotics" BOOLEAN NOT NULL DEFAULT true,
    "requireVoiceForSystemLock" BOOLEAN NOT NULL DEFAULT true,
    "requireVoiceForDeceasedRelease" BOOLEAN NOT NULL DEFAULT true,
    "requireVoiceForSurgicalSignOut" BOOLEAN NOT NULL DEFAULT true,
    "minVoiceConfidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "minFingerprintMatchScore" DOUBLE PRECISION NOT NULL DEFAULT 0.90,
    "livenessEnforced" BOOLEAN NOT NULL DEFAULT true,
    "maxAttemptsBeforeLockout" INTEGER NOT NULL DEFAULT 3,
    "lockoutDurationMinutes" INTEGER NOT NULL DEFAULT 15,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiometricSecurityPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemEvent" (
    "id" TEXT NOT NULL,
    "eventCode" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "tenantId" TEXT,
    "affectedRecord" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "payload" JSONB,
    "requestId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemNotification" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "eventType" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "recipientRole" TEXT,
    "tenantId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "deliveryStatus" TEXT NOT NULL DEFAULT 'DELIVERED',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "actionUrl" TEXT,
    "affectedRecord" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'ANONYMOUS',
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "httpStatus" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "requestId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeveloperAccessGrant" (
    "id" TEXT NOT NULL,
    "grantCode" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "developerEmail" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "ticketRef" TEXT,
    "approvedById" TEXT,
    "approvedByRole" TEXT,
    "tenantId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeveloperAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemErrorLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "code" TEXT NOT NULL,
    "httpStatus" INTEGER NOT NULL,
    "userMessage" TEXT NOT NULL,
    "technicalMessage" TEXT NOT NULL,
    "stackTrace" TEXT,
    "errorCategory" TEXT NOT NULL DEFAULT 'INTERNAL',
    "module" TEXT,
    "method" TEXT,
    "path" TEXT,
    "userId" TEXT,
    "userRole" TEXT,
    "tenantId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfiguration" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "configValue" JSONB NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "description" TEXT,
    "updatedById" TEXT,
    "updatedByRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DentalRecord" (
    "id" TEXT NOT NULL,
    "recordNumber" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dentistId" TEXT,
    "dentistName" TEXT,
    "chiefComplaint" TEXT NOT NULL,
    "oralExamFindings" TEXT,
    "odontogram" JSONB,
    "toothNumbers" JSONB,
    "category" TEXT NOT NULL DEFAULT 'RESTORATIVE',
    "procedureCode" TEXT,
    "procedureName" TEXT NOT NULL,
    "anesthesiaUsed" TEXT,
    "treatmentNotes" TEXT,
    "oralSurgeryNotes" TEXT,
    "followUpDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EyeClinicRecord" (
    "id" TEXT NOT NULL,
    "examNumber" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "doctorName" TEXT,
    "chiefComplaint" TEXT NOT NULL,
    "visualAcuityOD" TEXT,
    "visualAcuityOS" TEXT,
    "visualAcuityCorrectedOD" TEXT,
    "visualAcuityCorrectedOS" TEXT,
    "iopRightMmHg" DOUBLE PRECISION,
    "iopLeftMmHg" DOUBLE PRECISION,
    "ocularHypertensionFlag" BOOLEAN NOT NULL DEFAULT false,
    "refractionOD" JSONB,
    "refractionOS" JSONB,
    "pupillaryDistanceMm" DOUBLE PRECISION,
    "slitLampFindings" TEXT,
    "funduscopyFindings" TEXT,
    "diagnosis" TEXT NOT NULL,
    "lensPrescription" TEXT,
    "eyeDropMedication" TEXT,
    "procedurePlanned" TEXT,
    "followUpDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EyeClinicRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IcuMonitoringRecord" (
    "id" TEXT NOT NULL,
    "monitorCode" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admissionId" TEXT,
    "wardName" TEXT NOT NULL DEFAULT 'Adult ICU',
    "bedNumber" TEXT,
    "recordedById" TEXT,
    "recordedByName" TEXT,
    "heartRateBpm" INTEGER,
    "systolicBP" INTEGER,
    "diastolicBP" INTEGER,
    "meanArterialPressure" DOUBLE PRECISION,
    "oxygenSaturationPct" DOUBLE PRECISION,
    "respiratoryRate" INTEGER,
    "temperatureC" DOUBLE PRECISION,
    "glasgowComaScale" INTEGER,
    "ventilatorMode" TEXT NOT NULL DEFAULT 'ROOM_AIR',
    "fio2Percent" DOUBLE PRECISION,
    "peepCmH2O" DOUBLE PRECISION,
    "news2Score" INTEGER NOT NULL DEFAULT 0,
    "alertLevel" TEXT NOT NULL DEFAULT 'NORMAL',
    "triggeredAlerts" JSONB,
    "criticalCareInterventions" TEXT,
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IcuMonitoringRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalSafetyOverride" (
    "id" TEXT NOT NULL,
    "overrideCode" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "prescriptionId" TEXT,
    "clinicianId" TEXT,
    "clinicianName" TEXT,
    "clinicianRole" TEXT,
    "alertCategory" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "offendingMedication" TEXT NOT NULL,
    "conflictingAgent" TEXT NOT NULL,
    "alertSummary" TEXT NOT NULL,
    "overrideReason" TEXT NOT NULL,
    "clinicalJustification" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OVERRIDDEN_WITH_AUDIT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalSafetyOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiClinicalSuggestion" (
    "id" TEXT NOT NULL,
    "suggestionCode" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "requestedById" TEXT,
    "requestedByName" TEXT,
    "requestedByRole" TEXT,
    "assistantType" TEXT NOT NULL,
    "inputContext" JSONB,
    "recommendationSummary" TEXT NOT NULL,
    "recommendations" JSONB NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "riskLevel" TEXT NOT NULL DEFAULT 'MODERATE',
    "disclaimer" TEXT NOT NULL DEFAULT 'All outputs are recommendations only. Final decision requires a licensed clinician.',
    "workflowStatus" TEXT NOT NULL DEFAULT 'SUGGESTED',
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedByRole" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "humanDecision" TEXT,
    "overrideNotes" TEXT,
    "finalDecisionText" TEXT,
    "finalDecidedById" TEXT,
    "finalDecidedByName" TEXT,
    "finalDecidedByRole" TEXT,
    "finalDecidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiClinicalSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalMeeting" (
    "id" TEXT NOT NULL,
    "meetingCode" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "meetingType" TEXT NOT NULL DEFAULT 'CLINICAL_BOARD',
    "department" TEXT NOT NULL DEFAULT 'General Administration',
    "organizerId" TEXT,
    "organizerName" TEXT,
    "roomToken" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "participants" JSONB,
    "screenShareEnabled" BOOLEAN NOT NULL DEFAULT true,
    "agenda" TEXT,
    "minutesSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalDocument" (
    "id" TEXT NOT NULL,
    "documentCode" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'MEDICAL_RECORD',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "storageChecksumSha256" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "parentDocumentId" TEXT,
    "retentionYears" INTEGER NOT NULL DEFAULT 7,
    "retentionExpiresAt" TIMESTAMP(3) NOT NULL,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'STORED',
    "deliveredTo" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "uploadedById" TEXT,
    "uploadedByName" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "contentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityTask" (
    "id" TEXT NOT NULL,
    "taskCode" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'HOUSEKEEPING',
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "assignedToName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "utilityMetricValue" DOUBLE PRECISION,
    "utilityMetricUnit" TEXT,
    "notes" TEXT,
    "reportedById" TEXT,
    "reportedByName" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PermissionToRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PermissionToRole_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_active_idx" ON "User"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_role_idx" ON "AuditLog"("role");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_outcome_idx" ON "AuditLog"("outcome");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_code_key" ON "Hospital"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_registrationNumber_key" ON "Hospital"("registrationNumber");

-- CreateIndex
CREATE INDEX "Hospital_active_idx" ON "Hospital"("active");

-- CreateIndex
CREATE INDEX "Hospital_deletedAt_idx" ON "Hospital"("deletedAt");

-- CreateIndex
CREATE INDEX "Hospital_country_idx" ON "Hospital"("country");

-- CreateIndex
CREATE INDEX "Hospital_city_idx" ON "Hospital"("city");

-- CreateIndex
CREATE INDEX "HospitalBranch_hospitalId_idx" ON "HospitalBranch"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalBranch_active_idx" ON "HospitalBranch"("active");

-- CreateIndex
CREATE INDEX "HospitalBranch_deletedAt_idx" ON "HospitalBranch"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalBranch_hospitalId_code_key" ON "HospitalBranch"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "HospitalSetting_hospitalId_idx" ON "HospitalSetting"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalSetting_deletedAt_idx" ON "HospitalSetting"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalSetting_hospitalId_key_key" ON "HospitalSetting"("hospitalId", "key");

-- CreateIndex
CREATE INDEX "HospitalRoom_hospitalId_idx" ON "HospitalRoom"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalRoom_wardId_idx" ON "HospitalRoom"("wardId");

-- CreateIndex
CREATE INDEX "HospitalRoom_active_idx" ON "HospitalRoom"("active");

-- CreateIndex
CREATE INDEX "HospitalRoom_deletedAt_idx" ON "HospitalRoom"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalRoom_hospitalId_code_key" ON "HospitalRoom"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "HospitalDepartment_hospitalId_idx" ON "HospitalDepartment"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalDepartment_hospitalId_code_key" ON "HospitalDepartment"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "HospitalWard_hospitalId_idx" ON "HospitalWard"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalWard_unitId_idx" ON "HospitalWard"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalWard_hospitalId_code_key" ON "HospitalWard"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "HospitalBed_roomId_idx" ON "HospitalBed"("roomId");

-- CreateIndex
CREATE INDEX "HospitalBed_hospitalId_idx" ON "HospitalBed"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalBed_status_idx" ON "HospitalBed"("status");

-- CreateIndex
CREATE INDEX "HospitalBed_active_idx" ON "HospitalBed"("active");

-- CreateIndex
CREATE INDEX "HospitalBed_deletedAt_idx" ON "HospitalBed"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalBed_roomId_code_key" ON "HospitalBed"("roomId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalBed_roomId_bedNumber_key" ON "HospitalBed"("roomId", "bedNumber");

-- CreateIndex
CREATE INDEX "HospitalStaff_hospitalId_idx" ON "HospitalStaff"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalStaff_staffType_idx" ON "HospitalStaff"("staffType");

-- CreateIndex
CREATE INDEX "HospitalStaff_active_idx" ON "HospitalStaff"("active");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalStaff_hospitalId_employeeCode_key" ON "HospitalStaff"("hospitalId", "employeeCode");

-- CreateIndex
CREATE INDEX "HospitalUnit_hospitalId_idx" ON "HospitalUnit"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalUnit_departmentId_idx" ON "HospitalUnit"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalUnit_hospitalId_code_key" ON "HospitalUnit"("hospitalId", "code");

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

-- CreateIndex
CREATE UNIQUE INDEX "HospitalAdmission_admissionNumber_key" ON "HospitalAdmission"("admissionNumber");

-- CreateIndex
CREATE INDEX "HospitalAdmission_hospitalId_idx" ON "HospitalAdmission"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalAdmission_patientId_idx" ON "HospitalAdmission"("patientId");

-- CreateIndex
CREATE INDEX "HospitalAdmission_status_idx" ON "HospitalAdmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_patientNumber_key" ON "Patient"("patientNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");

-- CreateIndex
CREATE INDEX "Patient_hospitalId_idx" ON "Patient"("hospitalId");

-- CreateIndex
CREATE INDEX "Patient_patientNumber_idx" ON "Patient"("patientNumber");

-- CreateIndex
CREATE INDEX "Patient_nationalId_idx" ON "Patient"("nationalId");

-- CreateIndex
CREATE INDEX "Patient_nhisNumber_idx" ON "Patient"("nhisNumber");

-- CreateIndex
CREATE INDEX "Patient_phone_idx" ON "Patient"("phone");

-- CreateIndex
CREATE INDEX "Patient_active_idx" ON "Patient"("active");

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
CREATE INDEX "PatientEncounter_triageStatus_idx" ON "PatientEncounter"("triageStatus");

-- CreateIndex
CREATE INDEX "PatientEncounter_priority_idx" ON "PatientEncounter"("priority");

-- CreateIndex
CREATE INDEX "PatientConsultation_createdAt_idx" ON "PatientConsultation"("createdAt");

-- CreateIndex
CREATE INDEX "PatientConsultation_encounterId_idx" ON "PatientConsultation"("encounterId");

-- CreateIndex
CREATE INDEX "PatientConsultation_doctorId_idx" ON "PatientConsultation"("doctorId");

-- CreateIndex
CREATE INDEX "PatientDiagnosis_encounterId_idx" ON "PatientDiagnosis"("encounterId");

-- CreateIndex
CREATE INDEX "PatientPrescription_encounterId_idx" ON "PatientPrescription"("encounterId");

-- CreateIndex
CREATE INDEX "PatientPrescription_prescribedById_idx" ON "PatientPrescription"("prescribedById");

-- CreateIndex
CREATE UNIQUE INDEX "LaboratoryRequest_requestNumber_key" ON "LaboratoryRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "LaboratoryRequest_createdAt_idx" ON "LaboratoryRequest"("createdAt");

-- CreateIndex
CREATE INDEX "LaboratoryRequest_encounterId_idx" ON "LaboratoryRequest"("encounterId");

-- CreateIndex
CREATE INDEX "LaboratoryRequest_requestedById_idx" ON "LaboratoryRequest"("requestedById");

-- CreateIndex
CREATE INDEX "LaboratoryRequest_performedById_idx" ON "LaboratoryRequest"("performedById");

-- CreateIndex
CREATE INDEX "LaboratoryRequest_status_idx" ON "LaboratoryRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LaboratorySample_sampleBarcode_key" ON "LaboratorySample"("sampleBarcode");

-- CreateIndex
CREATE INDEX "LaboratorySample_requestId_idx" ON "LaboratorySample"("requestId");

-- CreateIndex
CREATE INDEX "LaboratorySample_sampleBarcode_idx" ON "LaboratorySample"("sampleBarcode");

-- CreateIndex
CREATE INDEX "LaboratorySample_status_idx" ON "LaboratorySample"("status");

-- CreateIndex
CREATE INDEX "LaboratoryTestResult_requestId_idx" ON "LaboratoryTestResult"("requestId");

-- CreateIndex
CREATE INDEX "LaboratoryTestResult_parameterName_idx" ON "LaboratoryTestResult"("parameterName");

-- CreateIndex
CREATE UNIQUE INDEX "LaboratoryCatalogItem_testCode_key" ON "LaboratoryCatalogItem"("testCode");

-- CreateIndex
CREATE INDEX "LaboratoryCatalogItem_department_idx" ON "LaboratoryCatalogItem"("department");

-- CreateIndex
CREATE INDEX "LaboratoryCatalogItem_active_idx" ON "LaboratoryCatalogItem"("active");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyOrder_accessionNumber_key" ON "RadiologyOrder"("accessionNumber");

-- CreateIndex
CREATE INDEX "RadiologyOrder_encounterId_idx" ON "RadiologyOrder"("encounterId");

-- CreateIndex
CREATE INDEX "RadiologyOrder_patientId_idx" ON "RadiologyOrder"("patientId");

-- CreateIndex
CREATE INDEX "RadiologyOrder_accessionNumber_idx" ON "RadiologyOrder"("accessionNumber");

-- CreateIndex
CREATE INDEX "RadiologyOrder_modality_idx" ON "RadiologyOrder"("modality");

-- CreateIndex
CREATE INDEX "RadiologyOrder_priority_idx" ON "RadiologyOrder"("priority");

-- CreateIndex
CREATE INDEX "RadiologyOrder_status_idx" ON "RadiologyOrder"("status");

-- CreateIndex
CREATE INDEX "RadiologyOrder_createdAt_idx" ON "RadiologyOrder"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DicomStudy_studyInstanceUid_key" ON "DicomStudy"("studyInstanceUid");

-- CreateIndex
CREATE INDEX "DicomStudy_orderId_idx" ON "DicomStudy"("orderId");

-- CreateIndex
CREATE INDEX "DicomStudy_studyInstanceUid_idx" ON "DicomStudy"("studyInstanceUid");

-- CreateIndex
CREATE INDEX "DicomStudy_modality_idx" ON "DicomStudy"("modality");

-- CreateIndex
CREATE INDEX "DicomStudy_acquiredAt_idx" ON "DicomStudy"("acquiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyReport_reportNumber_key" ON "RadiologyReport"("reportNumber");

-- CreateIndex
CREATE INDEX "RadiologyReport_orderId_idx" ON "RadiologyReport"("orderId");

-- CreateIndex
CREATE INDEX "RadiologyReport_reportNumber_idx" ON "RadiologyReport"("reportNumber");

-- CreateIndex
CREATE INDEX "RadiologyReport_status_idx" ON "RadiologyReport"("status");

-- CreateIndex
CREATE INDEX "RadiologyReport_classification_idx" ON "RadiologyReport"("classification");

-- CreateIndex
CREATE INDEX "RadiologyReport_criticalAlert_idx" ON "RadiologyReport"("criticalAlert");

-- CreateIndex
CREATE INDEX "RadiologyReport_createdAt_idx" ON "RadiologyReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyCatalogItem_code_key" ON "RadiologyCatalogItem"("code");

-- CreateIndex
CREATE INDEX "RadiologyCatalogItem_modality_idx" ON "RadiologyCatalogItem"("modality");

-- CreateIndex
CREATE INDEX "RadiologyCatalogItem_bodyPart_idx" ON "RadiologyCatalogItem"("bodyPart");

-- CreateIndex
CREATE INDEX "RadiologyCatalogItem_active_idx" ON "RadiologyCatalogItem"("active");

-- CreateIndex
CREATE UNIQUE INDEX "PatientBill_billNumber_key" ON "PatientBill"("billNumber");

-- CreateIndex
CREATE INDEX "PatientBill_createdAt_idx" ON "PatientBill"("createdAt");

-- CreateIndex
CREATE INDEX "PatientBill_encounterId_idx" ON "PatientBill"("encounterId");

-- CreateIndex
CREATE INDEX "PatientBill_patientId_idx" ON "PatientBill"("patientId");

-- CreateIndex
CREATE INDEX "PatientBill_billNumber_idx" ON "PatientBill"("billNumber");

-- CreateIndex
CREATE INDEX "PatientBill_paymentStatus_idx" ON "PatientBill"("paymentStatus");

-- CreateIndex
CREATE INDEX "PatientBill_payorType_idx" ON "PatientBill"("payorType");

-- CreateIndex
CREATE INDEX "BillItem_billId_idx" ON "BillItem"("billId");

-- CreateIndex
CREATE INDEX "BillItem_category_idx" ON "BillItem"("category");

-- CreateIndex
CREATE INDEX "BillItem_serviceCode_idx" ON "BillItem"("serviceCode");

-- CreateIndex
CREATE UNIQUE INDEX "PatientPayment_receiptNumber_key" ON "PatientPayment"("receiptNumber");

-- CreateIndex
CREATE INDEX "PatientPayment_billId_idx" ON "PatientPayment"("billId");

-- CreateIndex
CREATE INDEX "PatientPayment_receiptNumber_idx" ON "PatientPayment"("receiptNumber");

-- CreateIndex
CREATE INDEX "PatientPayment_paymentMethod_idx" ON "PatientPayment"("paymentMethod");

-- CreateIndex
CREATE INDEX "PatientPayment_paymentDate_idx" ON "PatientPayment"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceClaim_claimNumber_key" ON "InsuranceClaim"("claimNumber");

-- CreateIndex
CREATE INDEX "InsuranceClaim_billId_idx" ON "InsuranceClaim"("billId");

-- CreateIndex
CREATE INDEX "InsuranceClaim_claimNumber_idx" ON "InsuranceClaim"("claimNumber");

-- CreateIndex
CREATE INDEX "InsuranceClaim_status_idx" ON "InsuranceClaim"("status");

-- CreateIndex
CREATE INDEX "InsuranceClaim_insuranceProvider_idx" ON "InsuranceClaim"("insuranceProvider");

-- CreateIndex
CREATE UNIQUE INDEX "BillingTariffItem_code_key" ON "BillingTariffItem"("code");

-- CreateIndex
CREATE INDEX "BillingTariffItem_category_idx" ON "BillingTariffItem"("category");

-- CreateIndex
CREATE INDEX "BillingTariffItem_code_idx" ON "BillingTariffItem"("code");

-- CreateIndex
CREATE INDEX "BillingTariffItem_active_idx" ON "BillingTariffItem"("active");

-- CreateIndex
CREATE UNIQUE INDEX "OperatingTheatre_code_key" ON "OperatingTheatre"("code");

-- CreateIndex
CREATE INDEX "OperatingTheatre_status_idx" ON "OperatingTheatre"("status");

-- CreateIndex
CREATE INDEX "OperatingTheatre_theatreType_idx" ON "OperatingTheatre"("theatreType");

-- CreateIndex
CREATE INDEX "OperatingTheatre_active_idx" ON "OperatingTheatre"("active");

-- CreateIndex
CREATE UNIQUE INDEX "SurgicalCase_caseNumber_key" ON "SurgicalCase"("caseNumber");

-- CreateIndex
CREATE INDEX "SurgicalCase_encounterId_idx" ON "SurgicalCase"("encounterId");

-- CreateIndex
CREATE INDEX "SurgicalCase_patientId_idx" ON "SurgicalCase"("patientId");

-- CreateIndex
CREATE INDEX "SurgicalCase_theatreId_idx" ON "SurgicalCase"("theatreId");

-- CreateIndex
CREATE INDEX "SurgicalCase_caseNumber_idx" ON "SurgicalCase"("caseNumber");

-- CreateIndex
CREATE INDEX "SurgicalCase_status_idx" ON "SurgicalCase"("status");

-- CreateIndex
CREATE INDEX "SurgicalCase_priority_idx" ON "SurgicalCase"("priority");

-- CreateIndex
CREATE INDEX "SurgicalCase_createdAt_idx" ON "SurgicalCase"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SurgicalChecklist_caseId_key" ON "SurgicalChecklist"("caseId");

-- CreateIndex
CREATE INDEX "SurgicalChecklist_caseId_idx" ON "SurgicalChecklist"("caseId");

-- CreateIndex
CREATE INDEX "SurgicalChecklist_signInCompleted_idx" ON "SurgicalChecklist"("signInCompleted");

-- CreateIndex
CREATE INDEX "SurgicalChecklist_timeOutCompleted_idx" ON "SurgicalChecklist"("timeOutCompleted");

-- CreateIndex
CREATE INDEX "SurgicalChecklist_signOutCompleted_idx" ON "SurgicalChecklist"("signOutCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "AnesthesiaRecord_caseId_key" ON "AnesthesiaRecord"("caseId");

-- CreateIndex
CREATE INDEX "AnesthesiaRecord_caseId_idx" ON "AnesthesiaRecord"("caseId");

-- CreateIndex
CREATE INDEX "AnesthesiaRecord_anesthesiaType_idx" ON "AnesthesiaRecord"("anesthesiaType");

-- CreateIndex
CREATE INDEX "AnesthesiaRecord_asaStatus_idx" ON "AnesthesiaRecord"("asaStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PacuRecord_caseId_key" ON "PacuRecord"("caseId");

-- CreateIndex
CREATE INDEX "PacuRecord_caseId_idx" ON "PacuRecord"("caseId");

-- CreateIndex
CREATE INDEX "PacuRecord_aldreteTotalScore_idx" ON "PacuRecord"("aldreteTotalScore");

-- CreateIndex
CREATE INDEX "PacuRecord_clearedForDischarge_idx" ON "PacuRecord"("clearedForDischarge");

-- CreateIndex
CREATE UNIQUE INDEX "SurgicalCatalogItem_code_key" ON "SurgicalCatalogItem"("code");

-- CreateIndex
CREATE INDEX "SurgicalCatalogItem_category_idx" ON "SurgicalCatalogItem"("category");

-- CreateIndex
CREATE INDEX "SurgicalCatalogItem_active_idx" ON "SurgicalCatalogItem"("active");

-- CreateIndex
CREATE INDEX "NursingRecord_createdAt_idx" ON "NursingRecord"("createdAt");

-- CreateIndex
CREATE INDEX "NursingRecord_encounterId_idx" ON "NursingRecord"("encounterId");

-- CreateIndex
CREATE INDEX "NursingRecord_recordedById_idx" ON "NursingRecord"("recordedById");

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_patientId_key" ON "PatientProfile"("patientId");

-- CreateIndex
CREATE INDEX "PatientProfile_patientId_idx" ON "PatientProfile"("patientId");

-- CreateIndex
CREATE INDEX "PatientMedicalRecord_patientId_idx" ON "PatientMedicalRecord"("patientId");

-- CreateIndex
CREATE INDEX "PatientMedicalRecord_recordType_idx" ON "PatientMedicalRecord"("recordType");

-- CreateIndex
CREATE INDEX "PatientMedicalRecord_active_idx" ON "PatientMedicalRecord"("active");

-- CreateIndex
CREATE INDEX "PatientMedicalRecord_deletedAt_idx" ON "PatientMedicalRecord"("deletedAt");

-- CreateIndex
CREATE INDEX "PatientAllergy_patientId_idx" ON "PatientAllergy"("patientId");

-- CreateIndex
CREATE INDEX "PatientAllergy_status_idx" ON "PatientAllergy"("status");

-- CreateIndex
CREATE INDEX "PatientAllergy_active_idx" ON "PatientAllergy"("active");

-- CreateIndex
CREATE INDEX "PatientVitalSign_patientId_idx" ON "PatientVitalSign"("patientId");

-- CreateIndex
CREATE INDEX "PatientVitalSign_encounterId_idx" ON "PatientVitalSign"("encounterId");

-- CreateIndex
CREATE INDEX "PatientVitalSign_recordedAt_idx" ON "PatientVitalSign"("recordedAt");

-- CreateIndex
CREATE INDEX "PatientVitalSign_riskCategory_idx" ON "PatientVitalSign"("riskCategory");

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
CREATE UNIQUE INDEX "PharmacyItem_itemCode_key" ON "PharmacyItem"("itemCode");

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
CREATE UNIQUE INDEX "PrescriptionDispense_dispenseNumber_key" ON "PrescriptionDispense"("dispenseNumber");

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
CREATE UNIQUE INDEX "Tenant_tenantId_key" ON "Tenant"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_tenantCode_key" ON "Tenant"("tenantCode");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_institutionId_key" ON "Tenant"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_officialEmail_key" ON "Tenant"("officialEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_hospitalId_key" ON "Tenant"("hospitalId");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "Tenant_tenantId_idx" ON "Tenant"("tenantId");

-- CreateIndex
CREATE INDEX "Tenant_tenantCode_idx" ON "Tenant"("tenantCode");

-- CreateIndex
CREATE INDEX "Tenant_systemLocked_idx" ON "Tenant"("systemLocked");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSubscription_subscriptionId_key" ON "TenantSubscription"("subscriptionId");

-- CreateIndex
CREATE INDEX "TenantSubscription_tenantId_idx" ON "TenantSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "TenantSubscription_status_idx" ON "TenantSubscription"("status");

-- CreateIndex
CREATE INDEX "TenantSubscription_trialEndDate_idx" ON "TenantSubscription"("trialEndDate");

-- CreateIndex
CREATE INDEX "TenantMessage_tenantId_idx" ON "TenantMessage"("tenantId");

-- CreateIndex
CREATE INDEX "TenantMessage_createdAt_idx" ON "TenantMessage"("createdAt");

-- CreateIndex
CREATE INDEX "TenantLocationPing_tenantId_idx" ON "TenantLocationPing"("tenantId");

-- CreateIndex
CREATE INDEX "TenantLocationPing_recordedAt_idx" ON "TenantLocationPing"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoCallSession_channelName_key" ON "VideoCallSession"("channelName");

-- CreateIndex
CREATE INDEX "VideoCallSession_tenantId_idx" ON "VideoCallSession"("tenantId");

-- CreateIndex
CREATE INDEX "VideoCallSession_status_idx" ON "VideoCallSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalFolder_patientId_key" ON "MedicalFolder"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalFolder_folderNumber_key" ON "MedicalFolder"("folderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalFolder_barcode_key" ON "MedicalFolder"("barcode");

-- CreateIndex
CREATE INDEX "MedicalFolder_hospitalId_idx" ON "MedicalFolder"("hospitalId");

-- CreateIndex
CREATE INDEX "MedicalFolder_folderNumber_idx" ON "MedicalFolder"("folderNumber");

-- CreateIndex
CREATE INDEX "MedicalFolder_barcode_idx" ON "MedicalFolder"("barcode");

-- CreateIndex
CREATE INDEX "MedicalFolder_status_idx" ON "MedicalFolder"("status");

-- CreateIndex
CREATE INDEX "MedicalFolder_shelfLocation_idx" ON "MedicalFolder"("shelfLocation");

-- CreateIndex
CREATE INDEX "FolderRetrievalRequest_folderId_idx" ON "FolderRetrievalRequest"("folderId");

-- CreateIndex
CREATE INDEX "FolderRetrievalRequest_patientId_idx" ON "FolderRetrievalRequest"("patientId");

-- CreateIndex
CREATE INDEX "FolderRetrievalRequest_status_idx" ON "FolderRetrievalRequest"("status");

-- CreateIndex
CREATE INDEX "FolderRetrievalRequest_priority_idx" ON "FolderRetrievalRequest"("priority");

-- CreateIndex
CREATE INDEX "FolderRetrievalRequest_requestedAt_idx" ON "FolderRetrievalRequest"("requestedAt");

-- CreateIndex
CREATE INDEX "FolderMovementLog_folderId_idx" ON "FolderMovementLog"("folderId");

-- CreateIndex
CREATE INDEX "FolderMovementLog_action_idx" ON "FolderMovementLog"("action");

-- CreateIndex
CREATE INDEX "FolderMovementLog_createdAt_idx" ON "FolderMovementLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OpdQueueTicket_encounterId_key" ON "OpdQueueTicket"("encounterId");

-- CreateIndex
CREATE INDEX "OpdQueueTicket_hospitalId_idx" ON "OpdQueueTicket"("hospitalId");

-- CreateIndex
CREATE INDEX "OpdQueueTicket_patientId_idx" ON "OpdQueueTicket"("patientId");

-- CreateIndex
CREATE INDEX "OpdQueueTicket_department_idx" ON "OpdQueueTicket"("department");

-- CreateIndex
CREATE INDEX "OpdQueueTicket_status_idx" ON "OpdQueueTicket"("status");

-- CreateIndex
CREATE INDEX "OpdQueueTicket_priority_idx" ON "OpdQueueTicket"("priority");

-- CreateIndex
CREATE INDEX "OpdQueueTicket_createdAt_idx" ON "OpdQueueTicket"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ambulance_vehicleNumber_key" ON "Ambulance"("vehicleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Ambulance_registrationPlate_key" ON "Ambulance"("registrationPlate");

-- CreateIndex
CREATE INDEX "Ambulance_vehicleNumber_idx" ON "Ambulance"("vehicleNumber");

-- CreateIndex
CREATE INDEX "Ambulance_status_idx" ON "Ambulance"("status");

-- CreateIndex
CREATE INDEX "Ambulance_type_idx" ON "Ambulance"("type");

-- CreateIndex
CREATE UNIQUE INDEX "AmbulanceDispatch_dispatchNumber_key" ON "AmbulanceDispatch"("dispatchNumber");

-- CreateIndex
CREATE INDEX "AmbulanceDispatch_dispatchNumber_idx" ON "AmbulanceDispatch"("dispatchNumber");

-- CreateIndex
CREATE INDEX "AmbulanceDispatch_ambulanceId_idx" ON "AmbulanceDispatch"("ambulanceId");

-- CreateIndex
CREATE INDEX "AmbulanceDispatch_status_idx" ON "AmbulanceDispatch"("status");

-- CreateIndex
CREATE INDEX "AmbulanceDispatch_triageSeverity_idx" ON "AmbulanceDispatch"("triageSeverity");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyCase_caseNumber_key" ON "EmergencyCase"("caseNumber");

-- CreateIndex
CREATE INDEX "EmergencyCase_caseNumber_idx" ON "EmergencyCase"("caseNumber");

-- CreateIndex
CREATE INDEX "EmergencyCase_patientId_idx" ON "EmergencyCase"("patientId");

-- CreateIndex
CREATE INDEX "EmergencyCase_status_idx" ON "EmergencyCase"("status");

-- CreateIndex
CREATE INDEX "EmergencyCase_triageCategory_idx" ON "EmergencyCase"("triageCategory");

-- CreateIndex
CREATE INDEX "EmergencyCase_arrivalMode_idx" ON "EmergencyCase"("arrivalMode");

-- CreateIndex
CREATE UNIQUE INDEX "BloodDonor_donorNumber_key" ON "BloodDonor"("donorNumber");

-- CreateIndex
CREATE INDEX "BloodDonor_donorNumber_idx" ON "BloodDonor"("donorNumber");

-- CreateIndex
CREATE INDEX "BloodDonor_bloodGroup_idx" ON "BloodDonor"("bloodGroup");

-- CreateIndex
CREATE INDEX "BloodDonor_eligibilityStatus_idx" ON "BloodDonor"("eligibilityStatus");

-- CreateIndex
CREATE INDEX "BloodDonor_phone_idx" ON "BloodDonor"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "BloodUnit_unitBarcode_key" ON "BloodUnit"("unitBarcode");

-- CreateIndex
CREATE INDEX "BloodUnit_unitBarcode_idx" ON "BloodUnit"("unitBarcode");

-- CreateIndex
CREATE INDEX "BloodUnit_bloodGroup_idx" ON "BloodUnit"("bloodGroup");

-- CreateIndex
CREATE INDEX "BloodUnit_componentType_idx" ON "BloodUnit"("componentType");

-- CreateIndex
CREATE INDEX "BloodUnit_status_idx" ON "BloodUnit"("status");

-- CreateIndex
CREATE INDEX "BloodUnit_expiryDate_idx" ON "BloodUnit"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "BloodTransfusionRequest_requestNumber_key" ON "BloodTransfusionRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "BloodTransfusionRequest_requestNumber_idx" ON "BloodTransfusionRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "BloodTransfusionRequest_patientId_idx" ON "BloodTransfusionRequest"("patientId");

-- CreateIndex
CREATE INDEX "BloodTransfusionRequest_patientBloodGroup_idx" ON "BloodTransfusionRequest"("patientBloodGroup");

-- CreateIndex
CREATE INDEX "BloodTransfusionRequest_status_idx" ON "BloodTransfusionRequest"("status");

-- CreateIndex
CREATE INDEX "BloodTransfusionRequest_urgencyLevel_idx" ON "BloodTransfusionRequest"("urgencyLevel");

-- CreateIndex
CREATE UNIQUE INDEX "BloodCrossMatch_crossMatchNumber_key" ON "BloodCrossMatch"("crossMatchNumber");

-- CreateIndex
CREATE INDEX "BloodCrossMatch_crossMatchNumber_idx" ON "BloodCrossMatch"("crossMatchNumber");

-- CreateIndex
CREATE INDEX "BloodCrossMatch_requestId_idx" ON "BloodCrossMatch"("requestId");

-- CreateIndex
CREATE INDEX "BloodCrossMatch_bloodUnitId_idx" ON "BloodCrossMatch"("bloodUnitId");

-- CreateIndex
CREATE INDEX "BloodCrossMatch_compatibilityStatus_idx" ON "BloodCrossMatch"("compatibilityStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BloodTransfusionRecord_transfusionNumber_key" ON "BloodTransfusionRecord"("transfusionNumber");

-- CreateIndex
CREATE INDEX "BloodTransfusionRecord_transfusionNumber_idx" ON "BloodTransfusionRecord"("transfusionNumber");

-- CreateIndex
CREATE INDEX "BloodTransfusionRecord_requestId_idx" ON "BloodTransfusionRecord"("requestId");

-- CreateIndex
CREATE INDEX "BloodTransfusionRecord_bloodUnitId_idx" ON "BloodTransfusionRecord"("bloodUnitId");

-- CreateIndex
CREATE INDEX "BloodTransfusionRecord_status_idx" ON "BloodTransfusionRecord"("status");

-- CreateIndex
CREATE INDEX "BloodTransfusionRecord_hadAdverseReaction_idx" ON "BloodTransfusionRecord"("hadAdverseReaction");

-- CreateIndex
CREATE UNIQUE INDEX "CorpseRecord_corpseNumber_key" ON "CorpseRecord"("corpseNumber");

-- CreateIndex
CREATE INDEX "CorpseRecord_corpseNumber_idx" ON "CorpseRecord"("corpseNumber");

-- CreateIndex
CREATE INDEX "CorpseRecord_patientId_idx" ON "CorpseRecord"("patientId");

-- CreateIndex
CREATE INDEX "CorpseRecord_status_idx" ON "CorpseRecord"("status");

-- CreateIndex
CREATE INDEX "CorpseRecord_caseCategory_idx" ON "CorpseRecord"("caseCategory");

-- CreateIndex
CREATE INDEX "CorpseRecord_chamberId_idx" ON "CorpseRecord"("chamberId");

-- CreateIndex
CREATE UNIQUE INDEX "MortuaryChamber_chamberCode_key" ON "MortuaryChamber"("chamberCode");

-- CreateIndex
CREATE INDEX "MortuaryChamber_chamberCode_idx" ON "MortuaryChamber"("chamberCode");

-- CreateIndex
CREATE INDEX "MortuaryChamber_storageTier_idx" ON "MortuaryChamber"("storageTier");

-- CreateIndex
CREATE INDEX "MortuaryChamber_isOperational_idx" ON "MortuaryChamber"("isOperational");

-- CreateIndex
CREATE UNIQUE INDEX "AutopsyCase_autopsyNumber_key" ON "AutopsyCase"("autopsyNumber");

-- CreateIndex
CREATE INDEX "AutopsyCase_autopsyNumber_idx" ON "AutopsyCase"("autopsyNumber");

-- CreateIndex
CREATE INDEX "AutopsyCase_corpseId_idx" ON "AutopsyCase"("corpseId");

-- CreateIndex
CREATE INDEX "AutopsyCase_status_idx" ON "AutopsyCase"("status");

-- CreateIndex
CREATE INDEX "AutopsyCase_autopsyType_idx" ON "AutopsyCase"("autopsyType");

-- CreateIndex
CREATE UNIQUE INDEX "CorpseRelease_releaseNumber_key" ON "CorpseRelease"("releaseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CorpseRelease_corpseId_key" ON "CorpseRelease"("corpseId");

-- CreateIndex
CREATE INDEX "CorpseRelease_releaseNumber_idx" ON "CorpseRelease"("releaseNumber");

-- CreateIndex
CREATE INDEX "CorpseRelease_corpseId_idx" ON "CorpseRelease"("corpseId");

-- CreateIndex
CREATE INDEX "CorpseRelease_nextOfKinNationalId_idx" ON "CorpseRelease"("nextOfKinNationalId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalEquipment_assetTag_key" ON "MedicalEquipment"("assetTag");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalEquipment_serialNumber_key" ON "MedicalEquipment"("serialNumber");

-- CreateIndex
CREATE INDEX "MedicalEquipment_assetTag_idx" ON "MedicalEquipment"("assetTag");

-- CreateIndex
CREATE INDEX "MedicalEquipment_serialNumber_idx" ON "MedicalEquipment"("serialNumber");

-- CreateIndex
CREATE INDEX "MedicalEquipment_category_idx" ON "MedicalEquipment"("category");

-- CreateIndex
CREATE INDEX "MedicalEquipment_riskLevel_idx" ON "MedicalEquipment"("riskLevel");

-- CreateIndex
CREATE INDEX "MedicalEquipment_department_idx" ON "MedicalEquipment"("department");

-- CreateIndex
CREATE INDEX "MedicalEquipment_status_idx" ON "MedicalEquipment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalWorkOrder_workOrderNumber_key" ON "MedicalWorkOrder"("workOrderNumber");

-- CreateIndex
CREATE INDEX "MedicalWorkOrder_workOrderNumber_idx" ON "MedicalWorkOrder"("workOrderNumber");

-- CreateIndex
CREATE INDEX "MedicalWorkOrder_equipmentId_idx" ON "MedicalWorkOrder"("equipmentId");

-- CreateIndex
CREATE INDEX "MedicalWorkOrder_orderType_idx" ON "MedicalWorkOrder"("orderType");

-- CreateIndex
CREATE INDEX "MedicalWorkOrder_priority_idx" ON "MedicalWorkOrder"("priority");

-- CreateIndex
CREATE INDEX "MedicalWorkOrder_status_idx" ON "MedicalWorkOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentCalibration_certificateNumber_key" ON "EquipmentCalibration"("certificateNumber");

-- CreateIndex
CREATE INDEX "EquipmentCalibration_certificateNumber_idx" ON "EquipmentCalibration"("certificateNumber");

-- CreateIndex
CREATE INDEX "EquipmentCalibration_equipmentId_idx" ON "EquipmentCalibration"("equipmentId");

-- CreateIndex
CREATE INDEX "EquipmentCalibration_calibrationResult_idx" ON "EquipmentCalibration"("calibrationResult");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementVendor_vendorCode_key" ON "ProcurementVendor"("vendorCode");

-- CreateIndex
CREATE INDEX "ProcurementVendor_vendorCode_idx" ON "ProcurementVendor"("vendorCode");

-- CreateIndex
CREATE INDEX "ProcurementVendor_category_idx" ON "ProcurementVendor"("category");

-- CreateIndex
CREATE INDEX "ProcurementVendor_status_idx" ON "ProcurementVendor"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VendorContract_contractNumber_key" ON "VendorContract"("contractNumber");

-- CreateIndex
CREATE INDEX "VendorContract_contractNumber_idx" ON "VendorContract"("contractNumber");

-- CreateIndex
CREATE INDEX "VendorContract_vendorId_idx" ON "VendorContract"("vendorId");

-- CreateIndex
CREATE INDEX "VendorContract_contractType_idx" ON "VendorContract"("contractType");

-- CreateIndex
CREATE INDEX "VendorContract_status_idx" ON "VendorContract"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_poNumber_idx" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_department_idx" ON "PurchaseOrder"("department");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_priority_idx" ON "PurchaseOrder"("priority");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_itemCode_idx" ON "PurchaseOrderItem"("itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceiptNote_grnNumber_key" ON "GoodsReceiptNote"("grnNumber");

-- CreateIndex
CREATE INDEX "GoodsReceiptNote_grnNumber_idx" ON "GoodsReceiptNote"("grnNumber");

-- CreateIndex
CREATE INDEX "GoodsReceiptNote_purchaseOrderId_idx" ON "GoodsReceiptNote"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "GoodsReceiptNote_vendorId_idx" ON "GoodsReceiptNote"("vendorId");

-- CreateIndex
CREATE INDEX "GoodsReceiptNote_status_idx" ON "GoodsReceiptNote"("status");

-- CreateIndex
CREATE INDEX "GoodsReceiptNote_threeWayMatchVerified_idx" ON "GoodsReceiptNote"("threeWayMatchVerified");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_grnId_idx" ON "GoodsReceiptItem"("grnId");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_poItemId_idx" ON "GoodsReceiptItem"("poItemId");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_itemCode_idx" ON "GoodsReceiptItem"("itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "StaffCredential_credentialNumber_key" ON "StaffCredential"("credentialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StaffCredential_licenseNumber_key" ON "StaffCredential"("licenseNumber");

-- CreateIndex
CREATE INDEX "StaffCredential_credentialNumber_idx" ON "StaffCredential"("credentialNumber");

-- CreateIndex
CREATE INDEX "StaffCredential_staffId_idx" ON "StaffCredential"("staffId");

-- CreateIndex
CREATE INDEX "StaffCredential_licenseNumber_idx" ON "StaffCredential"("licenseNumber");

-- CreateIndex
CREATE INDEX "StaffCredential_credentialStatus_idx" ON "StaffCredential"("credentialStatus");

-- CreateIndex
CREATE INDEX "StaffCredential_regulatoryBody_idx" ON "StaffCredential"("regulatoryBody");

-- CreateIndex
CREATE UNIQUE INDEX "DutyShiftRoster_rosterNumber_key" ON "DutyShiftRoster"("rosterNumber");

-- CreateIndex
CREATE INDEX "DutyShiftRoster_rosterNumber_idx" ON "DutyShiftRoster"("rosterNumber");

-- CreateIndex
CREATE INDEX "DutyShiftRoster_staffId_idx" ON "DutyShiftRoster"("staffId");

-- CreateIndex
CREATE INDEX "DutyShiftRoster_department_idx" ON "DutyShiftRoster"("department");

-- CreateIndex
CREATE INDEX "DutyShiftRoster_shiftDate_idx" ON "DutyShiftRoster"("shiftDate");

-- CreateIndex
CREATE INDEX "DutyShiftRoster_status_idx" ON "DutyShiftRoster"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftHandover_handoverNumber_key" ON "ShiftHandover"("handoverNumber");

-- CreateIndex
CREATE INDEX "ShiftHandover_handoverNumber_idx" ON "ShiftHandover"("handoverNumber");

-- CreateIndex
CREATE INDEX "ShiftHandover_department_idx" ON "ShiftHandover"("department");

-- CreateIndex
CREATE INDEX "ShiftHandover_status_idx" ON "ShiftHandover"("status");

-- CreateIndex
CREATE INDEX "ShiftHandover_handoverDate_idx" ON "ShiftHandover"("handoverDate");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAttendance_attendanceNumber_key" ON "StaffAttendance"("attendanceNumber");

-- CreateIndex
CREATE INDEX "StaffAttendance_attendanceNumber_idx" ON "StaffAttendance"("attendanceNumber");

-- CreateIndex
CREATE INDEX "StaffAttendance_staffId_idx" ON "StaffAttendance"("staffId");

-- CreateIndex
CREATE INDEX "StaffAttendance_department_idx" ON "StaffAttendance"("department");

-- CreateIndex
CREATE INDEX "StaffAttendance_clockInDate_idx" ON "StaffAttendance"("clockInDate");

-- CreateIndex
CREATE UNIQUE INDEX "StaffLeaveRequest_leaveNumber_key" ON "StaffLeaveRequest"("leaveNumber");

-- CreateIndex
CREATE INDEX "StaffLeaveRequest_leaveNumber_idx" ON "StaffLeaveRequest"("leaveNumber");

-- CreateIndex
CREATE INDEX "StaffLeaveRequest_staffId_idx" ON "StaffLeaveRequest"("staffId");

-- CreateIndex
CREATE INDEX "StaffLeaveRequest_department_idx" ON "StaffLeaveRequest"("department");

-- CreateIndex
CREATE INDEX "StaffLeaveRequest_status_idx" ON "StaffLeaveRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalIncident_incidentNumber_key" ON "ClinicalIncident"("incidentNumber");

-- CreateIndex
CREATE INDEX "ClinicalIncident_incidentNumber_idx" ON "ClinicalIncident"("incidentNumber");

-- CreateIndex
CREATE INDEX "ClinicalIncident_severity_idx" ON "ClinicalIncident"("severity");

-- CreateIndex
CREATE INDEX "ClinicalIncident_category_idx" ON "ClinicalIncident"("category");

-- CreateIndex
CREATE INDEX "ClinicalIncident_department_idx" ON "ClinicalIncident"("department");

-- CreateIndex
CREATE INDEX "ClinicalIncident_status_idx" ON "ClinicalIncident"("status");

-- CreateIndex
CREATE INDEX "ClinicalIncident_incidentDate_idx" ON "ClinicalIncident"("incidentDate");

-- CreateIndex
CREATE UNIQUE INDEX "InfectionControlCase_caseNumber_key" ON "InfectionControlCase"("caseNumber");

-- CreateIndex
CREATE INDEX "InfectionControlCase_caseNumber_idx" ON "InfectionControlCase"("caseNumber");

-- CreateIndex
CREATE INDEX "InfectionControlCase_infectionType_idx" ON "InfectionControlCase"("infectionType");

-- CreateIndex
CREATE INDEX "InfectionControlCase_isolationType_idx" ON "InfectionControlCase"("isolationType");

-- CreateIndex
CREATE INDEX "InfectionControlCase_department_idx" ON "InfectionControlCase"("department");

-- CreateIndex
CREATE INDEX "InfectionControlCase_status_idx" ON "InfectionControlCase"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalAudit_auditNumber_key" ON "ClinicalAudit"("auditNumber");

-- CreateIndex
CREATE INDEX "ClinicalAudit_auditNumber_idx" ON "ClinicalAudit"("auditNumber");

-- CreateIndex
CREATE INDEX "ClinicalAudit_auditType_idx" ON "ClinicalAudit"("auditType");

-- CreateIndex
CREATE INDEX "ClinicalAudit_department_idx" ON "ClinicalAudit"("department");

-- CreateIndex
CREATE INDEX "ClinicalAudit_status_idx" ON "ClinicalAudit"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CorrectiveActionPlan_capaNumber_key" ON "CorrectiveActionPlan"("capaNumber");

-- CreateIndex
CREATE INDEX "CorrectiveActionPlan_capaNumber_idx" ON "CorrectiveActionPlan"("capaNumber");

-- CreateIndex
CREATE INDEX "CorrectiveActionPlan_incidentId_idx" ON "CorrectiveActionPlan"("incidentId");

-- CreateIndex
CREATE INDEX "CorrectiveActionPlan_auditId_idx" ON "CorrectiveActionPlan"("auditId");

-- CreateIndex
CREATE INDEX "CorrectiveActionPlan_status_idx" ON "CorrectiveActionPlan"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PatientSafetyAlert_alertCode_key" ON "PatientSafetyAlert"("alertCode");

-- CreateIndex
CREATE INDEX "PatientSafetyAlert_alertCode_idx" ON "PatientSafetyAlert"("alertCode");

-- CreateIndex
CREATE INDEX "PatientSafetyAlert_urgencyLevel_idx" ON "PatientSafetyAlert"("urgencyLevel");

-- CreateIndex
CREATE INDEX "PatientSafetyAlert_broadcastActive_idx" ON "PatientSafetyAlert"("broadcastActive");

-- CreateIndex
CREATE UNIQUE INDEX "NhiaClaimBatch_batchNumber_key" ON "NhiaClaimBatch"("batchNumber");

-- CreateIndex
CREATE INDEX "NhiaClaimBatch_batchNumber_idx" ON "NhiaClaimBatch"("batchNumber");

-- CreateIndex
CREATE INDEX "NhiaClaimBatch_status_idx" ON "NhiaClaimBatch"("status");

-- CreateIndex
CREATE INDEX "NhiaClaimBatch_periodYear_periodMonth_idx" ON "NhiaClaimBatch"("periodYear", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "NhiaClaimItem_claimNumber_key" ON "NhiaClaimItem"("claimNumber");

-- CreateIndex
CREATE INDEX "NhiaClaimItem_claimNumber_idx" ON "NhiaClaimItem"("claimNumber");

-- CreateIndex
CREATE INDEX "NhiaClaimItem_batchId_idx" ON "NhiaClaimItem"("batchId");

-- CreateIndex
CREATE INDEX "NhiaClaimItem_nhisNumber_idx" ON "NhiaClaimItem"("nhisNumber");

-- CreateIndex
CREATE INDEX "NhiaClaimItem_adjudicationStatus_idx" ON "NhiaClaimItem"("adjudicationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "NhiaReconciliationVoucher_voucherNumber_key" ON "NhiaReconciliationVoucher"("voucherNumber");

-- CreateIndex
CREATE INDEX "NhiaReconciliationVoucher_voucherNumber_idx" ON "NhiaReconciliationVoucher"("voucherNumber");

-- CreateIndex
CREATE INDEX "NhiaReconciliationVoucher_batchId_idx" ON "NhiaReconciliationVoucher"("batchId");

-- CreateIndex
CREATE INDEX "NhiaReconciliationVoucher_status_idx" ON "NhiaReconciliationVoucher"("status");

-- CreateIndex
CREATE UNIQUE INDEX "NhisMemberPolicy_nhisNumber_key" ON "NhisMemberPolicy"("nhisNumber");

-- CreateIndex
CREATE INDEX "NhisMemberPolicy_nhisNumber_idx" ON "NhisMemberPolicy"("nhisNumber");

-- CreateIndex
CREATE INDEX "NhisMemberPolicy_status_idx" ON "NhisMemberPolicy"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MigrationJob_jobCode_key" ON "MigrationJob"("jobCode");

-- CreateIndex
CREATE INDEX "MigrationJob_jobCode_idx" ON "MigrationJob"("jobCode");

-- CreateIndex
CREATE INDEX "MigrationJob_status_idx" ON "MigrationJob"("status");

-- CreateIndex
CREATE INDEX "MigrationJob_targetEntity_idx" ON "MigrationJob"("targetEntity");

-- CreateIndex
CREATE INDEX "MigrationRecordItem_jobId_idx" ON "MigrationRecordItem"("jobId");

-- CreateIndex
CREATE INDEX "MigrationRecordItem_status_idx" ON "MigrationRecordItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MigrationTemplate_name_key" ON "MigrationTemplate"("name");

-- CreateIndex
CREATE INDEX "MigrationTemplate_name_idx" ON "MigrationTemplate"("name");

-- CreateIndex
CREATE INDEX "MigrationTemplate_targetEntity_idx" ON "MigrationTemplate"("targetEntity");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityGeofence_code_key" ON "FacilityGeofence"("code");

-- CreateIndex
CREATE INDEX "FacilityGeofence_code_idx" ON "FacilityGeofence"("code");

-- CreateIndex
CREATE INDEX "FacilityGeofence_facilityType_idx" ON "FacilityGeofence"("facilityType");

-- CreateIndex
CREATE INDEX "FacilityGeofence_active_idx" ON "FacilityGeofence"("active");

-- CreateIndex
CREATE INDEX "GeofenceBreachEvent_geofenceId_idx" ON "GeofenceBreachEvent"("geofenceId");

-- CreateIndex
CREATE INDEX "GeofenceBreachEvent_entityType_idx" ON "GeofenceBreachEvent"("entityType");

-- CreateIndex
CREATE INDEX "GeofenceBreachEvent_eventType_idx" ON "GeofenceBreachEvent"("eventType");

-- CreateIndex
CREATE INDEX "GeofenceBreachEvent_timestamp_idx" ON "GeofenceBreachEvent"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityFloorPlan_code_key" ON "FacilityFloorPlan"("code");

-- CreateIndex
CREATE INDEX "FacilityFloorPlan_code_idx" ON "FacilityFloorPlan"("code");

-- CreateIndex
CREATE INDEX "FacilityFloorPlan_buildingName_idx" ON "FacilityFloorPlan"("buildingName");

-- CreateIndex
CREATE INDEX "FacilityFloorPlan_floorNumber_idx" ON "FacilityFloorPlan"("floorNumber");

-- CreateIndex
CREATE INDEX "FacilityFloorPlan_active_idx" ON "FacilityFloorPlan"("active");

-- CreateIndex
CREATE UNIQUE INDEX "TelemedicineConsultation_sessionCode_key" ON "TelemedicineConsultation"("sessionCode");

-- CreateIndex
CREATE UNIQUE INDEX "TelemedicineConsultation_roomToken_key" ON "TelemedicineConsultation"("roomToken");

-- CreateIndex
CREATE INDEX "TelemedicineConsultation_sessionCode_idx" ON "TelemedicineConsultation"("sessionCode");

-- CreateIndex
CREATE INDEX "TelemedicineConsultation_patientId_idx" ON "TelemedicineConsultation"("patientId");

-- CreateIndex
CREATE INDEX "TelemedicineConsultation_doctorId_idx" ON "TelemedicineConsultation"("doctorId");

-- CreateIndex
CREATE INDEX "TelemedicineConsultation_status_idx" ON "TelemedicineConsultation"("status");

-- CreateIndex
CREATE INDEX "TelemedicineConsultation_scheduledAt_idx" ON "TelemedicineConsultation"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricVoiceprint_enrollmentCode_key" ON "BiometricVoiceprint"("enrollmentCode");

-- CreateIndex
CREATE INDEX "BiometricVoiceprint_enrollmentCode_idx" ON "BiometricVoiceprint"("enrollmentCode");

-- CreateIndex
CREATE INDEX "BiometricVoiceprint_userId_idx" ON "BiometricVoiceprint"("userId");

-- CreateIndex
CREATE INDEX "BiometricVoiceprint_status_idx" ON "BiometricVoiceprint"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricSecurityCredential_credentialCode_key" ON "BiometricSecurityCredential"("credentialCode");

-- CreateIndex
CREATE INDEX "BiometricSecurityCredential_credentialCode_idx" ON "BiometricSecurityCredential"("credentialCode");

-- CreateIndex
CREATE INDEX "BiometricSecurityCredential_userId_idx" ON "BiometricSecurityCredential"("userId");

-- CreateIndex
CREATE INDEX "BiometricSecurityCredential_biometricType_idx" ON "BiometricSecurityCredential"("biometricType");

-- CreateIndex
CREATE INDEX "BiometricSecurityCredential_status_idx" ON "BiometricSecurityCredential"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricVerificationLog_logCode_key" ON "BiometricVerificationLog"("logCode");

-- CreateIndex
CREATE INDEX "BiometricVerificationLog_logCode_idx" ON "BiometricVerificationLog"("logCode");

-- CreateIndex
CREATE INDEX "BiometricVerificationLog_userId_idx" ON "BiometricVerificationLog"("userId");

-- CreateIndex
CREATE INDEX "BiometricVerificationLog_biometricType_idx" ON "BiometricVerificationLog"("biometricType");

-- CreateIndex
CREATE INDEX "BiometricVerificationLog_status_idx" ON "BiometricVerificationLog"("status");

-- CreateIndex
CREATE INDEX "BiometricVerificationLog_actionAttempted_idx" ON "BiometricVerificationLog"("actionAttempted");

-- CreateIndex
CREATE INDEX "BiometricVerificationLog_createdAt_idx" ON "BiometricVerificationLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricSecurityPolicy_policyCode_key" ON "BiometricSecurityPolicy"("policyCode");

-- CreateIndex
CREATE INDEX "BiometricSecurityPolicy_policyCode_idx" ON "BiometricSecurityPolicy"("policyCode");

-- CreateIndex
CREATE INDEX "BiometricSecurityPolicy_active_idx" ON "BiometricSecurityPolicy"("active");

-- CreateIndex
CREATE INDEX "SystemEvent_eventCode_idx" ON "SystemEvent"("eventCode");

-- CreateIndex
CREATE INDEX "SystemEvent_domain_idx" ON "SystemEvent"("domain");

-- CreateIndex
CREATE INDEX "SystemEvent_actorUserId_idx" ON "SystemEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "SystemEvent_tenantId_idx" ON "SystemEvent"("tenantId");

-- CreateIndex
CREATE INDEX "SystemEvent_status_idx" ON "SystemEvent"("status");

-- CreateIndex
CREATE INDEX "SystemEvent_requestId_idx" ON "SystemEvent"("requestId");

-- CreateIndex
CREATE INDEX "SystemEvent_createdAt_idx" ON "SystemEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SystemNotification_recipientUserId_idx" ON "SystemNotification"("recipientUserId");

-- CreateIndex
CREATE INDEX "SystemNotification_recipientRole_idx" ON "SystemNotification"("recipientRole");

-- CreateIndex
CREATE INDEX "SystemNotification_tenantId_idx" ON "SystemNotification"("tenantId");

-- CreateIndex
CREATE INDEX "SystemNotification_eventType_idx" ON "SystemNotification"("eventType");

-- CreateIndex
CREATE INDEX "SystemNotification_isRead_idx" ON "SystemNotification"("isRead");

-- CreateIndex
CREATE INDEX "SystemNotification_createdAt_idx" ON "SystemNotification"("createdAt");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_payloadHash_idx" ON "IdempotencyRecord"("payloadHash");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_createdAt_idx" ON "IdempotencyRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_idempotencyKey_userId_method_path_key" ON "IdempotencyRecord"("idempotencyKey", "userId", "method", "path");

-- CreateIndex
CREATE UNIQUE INDEX "DeveloperAccessGrant_grantCode_key" ON "DeveloperAccessGrant"("grantCode");

-- CreateIndex
CREATE INDEX "DeveloperAccessGrant_developerId_idx" ON "DeveloperAccessGrant"("developerId");

-- CreateIndex
CREATE INDEX "DeveloperAccessGrant_scope_idx" ON "DeveloperAccessGrant"("scope");

-- CreateIndex
CREATE INDEX "DeveloperAccessGrant_status_idx" ON "DeveloperAccessGrant"("status");

-- CreateIndex
CREATE INDEX "DeveloperAccessGrant_expiresAt_idx" ON "DeveloperAccessGrant"("expiresAt");

-- CreateIndex
CREATE INDEX "SystemErrorLog_code_idx" ON "SystemErrorLog"("code");

-- CreateIndex
CREATE INDEX "SystemErrorLog_errorCategory_idx" ON "SystemErrorLog"("errorCategory");

-- CreateIndex
CREATE INDEX "SystemErrorLog_httpStatus_idx" ON "SystemErrorLog"("httpStatus");

-- CreateIndex
CREATE INDEX "SystemErrorLog_resolved_idx" ON "SystemErrorLog"("resolved");

-- CreateIndex
CREATE INDEX "SystemErrorLog_requestId_idx" ON "SystemErrorLog"("requestId");

-- CreateIndex
CREATE INDEX "SystemErrorLog_createdAt_idx" ON "SystemErrorLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfiguration_configKey_key" ON "SystemConfiguration"("configKey");

-- CreateIndex
CREATE INDEX "SystemConfiguration_category_idx" ON "SystemConfiguration"("category");

-- CreateIndex
CREATE UNIQUE INDEX "DentalRecord_recordNumber_key" ON "DentalRecord"("recordNumber");

-- CreateIndex
CREATE INDEX "DentalRecord_hospitalId_idx" ON "DentalRecord"("hospitalId");

-- CreateIndex
CREATE INDEX "DentalRecord_patientId_idx" ON "DentalRecord"("patientId");

-- CreateIndex
CREATE INDEX "DentalRecord_category_idx" ON "DentalRecord"("category");

-- CreateIndex
CREATE INDEX "DentalRecord_status_idx" ON "DentalRecord"("status");

-- CreateIndex
CREATE INDEX "DentalRecord_createdAt_idx" ON "DentalRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EyeClinicRecord_examNumber_key" ON "EyeClinicRecord"("examNumber");

-- CreateIndex
CREATE INDEX "EyeClinicRecord_hospitalId_idx" ON "EyeClinicRecord"("hospitalId");

-- CreateIndex
CREATE INDEX "EyeClinicRecord_patientId_idx" ON "EyeClinicRecord"("patientId");

-- CreateIndex
CREATE INDEX "EyeClinicRecord_ocularHypertensionFlag_idx" ON "EyeClinicRecord"("ocularHypertensionFlag");

-- CreateIndex
CREATE INDEX "EyeClinicRecord_status_idx" ON "EyeClinicRecord"("status");

-- CreateIndex
CREATE INDEX "EyeClinicRecord_createdAt_idx" ON "EyeClinicRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IcuMonitoringRecord_monitorCode_key" ON "IcuMonitoringRecord"("monitorCode");

-- CreateIndex
CREATE INDEX "IcuMonitoringRecord_hospitalId_idx" ON "IcuMonitoringRecord"("hospitalId");

-- CreateIndex
CREATE INDEX "IcuMonitoringRecord_patientId_idx" ON "IcuMonitoringRecord"("patientId");

-- CreateIndex
CREATE INDEX "IcuMonitoringRecord_alertLevel_idx" ON "IcuMonitoringRecord"("alertLevel");

-- CreateIndex
CREATE INDEX "IcuMonitoringRecord_isAcknowledged_idx" ON "IcuMonitoringRecord"("isAcknowledged");

-- CreateIndex
CREATE INDEX "IcuMonitoringRecord_recordedAt_idx" ON "IcuMonitoringRecord"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalSafetyOverride_overrideCode_key" ON "ClinicalSafetyOverride"("overrideCode");

-- CreateIndex
CREATE INDEX "ClinicalSafetyOverride_hospitalId_idx" ON "ClinicalSafetyOverride"("hospitalId");

-- CreateIndex
CREATE INDEX "ClinicalSafetyOverride_patientId_idx" ON "ClinicalSafetyOverride"("patientId");

-- CreateIndex
CREATE INDEX "ClinicalSafetyOverride_alertCategory_idx" ON "ClinicalSafetyOverride"("alertCategory");

-- CreateIndex
CREATE INDEX "ClinicalSafetyOverride_severity_idx" ON "ClinicalSafetyOverride"("severity");

-- CreateIndex
CREATE INDEX "ClinicalSafetyOverride_createdAt_idx" ON "ClinicalSafetyOverride"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiClinicalSuggestion_suggestionCode_key" ON "AiClinicalSuggestion"("suggestionCode");

-- CreateIndex
CREATE INDEX "AiClinicalSuggestion_hospitalId_idx" ON "AiClinicalSuggestion"("hospitalId");

-- CreateIndex
CREATE INDEX "AiClinicalSuggestion_patientId_idx" ON "AiClinicalSuggestion"("patientId");

-- CreateIndex
CREATE INDEX "AiClinicalSuggestion_assistantType_idx" ON "AiClinicalSuggestion"("assistantType");

-- CreateIndex
CREATE INDEX "AiClinicalSuggestion_workflowStatus_idx" ON "AiClinicalSuggestion"("workflowStatus");

-- CreateIndex
CREATE INDEX "AiClinicalSuggestion_riskLevel_idx" ON "AiClinicalSuggestion"("riskLevel");

-- CreateIndex
CREATE INDEX "AiClinicalSuggestion_createdAt_idx" ON "AiClinicalSuggestion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalMeeting_meetingCode_key" ON "HospitalMeeting"("meetingCode");

-- CreateIndex
CREATE INDEX "HospitalMeeting_hospitalId_idx" ON "HospitalMeeting"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalMeeting_status_idx" ON "HospitalMeeting"("status");

-- CreateIndex
CREATE INDEX "HospitalMeeting_scheduledStart_idx" ON "HospitalMeeting"("scheduledStart");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalDocument_documentCode_key" ON "HospitalDocument"("documentCode");

-- CreateIndex
CREATE INDEX "HospitalDocument_hospitalId_idx" ON "HospitalDocument"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalDocument_patientId_idx" ON "HospitalDocument"("patientId");

-- CreateIndex
CREATE INDEX "HospitalDocument_category_idx" ON "HospitalDocument"("category");

-- CreateIndex
CREATE INDEX "HospitalDocument_parentDocumentId_idx" ON "HospitalDocument"("parentDocumentId");

-- CreateIndex
CREATE INDEX "HospitalDocument_isDeleted_idx" ON "HospitalDocument"("isDeleted");

-- CreateIndex
CREATE INDEX "HospitalDocument_createdAt_idx" ON "HospitalDocument"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityTask_taskCode_key" ON "FacilityTask"("taskCode");

-- CreateIndex
CREATE INDEX "FacilityTask_hospitalId_idx" ON "FacilityTask"("hospitalId");

-- CreateIndex
CREATE INDEX "FacilityTask_category_idx" ON "FacilityTask"("category");

-- CreateIndex
CREATE INDEX "FacilityTask_status_idx" ON "FacilityTask"("status");

-- CreateIndex
CREATE INDEX "FacilityTask_priority_idx" ON "FacilityTask"("priority");

-- CreateIndex
CREATE INDEX "FacilityTask_createdAt_idx" ON "FacilityTask"("createdAt");

-- CreateIndex
CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalBranch" ADD CONSTRAINT "HospitalBranch_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalSetting" ADD CONSTRAINT "HospitalSetting_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalRoom" ADD CONSTRAINT "HospitalRoom_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalRoom" ADD CONSTRAINT "HospitalRoom_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "HospitalWard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalDepartment" ADD CONSTRAINT "HospitalDepartment_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalWard" ADD CONSTRAINT "HospitalWard_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalWard" ADD CONSTRAINT "HospitalWard_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "HospitalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalBed" ADD CONSTRAINT "HospitalBed_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HospitalRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalBed" ADD CONSTRAINT "HospitalBed_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalStaff" ADD CONSTRAINT "HospitalStaff_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalUnit" ADD CONSTRAINT "HospitalUnit_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalUnit" ADD CONSTRAINT "HospitalUnit_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "HospitalDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalPatientLocation" ADD CONSTRAINT "HospitalPatientLocation_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalPatientLocation" ADD CONSTRAINT "HospitalPatientLocation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalPatientLocation" ADD CONSTRAINT "HospitalPatientLocation_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "HospitalWard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalPatientLocation" ADD CONSTRAINT "HospitalPatientLocation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HospitalRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalPatientLocation" ADD CONSTRAINT "HospitalPatientLocation_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "HospitalBed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAdmission" ADD CONSTRAINT "HospitalAdmission_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAdmission" ADD CONSTRAINT "HospitalAdmission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAdmission" ADD CONSTRAINT "HospitalAdmission_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "HospitalWard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAdmission" ADD CONSTRAINT "HospitalAdmission_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HospitalRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAdmission" ADD CONSTRAINT "HospitalAdmission_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "HospitalBed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "LaboratorySample" ADD CONSTRAINT "LaboratorySample_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LaboratoryRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaboratoryTestResult" ADD CONSTRAINT "LaboratoryTestResult_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LaboratoryRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyOrder" ADD CONSTRAINT "RadiologyOrder_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "PatientEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyOrder" ADD CONSTRAINT "RadiologyOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DicomStudy" ADD CONSTRAINT "DicomStudy_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RadiologyOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyReport" ADD CONSTRAINT "RadiologyReport_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RadiologyOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientBill" ADD CONSTRAINT "PatientBill_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "PatientEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientBill" ADD CONSTRAINT "PatientBill_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "PatientBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPayment" ADD CONSTRAINT "PatientPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "PatientBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_billId_fkey" FOREIGN KEY ("billId") REFERENCES "PatientBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalCase" ADD CONSTRAINT "SurgicalCase_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "PatientEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalCase" ADD CONSTRAINT "SurgicalCase_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalCase" ADD CONSTRAINT "SurgicalCase_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "OperatingTheatre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalChecklist" ADD CONSTRAINT "SurgicalChecklist_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnesthesiaRecord" ADD CONSTRAINT "AnesthesiaRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacuRecord" ADD CONSTRAINT "PacuRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingRecord" ADD CONSTRAINT "NursingRecord_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "PatientEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingRecord" ADD CONSTRAINT "NursingRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "HospitalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMedicalRecord" ADD CONSTRAINT "PatientMedicalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientVitalSign" ADD CONSTRAINT "PatientVitalSign_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientVitalSign" ADD CONSTRAINT "PatientVitalSign_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "PatientEncounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMessage" ADD CONSTRAINT "TenantMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantLocationPing" ADD CONSTRAINT "TenantLocationPing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalFolder" ADD CONSTRAINT "MedicalFolder_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalFolder" ADD CONSTRAINT "MedicalFolder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderRetrievalRequest" ADD CONSTRAINT "FolderRetrievalRequest_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "MedicalFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderRetrievalRequest" ADD CONSTRAINT "FolderRetrievalRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderMovementLog" ADD CONSTRAINT "FolderMovementLog_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "MedicalFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpdQueueTicket" ADD CONSTRAINT "OpdQueueTicket_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpdQueueTicket" ADD CONSTRAINT "OpdQueueTicket_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "PatientEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpdQueueTicket" ADD CONSTRAINT "OpdQueueTicket_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbulanceDispatch" ADD CONSTRAINT "AmbulanceDispatch_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "Ambulance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyCase" ADD CONSTRAINT "EmergencyCase_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyCase" ADD CONSTRAINT "EmergencyCase_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "AmbulanceDispatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodUnit" ADD CONSTRAINT "BloodUnit_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "BloodDonor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodTransfusionRequest" ADD CONSTRAINT "BloodTransfusionRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodCrossMatch" ADD CONSTRAINT "BloodCrossMatch_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BloodTransfusionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodCrossMatch" ADD CONSTRAINT "BloodCrossMatch_bloodUnitId_fkey" FOREIGN KEY ("bloodUnitId") REFERENCES "BloodUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodTransfusionRecord" ADD CONSTRAINT "BloodTransfusionRecord_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BloodTransfusionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodTransfusionRecord" ADD CONSTRAINT "BloodTransfusionRecord_bloodUnitId_fkey" FOREIGN KEY ("bloodUnitId") REFERENCES "BloodUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorpseRecord" ADD CONSTRAINT "CorpseRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorpseRecord" ADD CONSTRAINT "CorpseRecord_chamberId_fkey" FOREIGN KEY ("chamberId") REFERENCES "MortuaryChamber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutopsyCase" ADD CONSTRAINT "AutopsyCase_corpseId_fkey" FOREIGN KEY ("corpseId") REFERENCES "CorpseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorpseRelease" ADD CONSTRAINT "CorpseRelease_corpseId_fkey" FOREIGN KEY ("corpseId") REFERENCES "CorpseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalWorkOrder" ADD CONSTRAINT "MedicalWorkOrder_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "MedicalEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentCalibration" ADD CONSTRAINT "EquipmentCalibration_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "MedicalEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorContract" ADD CONSTRAINT "VendorContract_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ProcurementVendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ProcurementVendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptNote" ADD CONSTRAINT "GoodsReceiptNote_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptNote" ADD CONSTRAINT "GoodsReceiptNote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ProcurementVendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GoodsReceiptNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES "PurchaseOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "DutyShiftRoster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveActionPlan" ADD CONSTRAINT "CorrectiveActionPlan_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "ClinicalIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveActionPlan" ADD CONSTRAINT "CorrectiveActionPlan_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "ClinicalAudit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NhiaClaimItem" ADD CONSTRAINT "NhiaClaimItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "NhiaClaimBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NhiaReconciliationVoucher" ADD CONSTRAINT "NhiaReconciliationVoucher_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "NhiaClaimBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationRecordItem" ADD CONSTRAINT "MigrationRecordItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "MigrationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceBreachEvent" ADD CONSTRAINT "GeofenceBreachEvent_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "FacilityGeofence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalRecord" ADD CONSTRAINT "DentalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EyeClinicRecord" ADD CONSTRAINT "EyeClinicRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcuMonitoringRecord" ADD CONSTRAINT "IcuMonitoringRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalSafetyOverride" ADD CONSTRAINT "ClinicalSafetyOverride_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiClinicalSuggestion" ADD CONSTRAINT "AiClinicalSuggestion_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

