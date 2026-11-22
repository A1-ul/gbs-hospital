"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./ai-clinical.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { ADMIN_ROLES, CLINICAL_ROLES } = require("../../config/roles");

const LICENSED_CLINICIAN_ROLES = [...ADMIN_ROLES, ...CLINICAL_ROLES];

router.use(authMiddleware);

router.get("/telemetry", authorizeRoles(...LICENSED_CLINICIAN_ROLES), controller.getTelemetry);
router.get("/suggestions", authorizeRoles(...LICENSED_CLINICIAN_ROLES), controller.listSuggestions);
router.post("/analyze", authorizeRoles(...LICENSED_CLINICIAN_ROLES), controller.analyze);
router.post("/suggestions/:id/review", authorizeRoles(...LICENSED_CLINICIAN_ROLES), controller.review);
router.post("/suggestions/:id/final-decision", authorizeRoles(...LICENSED_CLINICIAN_ROLES), controller.finalDecision);

module.exports = router;
