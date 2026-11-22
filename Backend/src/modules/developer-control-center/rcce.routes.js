"use strict";

/*
================================================================================
GBS CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE (GBS-RCCE)
ROUTER: /api/v1/rcce/*
LOCATION: Backend/src/modules/developer-control-center/rcce.routes.js
================================================================================
*/

const express = require("express");
const router = express.Router();
const controller = require("./rcce.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { ADMIN_ROLES, DEVELOPER_ROLES, ROLES } = require("../../config/roles");

// Real-time SSE endpoint supports ?token= authentication directly inside controller
router.get("/notifications/stream", controller.streamNotifications);

// All remaining RCCE endpoints require authentication
router.use(authMiddleware);

// Central Response Catalogue
router.get("/catalogue", controller.getCatalogue);

// Notifications & Events
router.get("/notifications", controller.getNotifications);
router.patch("/notifications/:id/read", controller.markNotificationRead);
router.post("/notifications/mark-all-read", controller.markAllNotificationsRead);

// Audit & Events Monitoring (Admins & Developer)
router.get("/audit-logs", authorizeRoles(...ADMIN_ROLES), controller.getAuditLogs);
router.get("/events", authorizeRoles(...ADMIN_ROLES), controller.getEvents);

// Error Diagnostics Repository (Developer & System Admin only)
router.get("/errors", authorizeRoles(...DEVELOPER_ROLES, ROLES.ADMINISTRATOR, ROLES.HOSPITAL_DIRECTOR), controller.getErrorLogs);
router.patch("/errors/:id/resolve", authorizeRoles(...DEVELOPER_ROLES, ROLES.ADMINISTRATOR), controller.resolveErrorLog);

// Unified User & Developer Control Engine
router.get("/developer/overview", authorizeRoles(...ADMIN_ROLES), controller.getDeveloperOverview);
router.get("/developer/users-activity", authorizeRoles(...ADMIN_ROLES), controller.getUsersActivity);
router.get("/developer/permissions", authorizeRoles(...ADMIN_ROLES), controller.getPermissionsMatrix);
router.patch("/developer/permissions", authorizeRoles(...DEVELOPER_ROLES, ROLES.ADMINISTRATOR), controller.updateRolePermissions);

// Explicit Audited Sensitive-Data Access Grants
router.get("/developer/access-grants", authorizeRoles(...ADMIN_ROLES), controller.listAccessGrants);
router.post("/developer/access-grants/request", authorizeRoles(...DEVELOPER_ROLES), controller.requestAccessGrant);
router.patch(
    "/developer/access-grants/:id/approve",
    authorizeRoles(...ADMIN_ROLES), // Developer self-approval explicitly blocked inside service
    controller.approveAccessGrant
);
router.patch(
    "/developer/access-grants/:id/revoke",
    authorizeRoles(...ADMIN_ROLES),
    controller.revokeAccessGrant
);

// System Configuration & Maintenance Mode
router.get("/developer/configs", authorizeRoles(...ADMIN_ROLES), controller.listConfigurations);
router.put("/developer/configs/:key", authorizeRoles(...DEVELOPER_ROLES, ROLES.ADMINISTRATOR), controller.upsertConfiguration);
router.post("/developer/maintenance", authorizeRoles(...DEVELOPER_ROLES, ROLES.ADMINISTRATOR), controller.toggleMaintenanceMode);

// Phase E: Automated Trial Expiration Sweep, Truthful Integrations Status, AI Developer Assistant & Tenant Analytics
router.post("/developer/trial-sweep", authorizeRoles(...DEVELOPER_ROLES), controller.runTrialSweep);
router.get("/developer/integrations-status", authorizeRoles(...ADMIN_ROLES), controller.getIntegrationsStatus);
router.get("/developer/ai-assistant/diagnostics", authorizeRoles(...DEVELOPER_ROLES, ROLES.ADMINISTRATOR), controller.getAiDeveloperDiagnostics);
router.get("/developer/tenant-analytics", authorizeRoles(...DEVELOPER_ROLES), controller.getTenantAnalytics);

module.exports = router;
