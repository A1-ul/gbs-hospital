"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
CLINICAL & OPD TRIAGE ROUTE DEFINITIONS
Includes Doctor Consultation, ICD-10 Diagnoses & Prescriptions
LOCATION: src/modules/clinical/routes/clinical.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();

const opdController = require("../controllers/opd-triage.controller");
const consultationController = require("../controllers/consultation.controller");
const authMiddleware = require("../../../core/middleware/auth.middleware");
const authorizeRoles = require("../../../core/security/role.middleware");
const { ROLES, CLINICAL_ROLES, STAFF_ROLES, ADMIN_ROLES } = require("../../../config/roles");

const OPD_CHECKIN_ROLES = [
    ...ADMIN_ROLES,
    ROLES.RECEPTIONIST,
    ROLES.NURSE
];

const TRIAGE_ROLES = [
    ...ADMIN_ROLES,
    ROLES.NURSE,
    ROLES.DOCTOR,
    ROLES.SURGEON,
    ROLES.DENTIST,
    ROLES.EYE_DOCTOR
];

const PHYSICIAN_ROLES = [
    ...ADMIN_ROLES,
    ROLES.DOCTOR,
    ROLES.SURGEON,
    ROLES.DENTIST,
    ROLES.EYE_DOCTOR
];

const CONSULTATION_ROLES = [
    ...ADMIN_ROLES,
    ...CLINICAL_ROLES,
    ROLES.RECEPTIONIST // can view/route
];

// All clinical endpoints require active authentication
router.use(authMiddleware);

// --- 1. OPD Queuing & Check-in ---
router.post(
    "/opd/check-in",
    authorizeRoles(...OPD_CHECKIN_ROLES),
    opdController.checkInPatient
);

router.post(
    "/check-in",
    authorizeRoles(...OPD_CHECKIN_ROLES),
    opdController.checkInPatient
);

// --- 2. Nurse Triage ---
router.get(
    "/triage/queue",
    authorizeRoles(...TRIAGE_ROLES),
    opdController.getNurseTriageQueue
);

router.post(
    "/triage/:id/vitals",
    authorizeRoles(...TRIAGE_ROLES),
    opdController.recordNurseTriage
);

router.get(
    "/nurse/dashboard",
    authorizeRoles(...TRIAGE_ROLES),
    opdController.getNurseDashboardTelemetry
);

router.get(
    "/nurse/dashboard-stats",
    authorizeRoles(...TRIAGE_ROLES),
    opdController.getNurseDashboardTelemetry
);

// --- 3. Clinical Catalogs & Standards (ICD-10, Medications, Lab Tests) ---
router.get(
    "/catalog/diagnoses",
    authorizeRoles(...STAFF_ROLES),
    consultationController.searchICD10Catalog
);

router.get(
    "/catalogs/icd10",
    authorizeRoles(...STAFF_ROLES),
    consultationController.searchICD10Catalog
);

router.get(
    "/catalog/medications",
    authorizeRoles(...STAFF_ROLES),
    consultationController.searchMedicationsCatalog
);

router.get(
    "/catalog/lab-tests",
    authorizeRoles(...STAFF_ROLES),
    consultationController.searchLabTestsCatalog
);

// --- 4. Doctor Queue & Room Flow ---
router.post(
    "/encounters/:id/assign-doctor",
    authorizeRoles(...TRIAGE_ROLES),
    opdController.assignDoctorAndRoom
);

router.post(
    "/encounters/:id/call-in",
    authorizeRoles(...CONSULTATION_ROLES),
    opdController.callPatientToDoctorRoom
);

router.get(
    "/doctor/queue",
    authorizeRoles(...CONSULTATION_ROLES),
    opdController.getDoctorWaitingQueue
);

router.get(
    "/doctor/dashboard",
    authorizeRoles(...PHYSICIAN_ROLES),
    consultationController.getDoctorDashboardTelemetry
);

router.get(
    "/doctor/dashboard-stats",
    authorizeRoles(...PHYSICIAN_ROLES),
    consultationController.getDoctorDashboardTelemetry
);

// --- 5. Doctor Clinical Consultation, ICD-10 Diagnosis, Prescriptions & Lab Requests ---
router.post(
    "/encounters/:id/consultation",
    authorizeRoles(...PHYSICIAN_ROLES),
    consultationController.recordDoctorConsultation
);

router.get(
    "/encounters/:id/consultation",
    authorizeRoles(...CONSULTATION_ROLES),
    consultationController.getConsultationDetails
);

router.post(
    "/encounters/:id/complete",
    authorizeRoles(...CONSULTATION_ROLES),
    opdController.completeConsultation
);

router.get(
    "/patients/:patientId/clinical-history",
    authorizeRoles(...CONSULTATION_ROLES),
    consultationController.getPatientClinicalHistory
);

router.get(
    "/encounters/:id",
    authorizeRoles(...STAFF_ROLES),
    opdController.getEncounterById
);

module.exports = router;
