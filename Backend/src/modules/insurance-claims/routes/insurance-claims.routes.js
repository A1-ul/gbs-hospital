"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
NHIA / NHIS CLAIMS & E-CLAIMS ROUTER
Phase 19 Production Hardened - CommonJS Only
LOCATION: src/modules/insurance-claims/routes/insurance-claims.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();
const controller = require("../controllers/insurance-claims.controller");
const authMiddleware = require("../../../core/middleware/auth.middleware");
const authorizeRoles = require("../../../core/security/role.middleware");
const { STAFF_ROLES } = require("../../../config/roles");

const CLAIMS_ROLES = [
    ...STAFF_ROLES
];

router.use(authMiddleware);
router.use(authorizeRoles(...CLAIMS_ROLES));

// Catalogs & Command Center Telemetry
router.get("/catalogs", controller.getCatalogs);
router.get("/stats", controller.getTelemetry);
router.get("/telemetry", controller.getTelemetry);

// NHIS Member Eligibility
router.get("/eligibility/:nhisNumber", controller.checkEligibility);
router.post("/eligibility/check", controller.checkEligibility);
router.post("/members", controller.registerPolicy);

// Batches Management
router.post("/batches", controller.createBatch);
router.get("/batches", controller.getBatches);
router.get("/batches/:id", controller.getBatchById);

// Batch Claims
router.post("/batches/:id/claims", controller.addClaim);
router.get("/batches/:id/claims", controller.getBatchClaims);

// Automated Vetting & E-Claims Generation
router.post("/batches/:id/vet", controller.runVetting);
router.get("/batches/:id/eclaims-payload", controller.generateEClaims);
router.post("/batches/:id/submit", controller.submitBatch);

// Electronic Adjudication & Reconciliation
router.post("/batches/:id/adjudicate", controller.processAdjudication);
router.post("/batches/:id/reconcile-voucher", controller.generateVoucher);

// Appeals
router.patch("/claims/:claimId/appeal", controller.appealClaim);

module.exports = router;
