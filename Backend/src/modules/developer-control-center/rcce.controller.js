"use strict";

/*
================================================================================
GBS CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE (GBS-RCCE)
CONTROLLER: Central Control, Notifications, Audit, Error & Developer Console
LOCATION: Backend/src/modules/developer-control-center/rcce.controller.js
================================================================================
*/

const jwt = require("jsonwebtoken");
const { environment } = require("../../config/environment");
const service = require("./rcce.service");
const developerOpsService = require("./developer-ops.service");
const { rcce } = require("../../core/gbs-rcce.bootstrap");

async function getCatalogue(req, res, next) {
    try {
        const data = service.getCatalogue();
        return res.rcceSuccess("SUCCESS", data);
    } catch (error) {
        next(error);
    }
}

async function getNotifications(req, res, next) {
    try {
        const data = await service.getNotifications({
            actor: req.user,
            unreadOnly: req.query.unreadOnly === "true",
            limit: req.query.limit
        });
        return res.rcceSuccess("SUCCESS", data);
    } catch (error) {
        next(error);
    }
}

async function streamNotifications(req, res) {
    // Allow SSE connection using header or query token
    const token = req.query.token || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    let user = req.user;
    if (!user && token) {
        try {
            const secret = environment?.JWT_SECRET || process.env.JWT_SECRET;
            user = jwt.verify(token, secret);
        } catch (_err) {
            return res.rcceError("UNAUTHORIZED", [], { httpStatus: 401 });
        }
    }
    if (!user) {
        return res.rcceError("UNAUTHORIZED", [], { httpStatus: 401 });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    res.write(`event: connected\ndata: ${JSON.stringify({ userId: user.id, role: user.role })}\n\n`);

    const unsubscribe = rcce.events.subscribeRealtime({
        userId: user.id,
        role: user.role,
        res
    });

    const keepalive = setInterval(() => {
        try {
            res.write(`: keepalive ${Date.now()}\n\n`);
        } catch (_e) {
            // ignored
        }
    }, 25000);

    req.on("close", () => {
        clearInterval(keepalive);
        unsubscribe();
    });
}

async function markNotificationRead(req, res, next) {
    try {
        const updated = await service.markNotificationRead({
            notificationId: req.params.id,
            actor: req.user
        });
        return res.rcceSuccess("RECORD_UPDATED", updated);
    } catch (error) {
        next(error);
    }
}

async function markAllNotificationsRead(req, res, next) {
    try {
        const result = await service.markAllNotificationsRead({ actor: req.user });
        return res.rcceSuccess("RECORD_UPDATED", result);
    } catch (error) {
        next(error);
    }
}

async function getAuditLogs(req, res, next) {
    try {
        const data = await service.getAuditLogs(req.query);
        return res.rcceSuccess("SUCCESS", data);
    } catch (error) {
        next(error);
    }
}

async function getEvents(req, res, next) {
    try {
        const data = await service.getEvents(req.query);
        return res.rcceSuccess("SUCCESS", data);
    } catch (error) {
        next(error);
    }
}

async function getErrorLogs(req, res, next) {
    try {
        const data = await service.getErrorLogs(req.query);
        return res.rcceSuccess("SUCCESS", data);
    } catch (error) {
        next(error);
    }
}

async function resolveErrorLog(req, res, next) {
    try {
        const updated = await service.resolveErrorLog({
            errorId: req.params.id,
            actor: req.user,
            resolutionNote: req.body?.resolutionNote,
            requestId: req.requestId
        });
        return res.rcceSuccess("RECORD_UPDATED", updated);
    } catch (error) {
        next(error);
    }
}

async function getDeveloperOverview(req, res, next) {
    try {
        const data = await service.getDeveloperControlOverview();
        return res.rcceSuccess("SUCCESS", data);
    } catch (error) {
        next(error);
    }
}

async function getUsersActivity(req, res, next) {
    try {
        const includePrivate = req.query.includePrivate === "true";
        const data = await service.getUsersActivity({
            actor: req.user,
            includePrivate,
            role: req.query.role,
            limit: req.query.limit,
            requestId: req.requestId,
            ipAddress: req.ip
        });
        return res.rcceSuccess("SUCCESS", data);
    } catch (error) {
        next(error);
    }
}

async function getPermissionsMatrix(req, res, next) {
    try {
        const data = await service.getPermissionsMatrix();
        return res.rcceSuccess("SUCCESS", data);
    } catch (error) {
        next(error);
    }
}

async function updateRolePermissions(req, res, next) {
    try {
        const data = await service.updateRolePermissionOverride({
            roleName: req.body?.roleName || req.params.roleName,
            action: req.body?.action,
            permission: req.body?.permission,
            actor: req.user,
            requestId: req.requestId,
            ipAddress: req.ip
        });
        return res.rcceSuccess("RECORD_UPDATED", data);
    } catch (error) {
        next(error);
    }
}

async function listAccessGrants(req, res, next) {
    try {
        const grants = await service.listAccessGrants({ actor: req.user });
        return res.rcceSuccess("SUCCESS", { grants });
    } catch (error) {
        next(error);
    }
}

async function requestAccessGrant(req, res, next) {
    try {
        const grant = await service.requestSensitiveAccessGrant({
            actor: req.user,
            body: req.body,
            requestId: req.requestId,
            ipAddress: req.ip
        });
        return res.rcceSuccess("PENDING_APPROVAL", grant, {
            httpStatus: 202,
            message: "Your request has been submitted and is awaiting approval."
        });
    } catch (error) {
        next(error);
    }
}

async function approveAccessGrant(req, res, next) {
    try {
        const updated = await service.approveSensitiveAccessGrant({
            grantId: req.params.id,
            actor: req.user,
            durationMinutes: req.body?.durationMinutes,
            requestId: req.requestId,
            ipAddress: req.ip
        });
        return res.rcceSuccess("REQUEST_APPROVED", updated);
    } catch (error) {
        next(error);
    }
}

async function revokeAccessGrant(req, res, next) {
    try {
        const updated = await service.revokeSensitiveAccessGrant({
            grantId: req.params.id,
            actor: req.user,
            requestId: req.requestId,
            ipAddress: req.ip
        });
        return res.rcceSuccess("RECORD_UPDATED", updated);
    } catch (error) {
        next(error);
    }
}

async function listConfigurations(req, res, next) {
    try {
        const configs = await service.listConfigurations();
        return res.rcceSuccess("SUCCESS", { configs });
    } catch (error) {
        next(error);
    }
}

async function upsertConfiguration(req, res, next) {
    try {
        const saved = await service.upsertConfiguration({
            configKey: req.params.key || req.body?.configKey,
            configValue: req.body?.configValue,
            category: req.body?.category,
            description: req.body?.description,
            actor: req.user,
            requestId: req.requestId,
            ipAddress: req.ip
        });
        return res.rcceSuccess("RECORD_UPDATED", saved);
    } catch (error) {
        next(error);
    }
}

async function toggleMaintenanceMode(req, res, next) {
    try {
        const saved = await service.setMaintenanceMode({
            enabled: req.body?.enabled,
            message: req.body?.message,
            actor: req.user,
            requestId: req.requestId,
            ipAddress: req.ip
        });
        return res.rcceSuccess("RECORD_UPDATED", saved);
    } catch (error) {
        next(error);
    }
}

async function runTrialSweep(req, res, next) {
    try {
        const result = await developerOpsService.runTrialExpirationSweep(req.user);
        return res.rcceSuccess("SUCCESS", result, {
            message: `Subscription sweep completed: ${result.totalTenantsEvaluated} evaluated, ${result.warningsIssuedCount} warnings, ${result.autoLockedCount} expired locked.`
        });
    } catch (error) {
        next(error);
    }
}

async function getIntegrationsStatus(req, res, next) {
    try {
        const result = await developerOpsService.getExternalIntegrationsStatus();
        return res.rcceSuccess("SUCCESS", result);
    } catch (error) {
        next(error);
    }
}

async function getAiDeveloperDiagnostics(req, res, next) {
    try {
        const result = await developerOpsService.getAiDeveloperAssistantDiagnostics();
        return res.rcceSuccess("SUCCESS", result);
    } catch (error) {
        next(error);
    }
}

async function getTenantAnalytics(req, res, next) {
    try {
        const result = await developerOpsService.getTenantAnalyticsCenter();
        return res.rcceSuccess("SUCCESS", result);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getCatalogue,
    getNotifications,
    streamNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getAuditLogs,
    getEvents,
    getErrorLogs,
    resolveErrorLog,
    getDeveloperOverview,
    getUsersActivity,
    getPermissionsMatrix,
    updateRolePermissions,
    listAccessGrants,
    requestAccessGrant,
    approveAccessGrant,
    revokeAccessGrant,
    listConfigurations,
    upsertConfiguration,
    toggleMaintenanceMode,
    runTrialSweep,
    getIntegrationsStatus,
    getAiDeveloperDiagnostics,
    getTenantAnalytics
};
