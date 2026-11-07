"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
GIS FACILITY TRACKING & FLOOR PLANS - ROUTER
Phase 21 Production Hardened - CommonJS Only
LOCATION: src/modules/facility-maps/facility-maps.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();
const controller = require("./facility-maps.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { STAFF_ROLES } = require("../../config/roles");

const GIS_ROLES = [
    ...STAFF_ROLES
];

router.use(authMiddleware);
router.use(authorizeRoles(...GIS_ROLES));

// Telemetry
router.get("/telemetry", controller.getTelemetry);
router.get("/stats", controller.getTelemetry);

// Geofencing
router.post("/geofences", controller.createGeofence);
router.get("/geofences", controller.getGeofences);
router.post("/ping", controller.evaluatePing);
router.get("/breaches", controller.getBreachEvents);

// Floor Plans
router.post("/floor-plans", controller.createFloorPlan);
router.get("/floor-plans", controller.getFloorPlans);
router.get("/floor-plans/:id", controller.getFloorPlanById);

module.exports = router;
