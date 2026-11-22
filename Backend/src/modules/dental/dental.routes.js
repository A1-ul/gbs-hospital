"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./dental.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { ROLES, ADMIN_ROLES } = require("../../config/roles");

const DENTAL_ACCESS_ROLES = [
    ...ADMIN_ROLES,
    ROLES.DENTIST,
    ROLES.DOCTOR,
    ROLES.SURGEON,
    ROLES.NURSE
];

router.use(authMiddleware);

router.get("/telemetry", authorizeRoles(...DENTAL_ACCESS_ROLES), controller.getTelemetry);
router.get("/records", authorizeRoles(...DENTAL_ACCESS_ROLES), controller.listRecords);
router.post("/records", authorizeRoles(...ADMIN_ROLES, ROLES.DENTIST, ROLES.SURGEON, ROLES.DOCTOR), controller.createRecord);
router.patch("/records/:id", authorizeRoles(...ADMIN_ROLES, ROLES.DENTIST, ROLES.SURGEON, ROLES.DOCTOR), controller.updateRecord);
router.get("/patients/:patientId/odontogram", authorizeRoles(...DENTAL_ACCESS_ROLES), controller.getPatientOdontogram);

module.exports = router;
