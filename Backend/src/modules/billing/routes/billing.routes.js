"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BILLING & FINANCIAL ROUTE DEFINITIONS
LOCATION: src/modules/billing/routes/billing.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();

const controller = require("../controllers/billing.controller");
const authMiddleware = require("../../../core/middleware/auth.middleware");
const authorizeRoles = require("../../../core/security/role.middleware");
const { ROLES, ADMIN_ROLES, CLINICAL_ROLES } = require("../../../config/roles");

const BILLING_OFFICER_ROLES = [
    ...ADMIN_ROLES,
    ROLES.ACCOUNTANT,
    ROLES.RECEPTIONIST,
    ROLES.DOCTOR,
    ROLES.SURGEON
];

const CASHIER_ROLES = [
    ...ADMIN_ROLES,
    ROLES.ACCOUNTANT,
    ROLES.RECEPTIONIST
];

const FINANCE_VIEW_ROLES = [
    ...ADMIN_ROLES,
    ROLES.ACCOUNTANT,
    ROLES.HOSPITAL_DIRECTOR,
    ROLES.RECEPTIONIST,
    ...CLINICAL_ROLES
];

// All billing operations require authentication
router.use(authMiddleware);

// --- 1. Patient Invoicing & Bill Management ---
router.post(
    "/bills",
    authorizeRoles(...BILLING_OFFICER_ROLES),
    controller.createBill
);

router.post(
    "/encounters/:encounterId/generate-bill",
    authorizeRoles(...BILLING_OFFICER_ROLES),
    controller.generateBillFromEncounter
);

router.get(
    "/bills",
    authorizeRoles(...FINANCE_VIEW_ROLES),
    controller.getBills
);

router.get(
    "/bills/:id",
    authorizeRoles(...FINANCE_VIEW_ROLES),
    controller.getBillById
);

// --- 2. Revenue Collection & Sequential Receipts ---
router.post(
    "/payments",
    authorizeRoles(...CASHIER_ROLES),
    controller.processPayment
);

router.post(
    "/bills/:id/pay",
    authorizeRoles(...CASHIER_ROLES),
    controller.processPayment
);

// --- 3. NHIS & Private Insurance Claims ---
router.post(
    "/claims",
    authorizeRoles(...CASHIER_ROLES),
    controller.createInsuranceClaim
);

router.patch(
    "/claims/:id/status",
    authorizeRoles(...CASHIER_ROLES),
    controller.updateClaimStatus
);

// --- 4. Finance Command Center Telemetry & Fee Schedule ---
router.get(
    "/telemetry",
    authorizeRoles(...FINANCE_VIEW_ROLES),
    controller.getBillingDashboardTelemetry
);

router.get(
    "/stats",
    authorizeRoles(...FINANCE_VIEW_ROLES),
    controller.getBillingDashboardTelemetry
);

router.get(
    "/dashboard",
    authorizeRoles(...FINANCE_VIEW_ROLES),
    controller.getBillingDashboardTelemetry
);

router.post(
    "/tariffs/seed",
    authorizeRoles(...ADMIN_ROLES),
    controller.seedBillingTariffCatalog
);

module.exports = router;
