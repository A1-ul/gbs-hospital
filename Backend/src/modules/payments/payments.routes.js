"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
CENTRAL MULTI-GATEWAY PAYMENTS ROUTES
CommonJS Only
LOCATION: Backend/src/modules/payments/payments.routes.js
================================================================================
*/

const express = require("express");
const router = express.Router();

const controller = require("./payments.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { developerSecurityGuard } = require("../developer-control-center/services/developer-security-guard.middleware");
const { ROLES, ADMIN_ROLES } = require("../../config/roles");

const FINANCE_ROLES = [
    ROLES.DEVELOPER,
    ROLES.ADMINISTRATOR,
    ROLES.HOSPITAL_DIRECTOR,
    ROLES.ACCOUNTANT
];

const PAYMENT_INITIATOR_ROLES = [
    ...FINANCE_ROLES,
    ROLES.RECEPTIONIST,
    ROLES.PATIENT
];

// 1. Public Provider Capability Matrix (Zero Secrets Exposed)
router.get("/providers", controller.getProviders);

// 2. Signed Provider Webhooks (Authenticated via Cryptographic HMAC Signatures — Mounted Before JWT Auth)
router.post("/webhooks/:provider", controller.handleWebhook);

// 3. Authenticated Operational Payment Routes
router.use(authMiddleware);

router.post(
    "/initiate",
    authorizeRoles(...PAYMENT_INITIATOR_ROLES),
    controller.initiatePayment
);

router.get(
    "/transactions",
    authorizeRoles(...PAYMENT_INITIATOR_ROLES),
    controller.listTransactions
);

router.get(
    "/transactions/:reference",
    authorizeRoles(...PAYMENT_INITIATOR_ROLES),
    controller.getTransactionByRef
);

router.post(
    "/transactions/:reference/verify",
    authorizeRoles(...PAYMENT_INITIATOR_ROLES),
    controller.verifyTransaction
);

router.post(
    "/transactions/:reference/reconcile",
    authorizeRoles(...FINANCE_ROLES),
    controller.verifyTransaction
);

router.post(
    "/transactions/:reference/cancel",
    authorizeRoles(...PAYMENT_INITIATOR_ROLES),
    controller.cancelTransaction
);

router.post(
    "/transactions/:id/refund",
    authorizeRoles(...FINANCE_ROLES),
    controller.refundTransaction
);

router.get(
    "/receipts/:reference",
    authorizeRoles(...PAYMENT_INITIATOR_ROLES),
    controller.getOfficialReceipt
);

router.post(
    "/bank-deposits/submit",
    authorizeRoles(...PAYMENT_INITIATOR_ROLES),
    controller.submitBankDeposit
);

router.post(
    "/bank-deposits/:id/verify",
    authorizeRoles(...FINANCE_ROLES),
    controller.verifyBankDeposit
);

router.get(
    "/reports",
    authorizeRoles(...FINANCE_ROLES),
    controller.getPaymentReports
);

// 4. Hospital Administrator -> GBS Developer Subscriptions (Destination: 0554594193)
router.post(
    "/developer-subscriptions/initiate",
    authorizeRoles(...ADMIN_ROLES),
    controller.initiateDeveloperSubscription
);

router.post(
    "/developer-subscriptions/:id/confirm",
    developerSecurityGuard,
    controller.confirmDeveloperSubscription
);

// 5. Strictly Guarded Developer Payment & Webhook Administration Console
router.get(
    "/developer/overview",
    developerSecurityGuard,
    controller.getDeveloperOverview
);

router.get(
    "/developer/webhooks",
    developerSecurityGuard,
    controller.getDeveloperWebhooks
);

module.exports = router;
