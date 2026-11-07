"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
INPATIENT DEPARTMENT (IPD) & ADMISSION ROUTE DEFINITIONS
LOCATION: src/modules/admissions/routes/admissions.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();

const controller = require("../controllers/inpatient.controller");
const authMiddleware = require("../../../core/middleware/auth.middleware");
const authorizeRoles = require("../../../core/security/role.middleware");
const { ROLES, CLINICAL_ROLES, STAFF_ROLES, ADMIN_ROLES } = require("../../../config/roles");

const WARD_ADMIN_ROLES = [
    ...ADMIN_ROLES,
    ROLES.NURSE
];

const ADMISSION_ROLES = [
    ...ADMIN_ROLES,
    ROLES.DOCTOR,
    ROLES.SURGEON,
    ROLES.NURSE,
    ROLES.RECEPTIONIST
];

const NURSING_CHART_ROLES = [
    ...ADMIN_ROLES,
    ROLES.NURSE,
    ROLES.DOCTOR,
    ROLES.SURGEON
];

const DISCHARGE_ROLES = [
    ...ADMIN_ROLES,
    ROLES.DOCTOR,
    ROLES.SURGEON,
    ROLES.NURSE
];

// All IPD routes require active authentication
router.use(authMiddleware);

// --- 1. Ward & Bed Management ---
router.post(
    "/wards",
    authorizeRoles(...WARD_ADMIN_ROLES),
    controller.createWard
);

router.get(
    "/wards",
    authorizeRoles(...STAFF_ROLES),
    controller.getHospitalWards
);

router.post(
    "/rooms",
    authorizeRoles(...WARD_ADMIN_ROLES),
    controller.createRoom
);

router.post(
    "/beds",
    authorizeRoles(...WARD_ADMIN_ROLES),
    controller.createBed
);

router.get(
    "/wards/:id/bed-matrix",
    authorizeRoles(...STAFF_ROLES),
    controller.getWardBedMatrix
);

// --- 2. Inpatient Admission Workflows ---
router.post(
    "/admit",
    authorizeRoles(...ADMISSION_ROLES),
    controller.admitPatient
);

router.post(
    "/:id/transfer-bed",
    authorizeRoles(...NURSING_CHART_ROLES),
    controller.transferBed
);

router.get(
    "/active",
    authorizeRoles(...STAFF_ROLES),
    controller.getActiveAdmissions
);

router.get(
    "/dashboard",
    authorizeRoles(...CLINICAL_ROLES, ...ADMIN_ROLES),
    controller.getIpdDashboardTelemetry
);

router.get(
    "/stats",
    authorizeRoles(...CLINICAL_ROLES, ...ADMIN_ROLES),
    controller.getIpdDashboardTelemetry
);

// --- 3. Daily Nursing Charts & Rounding Notes ---
router.post(
    "/:id/nursing-charts",
    authorizeRoles(...NURSING_CHART_ROLES),
    controller.recordInpatientNursingChart
);

router.get(
    "/:id/nursing-charts",
    authorizeRoles(...STAFF_ROLES),
    controller.getAdmissionNursingCharts
);

// --- 4. Discharge Workflow ---
router.post(
    "/:id/discharge",
    authorizeRoles(...DISCHARGE_ROLES),
    controller.dischargePatient
);

// --- 5. Single Admission Lookup ---
router.get(
    "/:id",
    authorizeRoles(...STAFF_ROLES),
    controller.getAdmissionById
);

module.exports = router;
