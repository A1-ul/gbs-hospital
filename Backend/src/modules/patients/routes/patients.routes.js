"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PATIENT MANAGEMENT & MPI ROUTES
LOCATION: src/modules/patients/routes/patients.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();

const controller = require("../controllers/patient.controller");
const authMiddleware = require("../../../core/middleware/auth.middleware");
const authorizeRoles = require("../../../core/security/role.middleware");
const { ROLES, CLINICAL_ROLES, STAFF_ROLES, ADMIN_ROLES } = require("../../../config/roles");

const PATIENT_REGISTRATION_ROLES = [
    ...ADMIN_ROLES,
    ROLES.RECEPTIONIST,
    ROLES.NURSE,
    ROLES.FOLDER_RETRIEVER
];

const PATIENT_VIEW_ROLES = [
    ...ADMIN_ROLES,
    ...CLINICAL_ROLES,
    ...STAFF_ROLES,
    ROLES.FOLDER_RETRIEVER,
    ROLES.PATIENT
];

// All routes require authentication
router.use(authMiddleware);

// Patient Registration into MPI
router.post(
    "/register",
    authorizeRoles(...PATIENT_REGISTRATION_ROLES),
    controller.registerPatient
);

router.post(
    "/",
    authorizeRoles(...PATIENT_REGISTRATION_ROLES),
    controller.registerPatient
);

// Master Patient Index (MPI) Search
router.get(
    "/search",
    authorizeRoles(...PATIENT_VIEW_ROLES),
    controller.searchMPI
);

router.get(
    "/mpi/search",
    authorizeRoles(...PATIENT_VIEW_ROLES),
    controller.searchMPI
);

router.get(
    "/",
    authorizeRoles(...PATIENT_VIEW_ROLES),
    controller.searchMPI
);

// Patient Role Personal Dashboard
router.get(
    "/:id/dashboard",
    authorizeRoles(...PATIENT_VIEW_ROLES),
    controller.getPatientDashboard
);

// Get Patient by ID or MRN
router.get(
    "/:id",
    authorizeRoles(...PATIENT_VIEW_ROLES),
    controller.getPatientById
);

// Update Patient
router.put(
    "/:id",
    authorizeRoles(...PATIENT_REGISTRATION_ROLES),
    controller.updatePatient
);

module.exports = router;
