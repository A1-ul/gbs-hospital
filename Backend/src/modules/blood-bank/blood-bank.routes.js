"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BLOOD BANK & TRANSFUSION SERVICES ROUTES
Phase 13 Production Hardened - CommonJS Only
LOCATION: src/modules/blood-bank/blood-bank.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();
const controller = require("./blood-bank.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { ADMIN_ROLES, CLINICAL_ROLES } = require("../../config/roles");

const BLOOD_BANK_ROLES = [
    ...ADMIN_ROLES,
    ...CLINICAL_ROLES
];

router.use(authMiddleware);
router.use(authorizeRoles(...BLOOD_BANK_ROLES));

// Real-Time Command Center Telemetry & Inventory Stats
router.get("/stats", controller.getTelemetry);
router.get("/telemetry", controller.getTelemetry);

// Blood Donor Registry & Pre-donation Screening
router.get("/donors", controller.getDonors);
router.post("/donors", controller.registerDonor);
router.get("/donors/:id", controller.getDonorById);

// Blood Bag Collection & Cold-Chain Inventory
router.get("/units", controller.getInventory);
router.get("/inventory", controller.getInventory);
router.post("/units", controller.collectBloodUnit);
router.post("/units/:id/screening", controller.recordScreeningResults);
router.patch("/units/:id/temperature", controller.updateStorageTemperature);

// Transfusion Requests & Cross-Matching Compatibility
router.get("/requests", controller.getTransfusionRequests);
router.post("/requests", controller.createTransfusionRequest);
router.post("/cross-match", controller.performCrossMatch);

// Bedside Transfusion & Hemovigilance
router.post("/transfusions/start", controller.startTransfusion);
router.post("/transfusions/:id/complete", controller.completeTransfusion);
router.post("/transfusions/:id/adverse-reaction", controller.recordAdverseReaction);

module.exports = router;
