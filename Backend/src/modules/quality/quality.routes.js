"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
QUALITY ASSURANCE & CLINICAL SAFETY - ROUTER
Phase 18 Production Hardened - CommonJS Only
LOCATION: src/modules/quality/quality.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();
const controller = require("./quality.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { STAFF_ROLES } = require("../../config/roles");

const QUALITY_ROLES = [
    ...STAFF_ROLES
];

router.use(authMiddleware);
router.use(authorizeRoles(...QUALITY_ROLES));

// Catalogs & Command Center Telemetry
router.get("/catalogs", controller.getCatalogs);
router.get("/stats", controller.getQualityStats);
router.get("/telemetry", controller.getQualityStats);

// Clinical Incidents & Adverse Events
router.post("/incidents", controller.reportIncident);
router.get("/incidents", controller.getIncidents);
router.patch("/incidents/:id/investigate", controller.investigateIncident);
router.patch("/incidents/:id/close", controller.closeIncident);

// Infection Prevention & Control (IPC)
router.post("/infection-control", controller.registerIpcCase);
router.get("/infection-control", controller.getIpcCases);
router.patch("/infection-control/:id/clear", controller.clearIpcCase);

// Clinical Audits
router.post("/audits", controller.createClinicalAudit);
router.get("/audits", controller.getClinicalAudits);

// Corrective & Preventive Action Plans (CAPA)
router.post("/capa", controller.createCapa);
router.get("/capa", controller.getCapaPlans);
router.patch("/capa/:id/verify", controller.verifyCapa);

// Patient Safety Alerts
router.post("/alerts", controller.broadcastSafetyAlert);
router.get("/alerts", controller.getSafetyAlerts);
router.post("/alerts/:id/acknowledge", controller.acknowledgeSafetyAlert);

module.exports = router;
