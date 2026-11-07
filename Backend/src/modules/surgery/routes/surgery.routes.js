"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
SURGERY, OPERATING THEATRE & PACU ROUTE DEFINITIONS
LOCATION: src/modules/surgery/routes/surgery.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();

const controller = require("../controllers/surgery.controller");
const authMiddleware = require("../../../core/middleware/auth.middleware");
const authorizeRoles = require("../../../core/security/role.middleware");
const { ROLES, ADMIN_ROLES, CLINICAL_ROLES } = require("../../../config/roles");

const SURGICAL_CLINICAL_ROLES = [
    ...ADMIN_ROLES,
    ROLES.SURGEON,
    ROLES.DOCTOR,
    ROLES.NURSE
];

const SURGEON_ONLY_ROLES = [
    ...ADMIN_ROLES,
    ROLES.SURGEON,
    ROLES.DOCTOR
];

const PACU_STAFF_ROLES = [
    ...ADMIN_ROLES,
    ROLES.NURSE,
    ROLES.SURGEON,
    ROLES.DOCTOR
];

const GENERAL_VIEW_ROLES = [
    ...ADMIN_ROLES,
    ...CLINICAL_ROLES
];

// All surgery operations require authentication
router.use(authMiddleware);

// --- 1. Surgical Scheduling & Case Booking ---
router.post(
    "/cases",
    authorizeRoles(...SURGICAL_CLINICAL_ROLES),
    controller.createSurgicalCase
);

router.get(
    "/cases",
    authorizeRoles(...GENERAL_VIEW_ROLES),
    controller.getSurgicalCases
);

router.get(
    "/cases/:id",
    authorizeRoles(...GENERAL_VIEW_ROLES),
    controller.getSurgicalCaseById
);

router.patch(
    "/cases/:id/status",
    authorizeRoles(...SURGICAL_CLINICAL_ROLES),
    controller.updateSurgicalCaseStatus
);

// --- 2. WHO Surgical Safety Checklist (Sign-In, Time-Out, Sign-Out) ---
router.post(
    "/cases/:id/checklist",
    authorizeRoles(...SURGICAL_CLINICAL_ROLES),
    controller.updateSurgicalChecklist
);

router.patch(
    "/cases/:id/checklist",
    authorizeRoles(...SURGICAL_CLINICAL_ROLES),
    controller.updateSurgicalChecklist
);

// --- 3. Anesthesia Protocol & Intra-Operative Management ---
router.post(
    "/cases/:id/anesthesia",
    authorizeRoles(...SURGICAL_CLINICAL_ROLES),
    controller.recordAnesthesia
);

router.patch(
    "/cases/:id/anesthesia",
    authorizeRoles(...SURGICAL_CLINICAL_ROLES),
    controller.recordAnesthesia
);

// --- 4. Operative Report & Findings (Surgeon Documentation) ---
router.post(
    "/cases/:id/operative-report",
    authorizeRoles(...SURGEON_ONLY_ROLES),
    controller.recordOperativeReport
);

router.patch(
    "/cases/:id/operative-report",
    authorizeRoles(...SURGEON_ONLY_ROLES),
    controller.recordOperativeReport
);

// --- 5. PACU Post-Anesthesia Recovery (Modified Aldrete Scoring) ---
router.post(
    "/cases/:id/pacu",
    authorizeRoles(...PACU_STAFF_ROLES),
    controller.recordPacuRecovery
);

router.patch(
    "/cases/:id/pacu",
    authorizeRoles(...PACU_STAFF_ROLES),
    controller.recordPacuRecovery
);

// --- 6. Operating Theatres Management & Telemetry ---
router.get(
    "/theatres",
    authorizeRoles(...GENERAL_VIEW_ROLES),
    controller.getOperatingTheatres
);

router.post(
    "/theatres/seed",
    authorizeRoles(...ADMIN_ROLES),
    controller.seedOperatingTheatres
);

router.get(
    "/catalog",
    authorizeRoles(...GENERAL_VIEW_ROLES),
    controller.getSurgicalCatalog
);

router.post(
    "/catalog/seed",
    authorizeRoles(...ADMIN_ROLES),
    controller.seedSurgicalCatalog
);

router.get(
    "/telemetry",
    authorizeRoles(...GENERAL_VIEW_ROLES),
    controller.getSurgeryDashboardTelemetry
);

router.get(
    "/stats",
    authorizeRoles(...GENERAL_VIEW_ROLES),
    controller.getSurgeryDashboardTelemetry
);

// --- Direct root-level convenience aliases ---
router.post(
    "/",
    authorizeRoles(...SURGICAL_CLINICAL_ROLES),
    controller.createSurgicalCase
);

router.get(
    "/",
    authorizeRoles(...GENERAL_VIEW_ROLES),
    controller.getSurgicalCases
);

router.get(
    "/:id",
    authorizeRoles(...GENERAL_VIEW_ROLES),
    controller.getSurgicalCaseById
);

router.patch(
    "/:id/status",
    authorizeRoles(...SURGICAL_CLINICAL_ROLES),
    controller.updateSurgicalCaseStatus
);

router.post(
    "/:id/checklist",
    authorizeRoles(...SURGICAL_CLINICAL_ROLES),
    controller.updateSurgicalChecklist
);

router.patch(
    "/:id/checklist",
    authorizeRoles(...SURGICAL_CLINICAL_ROLES),
    controller.updateSurgicalChecklist
);

router.post(
    "/:id/anesthesia",
    authorizeRoles(...SURGICAL_CLINICAL_ROLES),
    controller.recordAnesthesia
);

router.patch(
    "/:id/anesthesia",
    authorizeRoles(...SURGICAL_CLINICAL_ROLES),
    controller.recordAnesthesia
);

router.post(
    "/:id/operative-report",
    authorizeRoles(...SURGEON_ONLY_ROLES),
    controller.recordOperativeReport
);

router.patch(
    "/:id/operative-report",
    authorizeRoles(...SURGEON_ONLY_ROLES),
    controller.recordOperativeReport
);

router.post(
    "/:id/pacu",
    authorizeRoles(...PACU_STAFF_ROLES),
    controller.recordPacuRecovery
);

router.patch(
    "/:id/pacu",
    authorizeRoles(...PACU_STAFF_ROLES),
    controller.recordPacuRecovery
);

module.exports = router;
