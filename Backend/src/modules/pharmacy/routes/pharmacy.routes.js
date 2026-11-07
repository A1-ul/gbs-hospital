"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHARMACY & INVENTORY ROUTE DEFINITIONS
LOCATION: src/modules/pharmacy/routes/pharmacy.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();

const controller = require("../controllers/pharmacy.controller");
const authMiddleware = require("../../../core/middleware/auth.middleware");
const authorizeRoles = require("../../../core/security/role.middleware");
const { ROLES, CLINICAL_ROLES, STAFF_ROLES, ADMIN_ROLES } = require("../../../config/roles");

const PHARMACY_OPERATOR_ROLES = [
    ...ADMIN_ROLES,
    ROLES.PHARMACIST
];

const CLINICAL_VIEW_ROLES = [
    ...ADMIN_ROLES,
    ...CLINICAL_ROLES
];

// All pharmacy operations require authentication
router.use(authMiddleware);

// --- 1. Formulary / Medication Catalog ---
router.post(
    "/items",
    authorizeRoles(...PHARMACY_OPERATOR_ROLES),
    controller.createPharmacyItem
);

router.get(
    "/items",
    authorizeRoles(...CLINICAL_VIEW_ROLES),
    controller.getPharmacyItems
);

router.get(
    "/items/:id",
    authorizeRoles(...CLINICAL_VIEW_ROLES),
    controller.getPharmacyItemById
);

// --- 2. Batch Delivery & Goods Receipt ---
router.post(
    "/batches",
    authorizeRoles(...PHARMACY_OPERATOR_ROLES),
    controller.receiveBatchStock
);

// --- 3. Inventory Stock Adjustment & Audit ---
router.post(
    "/stock/adjust",
    authorizeRoles(...PHARMACY_OPERATOR_ROLES),
    controller.adjustStock
);

// --- 4. Electronic Prescription Dispensing Workflow ---
router.get(
    "/prescriptions/pending",
    authorizeRoles(...CLINICAL_VIEW_ROLES),
    controller.getPendingPrescriptions
);

router.post(
    "/prescriptions/:id/dispense",
    authorizeRoles(...PHARMACY_OPERATOR_ROLES),
    controller.dispensePrescription
);

router.get(
    "/dispenses",
    authorizeRoles(...CLINICAL_VIEW_ROLES),
    controller.getDispenseHistory
);

// --- 5. Alerts & Expiry Monitoring ---
router.get(
    "/alerts/expiry",
    authorizeRoles(...PHARMACY_OPERATOR_ROLES),
    controller.getExpiryAlerts
);

router.get(
    "/alerts/low-stock",
    authorizeRoles(...PHARMACY_OPERATOR_ROLES),
    controller.getLowStockAlerts
);

// --- 6. Pharmacist Dashboard Telemetry ---
router.get(
    "/dashboard/telemetry",
    authorizeRoles(...CLINICAL_VIEW_ROLES),
    controller.getPharmacistDashboardTelemetry
);

router.get(
    "/stats",
    authorizeRoles(...CLINICAL_VIEW_ROLES),
    controller.getPharmacistDashboardTelemetry
);

module.exports = router;
