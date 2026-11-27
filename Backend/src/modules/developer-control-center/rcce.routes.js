"use strict";

/*
================================================================================
GBS CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE (GBS-RCCE)
ROUTER: /api/v1/rcce/*
LOCATION: Backend/src/modules/developer-control-center/rcce.routes.js
================================================================================
Step 31-32 Developer Platform Access Control:
  - All Developer Control Center routes (/errors, /developer/overview,
    /developer/users-activity, /developer/permissions, /developer/configs,
    /developer/maintenance, /developer/trial-sweep, /developer/integrations-status,
    /developer/ai-assistant/diagnostics, /developer/tenant-analytics,
    /developer/remote/*) are STRICTLY isolated behind developerSecurityGuard
    (DEVELOPER role ONLY; Hospital Admins & Directors receive HTTP 403).
  - Non-Developer Hospital Administrators retain access ONLY to hospital
    audit-logs/events and approving/revoking Developer sensitive-data access
    grants (preventing Developer self-approval).
*/

const express = require("express");
const router = express.Router();
const controller = require("./rcce.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { developerSecurityGuard } = require("./services/developer-security-guard.middleware");
const { ADMIN_ROLES } = require("../../config/roles");

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

// Hospital Governance Audit & Events (Hospital Admins & Developer)
router.get("/audit-logs", authorizeRoles(...ADMIN_ROLES), controller.getAuditLogs);
router.get("/events", authorizeRoles(...ADMIN_ROLES), controller.getEvents);

// Explicit Audited Sensitive-Data Access Grants (Admin non-self-approval governance)
router.get("/developer/access-grants", authorizeRoles(...ADMIN_ROLES), controller.listAccessGrants);
router.post("/developer/access-grants/request", developerSecurityGuard, controller.requestAccessGrant);
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

// ============================================================================
// STRICT DEVELOPER-ONLY CONTROL CENTER ROUTES (ZERO NORMAL ADMIN ACCESS)
// ============================================================================

// System Error Diagnostics Repository
router.get("/errors", developerSecurityGuard, controller.getErrorLogs);
router.patch("/errors/:id/resolve", developerSecurityGuard, controller.resolveErrorLog);

// Unified Developer Control Engine
router.get("/developer/overview", developerSecurityGuard, controller.getDeveloperOverview);
router.get("/developer/users-activity", developerSecurityGuard, controller.getUsersActivity);
router.get("/developer/permissions", developerSecurityGuard, controller.getPermissionsMatrix);
router.patch("/developer/permissions", developerSecurityGuard, controller.updateRolePermissions);

// System Configuration & Maintenance Mode
router.get("/developer/configs", developerSecurityGuard, controller.listConfigurations);
router.put("/developer/configs/:key", developerSecurityGuard, controller.upsertConfiguration);
router.post("/developer/maintenance", developerSecurityGuard, controller.toggleMaintenanceMode);

// Automated Trial Expiration Sweep, Truthful Integrations Status, AI Diagnostics & Tenant Analytics
router.post("/developer/trial-sweep", developerSecurityGuard, controller.runTrialSweep);
router.get("/developer/integrations-status", developerSecurityGuard, controller.getIntegrationsStatus);
router.get("/developer/ai-assistant/diagnostics", developerSecurityGuard, controller.getAiDeveloperDiagnostics);
router.get("/developer/tenant-analytics", developerSecurityGuard, controller.getTenantAnalytics);

// Step 35: Remote System Management & Infrastructure Ops (Developer Only)
router.get("/developer/remote/cluster-health", developerSecurityGuard, controller.getClusterHealth);
router.get("/developer/remote/deployments", developerSecurityGuard, controller.getDeploymentHistory);
router.post("/developer/remote/deployments", developerSecurityGuard, controller.recordDeploymentCheckpoint);
router.post("/developer/remote/cache/clear", developerSecurityGuard, controller.clearSystemCaches);
router.post("/developer/remote/database/optimize", developerSecurityGuard, controller.optimizeDatabase);
router.post("/developer/remote/logs/rotate", developerSecurityGuard, controller.rotateAndPruneLogs);
router.get("/developer/remote/feature-flags", developerSecurityGuard, controller.listFeatureFlags);
router.put("/developer/remote/feature-flags/:flagKey", developerSecurityGuard, controller.setFeatureFlag);
router.get("/developer/remote/rollback-readiness", developerSecurityGuard, controller.getRollbackReadiness);

module.exports = router;
