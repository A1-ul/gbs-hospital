"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./eye-clinic.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { ROLES, ADMIN_ROLES } = require("../../config/roles");

const EYE_ACCESS_ROLES = [
    ...ADMIN_ROLES,
    ROLES.EYE_DOCTOR,
    ROLES.DOCTOR,
    ROLES.SURGEON,
    ROLES.NURSE
];

router.use(authMiddleware);

router.get("/telemetry", authorizeRoles(...EYE_ACCESS_ROLES), controller.getTelemetry);
router.get("/exams", authorizeRoles(...EYE_ACCESS_ROLES), controller.listExams);
router.post("/exams", authorizeRoles(...ADMIN_ROLES, ROLES.EYE_DOCTOR, ROLES.DOCTOR, ROLES.SURGEON), controller.createExam);
router.patch("/exams/:id", authorizeRoles(...ADMIN_ROLES, ROLES.EYE_DOCTOR, ROLES.DOCTOR, ROLES.SURGEON), controller.updateExam);
router.get("/patients/:patientId/history", authorizeRoles(...EYE_ACCESS_ROLES), controller.getPatientHistory);

module.exports = router;
