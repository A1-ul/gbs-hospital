"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
LABORATORY & PATHOLOGY ROUTE DEFINITIONS
LOCATION: src/modules/laboratory/routes/laboratory.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();

const controller = require("../controllers/laboratory.controller");
const authMiddleware = require("../../../core/middleware/auth.middleware");
const authorizeRoles = require("../../../core/security/role.middleware");
const { ROLES, CLINICAL_ROLES, STAFF_ROLES, ADMIN_ROLES } = require("../../../config/roles");

const LAB_OPERATOR_ROLES = [
    ...ADMIN_ROLES,
    ROLES.LAB_TECHNICIAN
];

const CLINICAL_ORDER_ROLES = [
    ...ADMIN_ROLES,
    ROLES.DOCTOR,
    ROLES.SURGEON,
    ROLES.NURSE,
    ROLES.LAB_TECHNICIAN
];

const PHLEBOTOMY_ROLES = [
    ...ADMIN_ROLES,
    ROLES.NURSE,
    ROLES.LAB_TECHNICIAN,
    ROLES.DOCTOR
];

const VERIFICATION_ROLES = [
    ...ADMIN_ROLES,
    ROLES.LAB_TECHNICIAN,
    ROLES.DOCTOR,
    ROLES.SURGEON
];

// All lab operations require authentication
router.use(authMiddleware);

// --- 1. Laboratory Diagnostic Ordering & Query ---
router.post(
    "/requests",
    authorizeRoles(...CLINICAL_ORDER_ROLES),
    controller.createLabRequest
);

router.get(
    "/requests",
    authorizeRoles(...CLINICAL_ROLES, ...ADMIN_ROLES),
    controller.getLabRequests
);

router.get(
    "/requests/:id",
    authorizeRoles(...CLINICAL_ROLES, ...ADMIN_ROLES),
    controller.getLabRequestById
);

// --- 2. Specimen Collection & Barcode Labeling ---
router.post(
    "/requests/:id/collect-sample",
    authorizeRoles(...PHLEBOTOMY_ROLES),
    controller.collectSpecimen
);

// --- 3. Specimen Lab Accessioning ---
router.post(
    "/samples/:barcode/receive",
    authorizeRoles(...LAB_OPERATOR_ROLES),
    controller.receiveSpecimenInLab
);

// --- 4. Result Recording & Panic Value Analysis ---
router.post(
    "/requests/:id/results",
    authorizeRoles(...LAB_OPERATOR_ROLES),
    controller.enterTestResults
);

// --- 5. Clinical Verification & Release ---
router.post(
    "/requests/:id/verify",
    authorizeRoles(...VERIFICATION_ROLES),
    controller.verifyAndReleaseResults
);

// --- 6. Real-time Telemetry & Statistics ---
router.get(
    "/dashboard/telemetry",
    authorizeRoles(...CLINICAL_ROLES, ...ADMIN_ROLES),
    controller.getLaboratoryDashboardTelemetry
);

router.get(
    "/stats",
    authorizeRoles(...CLINICAL_ROLES, ...ADMIN_ROLES),
    controller.getLaboratoryDashboardTelemetry
);

module.exports = router;
