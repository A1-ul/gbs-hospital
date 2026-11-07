"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
RADIOLOGY & PACS ROUTE DEFINITIONS
LOCATION: src/modules/radiology/routes/radiology.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();

const controller = require("../controllers/radiology.controller");
const authMiddleware = require("../../../core/middleware/auth.middleware");
const authorizeRoles = require("../../../core/security/role.middleware");
const { ROLES, CLINICAL_ROLES, ADMIN_ROLES } = require("../../../config/roles");

const RADIOLOGY_ORDER_ROLES = [
    ...ADMIN_ROLES,
    ROLES.DOCTOR,
    ROLES.SURGEON,
    ROLES.DENTIST,
    ROLES.EYE_DOCTOR,
    ROLES.RADIOLOGIST,
    ROLES.NURSE
];

const RADIOLOGY_ACQUISITION_ROLES = [
    ...ADMIN_ROLES,
    ROLES.RADIOLOGIST,
    ROLES.NURSE,
    ROLES.LAB_TECHNICIAN,
    ROLES.DOCTOR
];

const RADIOLOGY_REPORTING_ROLES = [
    ...ADMIN_ROLES,
    ROLES.RADIOLOGIST,
    ROLES.DOCTOR,
    ROLES.SURGEON
];

const RADIOLOGY_VIEWING_ROLES = [
    ...CLINICAL_ROLES,
    ...ADMIN_ROLES
];

// All radiology operations require authentication
router.use(authMiddleware);

// --- 1. Radiology Order Lifecycle ---
router.post(
    "/orders",
    authorizeRoles(...RADIOLOGY_ORDER_ROLES),
    controller.createRadiologyOrder
);

router.get(
    "/orders",
    authorizeRoles(...RADIOLOGY_VIEWING_ROLES),
    controller.getRadiologyOrders
);

router.get(
    "/orders/:id",
    authorizeRoles(...RADIOLOGY_VIEWING_ROLES),
    controller.getRadiologyOrderById
);

router.patch(
    "/orders/:id/schedule",
    authorizeRoles(...RADIOLOGY_ACQUISITION_ROLES),
    controller.scheduleRadiologyOrder
);

// --- 2. DICOM Image Acquisition & PACS Ingestion ---
router.post(
    "/studies",
    authorizeRoles(...RADIOLOGY_ACQUISITION_ROLES),
    controller.acquireDicomStudy
);

router.post(
    "/orders/:id/acquire",
    authorizeRoles(...RADIOLOGY_ACQUISITION_ROLES),
    controller.acquireDicomStudy
);

router.get(
    "/studies/:uid",
    authorizeRoles(...RADIOLOGY_VIEWING_ROLES),
    controller.getPacsStudyDossier
);

// --- 3. Diagnostic Reporting & Verification ---
router.post(
    "/reports",
    authorizeRoles(...RADIOLOGY_REPORTING_ROLES),
    controller.authorRadiologyReport
);

router.post(
    "/orders/:id/report",
    authorizeRoles(...RADIOLOGY_REPORTING_ROLES),
    controller.authorRadiologyReport
);

router.patch(
    "/reports/:id/verify",
    authorizeRoles(...RADIOLOGY_REPORTING_ROLES),
    controller.verifyRadiologyReport
);

// --- 4. PACS Telemetry & Reference Catalog ---
router.get(
    "/telemetry",
    authorizeRoles(...RADIOLOGY_VIEWING_ROLES),
    controller.getRadiologyDashboardTelemetry
);

router.get(
    "/stats",
    authorizeRoles(...RADIOLOGY_VIEWING_ROLES),
    controller.getRadiologyDashboardTelemetry
);

router.get(
    "/dashboard",
    authorizeRoles(...RADIOLOGY_VIEWING_ROLES),
    controller.getRadiologyDashboardTelemetry
);

router.post(
    "/catalog/seed",
    authorizeRoles(...ADMIN_ROLES),
    controller.seedRadiologyCatalog
);

module.exports = router;
