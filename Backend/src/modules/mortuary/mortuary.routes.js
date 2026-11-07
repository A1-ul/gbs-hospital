"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MORTUARY & DECEASED PATIENT SERVICES - ROUTER
Phase 14 Production Hardened - CommonJS Only
LOCATION: src/modules/mortuary/mortuary.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();
const controller = require("./mortuary.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { ADMIN_ROLES, CLINICAL_ROLES, ROLES } = require("../../config/roles");

const MORTUARY_ROLES = [
    ...ADMIN_ROLES,
    ...CLINICAL_ROLES,
    ROLES.RECEPTIONIST
];

router.use(authMiddleware);
router.use(authorizeRoles(...MORTUARY_ROLES));

// Real-Time Command Center Telemetry
router.get("/stats", controller.getTelemetry);
router.get("/telemetry", controller.getTelemetry);

// Cold Storage Vault Chambers
router.get("/chambers", controller.getChambers);
router.post("/chambers", controller.createChamber);
router.patch("/chambers/:id/temperature", controller.updateChamberTemperature);

// Corpse Intake & Cold Storage Inventory
router.get("/corpses", controller.getCorpseInventory);
router.post("/corpses", controller.registerCorpseIntake);
router.get("/corpses/:id", controller.getCorpseById);

// Autopsy / Post-Mortem Case Management
router.post("/autopsies", controller.scheduleAutopsy);
router.post("/autopsies/:id/complete", controller.completeAutopsy);

// Deceased Release & Family Handover Protocol
router.post("/releases", controller.releaseCorpse);

module.exports = router;
