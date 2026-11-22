"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./icu.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { ROLES, ADMIN_ROLES } = require("../../config/roles");

const ICU_CLINICAL_ROLES = [
    ...ADMIN_ROLES,
    ROLES.DOCTOR,
    ROLES.SURGEON,
    ROLES.NURSE
];

router.use(authMiddleware);

router.get("/telemetry", authorizeRoles(...ICU_CLINICAL_ROLES), controller.getTelemetry);
router.get("/monitors", authorizeRoles(...ICU_CLINICAL_ROLES), controller.listMonitors);
router.post("/monitors", authorizeRoles(...ICU_CLINICAL_ROLES), controller.recordVitals);
router.patch("/monitors/:id/acknowledge", authorizeRoles(...ICU_CLINICAL_ROLES), controller.acknowledgeAlert);
router.get("/patients/:patientId/trends", authorizeRoles(...ICU_CLINICAL_ROLES), controller.getPatientTrends);

module.exports = router;
