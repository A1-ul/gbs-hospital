"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./clinical-safety.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { ADMIN_ROLES, CLINICAL_ROLES } = require("../../config/roles");

const SAFETY_CLINICAL_ROLES = [...ADMIN_ROLES, ...CLINICAL_ROLES];

router.use(authMiddleware);

router.get("/guardrails-status", controller.getGuardrailsStatus);
router.post("/guardrails/toggle", controller.attemptToggleGuardrail);

router.get("/patients/:patientId/allergies", authorizeRoles(...SAFETY_CLINICAL_ROLES), controller.getPatientAllergies);
router.post("/patients/:patientId/allergies", authorizeRoles(...SAFETY_CLINICAL_ROLES), controller.recordPatientAllergy);

router.post("/check", authorizeRoles(...SAFETY_CLINICAL_ROLES), controller.checkMedicationSafety);

router.get("/overrides", authorizeRoles(...SAFETY_CLINICAL_ROLES), controller.listOverrides);
router.post("/overrides", authorizeRoles(...SAFETY_CLINICAL_ROLES), controller.recordOverride);

module.exports = router;
