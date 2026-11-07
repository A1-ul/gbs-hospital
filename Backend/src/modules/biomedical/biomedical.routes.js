"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BIOMEDICAL ENGINEERING - ROUTER
Phase 15 Production Hardened - CommonJS Only
LOCATION: src/modules/biomedical/biomedical.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();
const controller = require("./biomedical.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { ADMIN_ROLES, CLINICAL_ROLES, ROLES } = require("../../config/roles");

const BIOMEDICAL_ROLES = [
    ...ADMIN_ROLES,
    ...CLINICAL_ROLES,
    ROLES.RECEPTIONIST,
    ROLES.FOLDER_RETRIEVER
];

router.use(authMiddleware);
router.use(authorizeRoles(...BIOMEDICAL_ROLES));

// Catalogs & Real-time Command Center Telemetry
router.get("/catalogs", controller.getCatalogs);
router.get("/stats", controller.getBiomedicalStats);
router.get("/telemetry", controller.getBiomedicalStats);

// Medical Equipment Asset Management
router.post("/equipment", controller.registerEquipment);
router.get("/equipment", controller.getEquipmentList);
router.get("/equipment/:id", controller.getEquipmentById);
router.patch("/equipment/:id/status", controller.updateEquipmentStatus);
router.post("/equipment/:id/safety-override", controller.recordSafetyOverride);

// Work Orders & Breakdown Maintenance
router.post("/work-orders", controller.createWorkOrder);
router.get("/work-orders", controller.getWorkOrders);
router.patch("/work-orders/:id", controller.updateWorkOrder);
router.post("/work-orders/:id/complete", controller.completeWorkOrder);

// Metrology Calibration Certifications
router.post("/calibrations", controller.recordCalibration);

module.exports = router;
