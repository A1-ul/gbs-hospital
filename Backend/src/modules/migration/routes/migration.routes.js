"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MIGRATION SERVICE MODULE - ROUTER
Phase 20 Production Hardened - CommonJS Only
LOCATION: src/modules/migration/routes/migration.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();
const controller = require("../controllers/migration.controller");
const authMiddleware = require("../../../core/middleware/auth.middleware");
const authorizeRoles = require("../../../core/security/role.middleware");
const { STAFF_ROLES } = require("../../../config/roles");

const MIGRATION_ROLES = [
    ...STAFF_ROLES
];

router.use(authMiddleware);
router.use(authorizeRoles(...MIGRATION_ROLES));

// Catalogs & Real-time Telemetry
router.get("/catalogs", controller.getCatalogs);
router.get("/stats", controller.getTelemetry);
router.get("/telemetry", controller.getTelemetry);

// Migration Jobs Lifecycle
router.post("/jobs", controller.initializeJob);
router.get("/jobs", controller.getJobs);
router.get("/jobs/:jobId", controller.getJobById);
router.post("/jobs/:jobId/mapping", controller.applyMapping);
router.post("/jobs/:jobId/approve", controller.approveJob);
router.post("/jobs/:jobId/execute", controller.executeImport);
router.post("/jobs/:jobId/rollback", controller.rollbackJob);

// Reusable Mapping Templates
router.post("/templates", controller.saveTemplate);
router.get("/templates", controller.getTemplates);

module.exports = router;
