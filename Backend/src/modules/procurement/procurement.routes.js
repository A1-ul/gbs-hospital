"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PROCUREMENT & SUPPLY CHAIN - ROUTER
Phase 16 Production Hardened - CommonJS Only
LOCATION: src/modules/procurement/procurement.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();
const controller = require("./procurement.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { STAFF_ROLES, ADMIN_ROLES, ROLES } = require("../../config/roles");

const PROCUREMENT_ROLES = [
    ...STAFF_ROLES
];

router.use(authMiddleware);
router.use(authorizeRoles(...PROCUREMENT_ROLES));

// Catalogs & Command Center Telemetry
router.get("/catalogs", controller.getCatalogs);
router.get("/stats", controller.getProcurementStats);
router.get("/telemetry", controller.getProcurementStats);

// Vendors
router.post("/vendors", controller.registerVendor);
router.get("/vendors", controller.getVendors);
router.get("/vendors/:id", controller.getVendorById);
router.patch("/vendors/:id", controller.updateVendor);

// Vendor Contracts
router.post("/contracts", controller.registerVendorContract);
router.get("/contracts", controller.getVendorContracts);

// Purchase Orders
router.post("/purchase-orders", controller.createPurchaseOrder);
router.get("/purchase-orders", controller.getPurchaseOrders);
router.get("/purchase-orders/:id", controller.getPurchaseOrderById);
router.patch("/purchase-orders/:id/status", controller.updatePurchaseOrderStatus);

// Goods Receipt Notes (GRN) & 3-Way Matching
router.post("/goods-receipt-notes", controller.createGoodsReceiptNote);
router.get("/goods-receipt-notes", controller.getGoodsReceiptNotes);
router.get("/goods-receipt-notes/:id", controller.getGoodsReceiptNoteById);
router.post("/goods-receipt-notes/:id/three-way-match", controller.verifyThreeWayMatch);
router.post("/goods-receipt-notes/:id/inspection", controller.completeGrnInspection);

module.exports = router;
