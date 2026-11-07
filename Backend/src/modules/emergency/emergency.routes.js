"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
EMERGENCY & AMBULANCE ROUTES
Phase 12 Production Hardened - CommonJS Only
LOCATION: src/modules/emergency/emergency.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();
const controller = require("./emergency.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { ADMIN_ROLES, CLINICAL_ROLES, ROLES } = require("../../config/roles");

const EMERGENCY_ROLES = [
    ...ADMIN_ROLES,
    ...CLINICAL_ROLES,
    ROLES.RECEPTIONIST
];

router.use(authMiddleware);
router.use(authorizeRoles(...EMERGENCY_ROLES));

// Live Emergency Command Center Telemetry
router.get("/stats", controller.getEmergencyDashboardStats);
router.get("/telemetry", controller.getEmergencyDashboardStats);

// Fleet Management
router.get("/ambulances", controller.getAmbulances);
router.post("/ambulances", controller.registerAmbulance);
router.get("/ambulances/:id", controller.getAmbulanceById);
router.patch("/ambulances/:id/telemetry", controller.updateAmbulanceTelemetry);

// Dispatch Management
router.get("/dispatches", controller.getDispatches);
router.post("/dispatches", controller.createDispatch);
router.patch("/dispatches/:id/status", controller.updateDispatchStatus);

// Emergency Room Cases
router.get("/cases", controller.getEmergencyCases);
router.post("/cases", controller.registerEmergencyCase);
router.patch("/cases/:id", controller.updateEmergencyCase);

module.exports = router;
