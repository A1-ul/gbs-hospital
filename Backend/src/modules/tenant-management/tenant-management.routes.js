"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ENTERPRISE TENANT MANAGEMENT ROUTES
Developer Control Center & Subsystem Integration
LOCATION: src/modules/tenant-management/tenant-management.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();

const controller = require("./tenant-management.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { ROLES, DEVELOPER_ROLES, ADMIN_ROLES } = require("../../config/roles");

// ==========================================
// PUBLIC INSTITUTION REGISTRATION
// ==========================================
router.post("/register", controller.registerTenant);

// ==========================================
// SECURED DEVELOPER CONTROL CENTER ROUTES
// Absolute Developer Authority
// ==========================================
// Developer Console Summary Telemetry
router.get(
    "/console-summary",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.getDeveloperConsoleSummary
);

// List all tenants / institutions
router.get(
    "/",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.getTenants
);

// Live GIS facility tracking coordinates
router.get(
    "/tracking/live-locations",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.getLiveTenantLocations
);

// Developer Environment & Data Source Identification
router.get(
    "/developer/environment-status",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.getEnvironmentAndDataIdentification
);

// List all database backups
router.get(
    "/developer/backups",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.listDatabaseBackups
);

// Create full verified database backup
router.post(
    "/developer/backups/create",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.createDatabaseBackup
);

// Verify database backup file
router.post(
    "/developer/backups/:filename/verify",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.verifyDatabaseBackup
);

// Restore verified database backup file
router.post(
    "/developer/backups/:filename/restore",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.restoreDatabaseBackup
);

// Purge development/test data only (protected by pre-purge backup)
router.post(
    "/developer/purge-test-data",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.purgeDevelopmentTestData
);

// Approve and provision automated infrastructure
router.post(
    "/:id/approve",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.approveAndProvisionTenant
);

// Update tenant lifecycle status (Reject, Request Verification, Activate, Suspend, Archive, Restore)
router.post(
    "/:id/lifecycle",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.updateTenantLifecycleStatus
);

// Lock institution system access
router.post(
    "/:id/lock",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.lockTenant
);

// Unlock institution system access
router.post(
    "/:id/unlock",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.unlockTenant
);

// Extend subscription license & recalculate countdown
router.post(
    "/:id/extend",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.extendSubscription
);

// Initiate WebRTC video call session with institution
router.post(
    "/video-call/initiate",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.initiateVideoCall
);

// ==========================================
// TENANT / DEVELOPER INTERACTION ROUTES
// ==========================================
// Location telemetry ping (from branch server or client)
router.post(
    "/:id/location-ping",
    authMiddleware,
    controller.recordLocationPing
);

// Send message (Developer broadcast or Tenant support message)
router.post(
    "/messages",
    authMiddleware,
    controller.sendMessage
);

// Retrieve messages for a tenant
router.get(
    "/:id/messages",
    authMiddleware,
    controller.getMessages
);

// Tenant details by ID (Developer or Institutional Administrators)
router.get(
    "/:id",
    authMiddleware,
    authorizeRoles(...ADMIN_ROLES),
    controller.getTenantById
);

module.exports = router;
