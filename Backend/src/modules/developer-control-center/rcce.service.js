"use strict";

/*
================================================================================
GBS CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE (GBS-RCCE)
SERVICE: Central Control, Notifications, Audit, Error & Developer Governance
LOCATION: Backend/src/modules/developer-control-center/rcce.service.js
================================================================================
*/

const crypto = require("crypto");
const prisma = require("../../core/database/prisma.client");
const AppError = require("../../core/errors/app.error");
const { rcce } = require("../../core/gbs-rcce.bootstrap");
const { invalidateControlConfigCache, refreshControlConfig } = require("../../core/middleware/rcce-audit.middleware");
const { ALL_ROLES } = require("../../config/roles");

function getCatalogue() {
    return {
        applicationName: rcce.applicationName,
        totalCodes: rcce.catalogue.list().length,
        entries: rcce.catalogue.list()
    };
}

function buildNotificationRoleTargets(role) {
    const targets = new Set([role, "ALL"]);
    if (["ADMIN", "ADMINISTRATOR", "HOSPITAL_DIRECTOR", "SYSTEM_ADMIN"].includes(role)) {
        targets.add("ADMIN");
        targets.add("ADMINISTRATOR");
        targets.add("SYSTEM_ADMIN");
    }
    return Array.from(targets);
}

async function getNotifications({ actor, unreadOnly = false, limit = 40 }) {
    const roleTargets = buildNotificationRoleTargets(actor.role);

    const where = {
        OR: [
            { recipientUserId: actor.id },
            { recipientRole: { in: roleTargets }, recipientUserId: null }
        ],
        ...(unreadOnly ? { isRead: false } : {})
    };

    const [items, unreadCount] = await Promise.all([
        prisma.systemNotification.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: Math.min(Number(limit) || 40, 100)
        }),
        prisma.systemNotification.count({
            where: {
                OR: [
                    { recipientUserId: actor.id },
                    { recipientRole: { in: roleTargets }, recipientUserId: null }
                ],
                isRead: false
            }
        })
    ]);

    return { notifications: items, unreadCount };
}

async function markNotificationRead({ notificationId, actor }) {
    const existing = await prisma.systemNotification.findUnique({ where: { id: notificationId } });
    if (!existing) {
        throw new AppError("No matching record was found.", 404, "RECORD_NOT_FOUND");
    }

    const roleTargets = new Set(buildNotificationRoleTargets(actor.role));

    const ownsNotification =
        (existing.recipientUserId && existing.recipientUserId === actor.id) ||
        (!existing.recipientUserId && roleTargets.has(existing.recipientRole)) ||
        actor.role === "DEVELOPER";

    if (!ownsNotification) {
        throw new AppError("You do not have permission to perform this operation.", 403, "FORBIDDEN_PERMISSION");
    }

    return await prisma.systemNotification.update({
        where: { id: notificationId },
        data: { isRead: true, readAt: new Date() }
    });
}

async function markAllNotificationsRead({ actor }) {
    const roleTargets = buildNotificationRoleTargets(actor.role);

    const result = await prisma.systemNotification.updateMany({
        where: {
            OR: [
                { recipientUserId: actor.id },
                { recipientRole: { in: roleTargets }, recipientUserId: null }
            ],
            isRead: false
        },
        data: { isRead: true, readAt: new Date() }
    });

    return { markedReadCount: result.count };
}

async function getAuditLogs({ module, outcome, role, requestId, limit = 60 }) {
    const where = {};
    if (module) where.module = String(module).toUpperCase();
    if (outcome) where.outcome = String(outcome).toUpperCase();
    if (role) where.role = String(role).toUpperCase();
    if (requestId) where.requestId = String(requestId);

    const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit) || 60, 200)
    });

    const integrity = await rcce.audit.verifyIntegrity(logs);
    return { logs, integrity };
}

async function getEvents({ domain, eventCode, limit = 50 }) {
    const where = {};
    if (domain) where.domain = String(domain).toUpperCase();
    if (eventCode) where.eventCode = String(eventCode).toUpperCase();

    const events = await prisma.systemEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit) || 50, 150)
    });

    return {
        events,
        queueDepth: rcce.events.getQueueDepth(),
        realtimeSubscribers: rcce.events.getSubscriberCount()
    };
}

async function getErrorLogs({ errorCategory, resolved, limit = 50 }) {
    const where = {};
    if (errorCategory) where.errorCategory = String(errorCategory).toUpperCase();
    if (resolved !== undefined) {
        where.resolved = String(resolved) === "true" || resolved === true;
    }

    const [errors, unresolvedCount, byCategoryRaw] = await Promise.all([
        prisma.systemErrorLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: Math.min(Number(limit) || 50, 150)
        }),
        prisma.systemErrorLog.count({ where: { resolved: false } }),
        prisma.systemErrorLog.groupBy({
            by: ["errorCategory"],
            _count: { id: true }
        })
    ]);

    return {
        errors,
        unresolvedCount,
        byCategory: byCategoryRaw.map((c) => ({ category: c.errorCategory, count: c._count.id }))
    };
}

async function resolveErrorLog({ errorId, actor, resolutionNote, requestId }) {
    const existing = await prisma.systemErrorLog.findUnique({ where: { id: errorId } });
    if (!existing) {
        throw new AppError("No matching record was found.", 404, "RECORD_NOT_FOUND");
    }

    const updated = await prisma.systemErrorLog.update({
        where: { id: errorId },
        data: {
            resolved: true,
            resolvedBy: actor.id,
            resolvedAt: new Date(),
            resolutionNote: resolutionNote || "Reviewed and resolved by authorized developer."
        }
    });

    await rcce.audit.record({
        userId: actor.id,
        role: actor.role,
        action: "ERROR_LOG_RESOLVED",
        module: "DEVELOPER_CONTROL",
        affectedRecord: errorId,
        outcome: "SUCCESS",
        requestId,
        description: `Resolved error ${existing.code} (${existing.path || "system"})`
    });

    return updated;
}

async function getDeveloperControlOverview() {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - dbStart;

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
        totalUsers,
        activeUsers,
        totalTenants,
        lockedTenants,
        unresolvedErrors,
        totalEvents,
        recentAudits24h,
        deniedAudits24h,
        activeGrants,
        pendingGrants,
        cfg
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { active: true } }),
        prisma.tenant.count(),
        prisma.tenant.count({ where: { systemLocked: true } }),
        prisma.systemErrorLog.count({ where: { resolved: false } }),
        prisma.systemEvent.count(),
        prisma.auditLog.count({ where: { createdAt: { gte: last24h } } }),
        prisma.auditLog.count({ where: { createdAt: { gte: last24h }, outcome: { in: ["DENIED", "FAILURE"] } } }),
        prisma.developerAccessGrant.count({ where: { status: "APPROVED", revokedAt: null } }),
        prisma.developerAccessGrant.count({ where: { status: "PENDING" } }),
        refreshControlConfig(true)
    ]);

    return {
        status: cfg.maintenanceMode?.enabled ? "MAINTENANCE" : "OPERATIONAL",
        uptimeSeconds: Math.floor(process.uptime()),
        dbLatencyMs,
        memoryRssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        operations: {
            totalUsers,
            activeUsers,
            totalTenants,
            lockedTenants,
            unresolvedErrors,
            totalEvents,
            recentAudits24h,
            deniedAudits24h,
            eventQueueDepth: rcce.events.getQueueDepth(),
            realtimeSubscribers: rcce.events.getSubscriberCount()
        },
        privacyControl: {
            developerPrivateDataRestrictedByDefault: true,
            activeSensitiveGrants: activeGrants,
            pendingSensitiveGrants: pendingGrants
        },
        maintenanceMode: cfg.maintenanceMode
    };
}

async function getUsersActivity({ actor, includePrivate = false, role = null, limit = 50, requestId, ipAddress }) {
    let grantUsed = null;
    const isDeveloper = actor.role === "DEVELOPER";

    if (isDeveloper && includePrivate) {
        const authCheck = await rcce.control.authorizeSensitiveAccess({
            actor,
            scope: rcce.CONSTANTS.SENSITIVE_SCOPES.USER_PII_READ,
            affectedRecord: "DEVELOPER_USERS_ACTIVITY_UNMASKED",
            requestId,
            ipAddress
        });

        if (!authCheck.allowed) {
            throw new AppError(authCheck.message, authCheck.httpStatus, authCheck.code);
        }
        grantUsed = authCheck.grant;
    }

    const users = await prisma.user.findMany({
        where: role ? { role: { name: String(role).toUpperCase() } } : {},
        include: { role: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit) || 50, 100)
    });

    const userIds = users.map((u) => u.id);
    const auditCounts = userIds.length
        ? await prisma.auditLog.groupBy({
            by: ["userId"],
            where: { userId: { in: userIds } },
            _count: { id: true }
        })
        : [];
    const countMap = new Map(auditCounts.map((c) => [c.userId, c._count.id]));

    const formatted = users.map((u) => {
        const roleName = u.role?.name || "UNKNOWN";
        const base = {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone || null,
            role: roleName,
            active: u.active,
            status: u.status,
            department: u.department || null,
            hospitalId: u.hospitalId || null,
            lastLogin: u.lastLogin,
            createdAt: u.createdAt,
            activityCount: countMap.get(u.id) || 0,
            privacyRedacted: false
        };

        if (isDeveloper && !grantUsed) {
            return {
                ...rcce.helpers.redactPrivateUserFields(base),
                activityCount: base.activityCount
            };
        }
        return base;
    });

    return {
        users: formatted,
        privacyPolicyApplied: isDeveloper && !grantUsed ? "REDACTED_BY_DEFAULT" : grantUsed ? "EXPLICIT_AUDITED_GRANT" : "ORGANIZATIONAL_RBAC",
        grantCode: grantUsed ? grantUsed.grantCode : null
    };
}

async function getPermissionsMatrix() {
    const [roles, permissions, cfg] = await Promise.all([
        prisma.role.findMany({
            include: { permissions: true },
            orderBy: { name: "asc" }
        }),
        prisma.permission.findMany({ orderBy: { name: "asc" } }),
        refreshControlConfig(true)
    ]);

    return {
        allRoles: ALL_ROLES,
        roles: roles.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            permissions: (r.permissions || []).map((p) => p.name),
            overrides: cfg.rolePermissionOverrides[r.name] || { granted: [], revoked: [] }
        })),
        availablePermissions: permissions.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description
        })),
        rolePermissionOverrides: cfg.rolePermissionOverrides
    };
}

async function updateRolePermissionOverride({ roleName, action, permission, actor, requestId, ipAddress }) {
    const normalizedRole = String(roleName || "").toUpperCase();
    if (!ALL_ROLES.includes(normalizedRole)) {
        throw new AppError("Invalid role specified.", 400, "VALIDATION_FAILED");
    }
    if (!permission || !["GRANT", "REVOKE"].includes(String(action || "").toUpperCase())) {
        throw new AppError("Some required information is missing.", 400, "VALIDATION_MISSING_INFO");
    }

    const existingCfg = await prisma.systemConfiguration.findUnique({
        where: { configKey: "ROLE_PERMISSION_OVERRIDES" }
    });
    const current = existingCfg?.configValue ? { ...existingCfg.configValue } : {};
    const roleEntry = current[normalizedRole] || { granted: [], revoked: [] };
    const grantedSet = new Set(roleEntry.granted || []);
    const revokedSet = new Set(roleEntry.revoked || []);

    const act = String(action).toUpperCase();
    if (act === "REVOKE") {
        grantedSet.delete(permission);
        revokedSet.add(permission);
    } else {
        revokedSet.delete(permission);
        grantedSet.add(permission);
    }

    current[normalizedRole] = {
        granted: Array.from(grantedSet),
        revoked: Array.from(revokedSet)
    };

    await prisma.systemConfiguration.upsert({
        where: { configKey: "ROLE_PERMISSION_OVERRIDES" },
        update: {
            configValue: current,
            updatedById: actor.id,
            updatedByRole: actor.role
        },
        create: {
            configKey: "ROLE_PERMISSION_OVERRIDES",
            configValue: current,
            category: "SECURITY",
            description: "Dynamic role permission overrides managed through GBS-RCCE Developer Control Engine.",
            updatedById: actor.id,
            updatedByRole: actor.role
        }
    });

    invalidateControlConfigCache();

    await rcce.audit.record({
        userId: actor.id,
        role: actor.role,
        action: `PERMISSION_${act}_${permission}`,
        module: "PERMISSION_CONTROL",
        affectedRecord: normalizedRole,
        outcome: "SUCCESS",
        requestId,
        ipAddress,
        description: `${act} permission "${permission}" on role ${normalizedRole}`
    });

    await rcce.events.publish({
        eventCode: "RECORD_UPDATED",
        domain: "PERMISSION_CONTROL",
        actorUserId: actor.id,
        actorRole: actor.role,
        affectedRecord: normalizedRole,
        severity: "WARNING",
        requestId,
        asyncDelivery: true,
        notifications: [
            {
                recipientRole: "ADMIN",
                title: "System Permission Matrix Updated",
                message: `Permission "${permission}" was ${act.toLowerCase()}ed for role ${normalizedRole}.`,
                severity: "WARNING"
            }
        ]
    });

    return { role: normalizedRole, override: current[normalizedRole] };
}

async function listAccessGrants({ actor }) {
    const where = actor.role === "DEVELOPER" ? { developerId: actor.id } : {};
    return await prisma.developerAccessGrant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100
    });
}

async function requestSensitiveAccessGrant({ actor, body, requestId, ipAddress }) {
    const ruleCheck = rcce.rules.requireFields(body, [
        { field: "scope", label: "Access scope" },
        { field: "reason", label: "Justification reason" }
    ]);
    if (!ruleCheck.valid) {
        throw new AppError(ruleCheck.message, ruleCheck.httpStatus, ruleCheck.code, ruleCheck.errors);
    }

    const validScopes = Object.values(rcce.CONSTANTS.SENSITIVE_SCOPES);
    if (!validScopes.includes(body.scope)) {
        throw new AppError(
            `Invalid sensitive scope. Allowed scopes: ${validScopes.join(", ")}`,
            400,
            "VALIDATION_FAILED"
        );
    }

    const grantCode = `GRT-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const grant = await prisma.developerAccessGrant.create({
        data: {
            grantCode,
            developerId: actor.id,
            developerEmail: actor.email || "developer@gbs.com",
            scope: body.scope,
            reason: String(body.reason).trim(),
            ticketRef: body.ticketRef || null,
            tenantId: body.tenantId || null,
            status: "PENDING"
        }
    });

    await rcce.events.publish({
        eventCode: "ACCESS_GRANT_REQUESTED",
        domain: "PRIVACY_CONTROL",
        actorUserId: actor.id,
        actorRole: actor.role,
        affectedRecord: grant.grantCode,
        severity: "WARNING",
        requestId,
        notifications: [
            {
                recipientRole: "ADMIN",
                title: "Developer Sensitive Data Access Requested",
                message: `Developer requested ${body.scope} (${grant.grantCode}): "${body.reason}"`,
                severity: "WARNING"
            }
        ]
    });

    await rcce.audit.record({
        userId: actor.id,
        role: actor.role,
        action: "DEVELOPER_ACCESS_GRANT_REQUESTED",
        module: "PRIVACY_CONTROL",
        affectedRecord: grant.grantCode,
        outcome: "PENDING",
        requestId,
        ipAddress,
        description: `Requested sensitive access ${body.scope}: ${body.reason}`
    });

    return grant;
}

async function approveSensitiveAccessGrant({ grantId, actor, durationMinutes = 60, requestId, ipAddress }) {
    const grant = await prisma.developerAccessGrant.findUnique({ where: { id: grantId } });
    if (!grant) {
        throw new AppError("No matching record was found.", 404, "RECORD_NOT_FOUND");
    }

    // Strict separation of duties: Developers CANNOT approve their own private data access grants
    if (actor.role === "DEVELOPER" || grant.developerId === actor.id) {
        await rcce.audit.record({
            userId: actor.id,
            role: actor.role,
            action: "DEVELOPER_SELF_APPROVAL_BLOCKED",
            module: "PRIVACY_CONTROL",
            affectedRecord: grant.grantCode,
            outcome: "DENIED",
            requestId,
            httpStatus: 403,
            responseCode: "FORBIDDEN_PERMISSION",
            ipAddress,
            description: "Blocked self-approval or developer-side approval of private user data grant."
        });
        throw new AppError("You do not have permission to perform this operation.", 403, "FORBIDDEN_PERMISSION");
    }

    const mins = Math.min(Math.max(Number(durationMinutes) || 60, 5), 480);
    const expiresAt = new Date(Date.now() + mins * 60 * 1000);

    const updated = await prisma.developerAccessGrant.update({
        where: { id: grantId },
        data: {
            status: "APPROVED",
            approvedById: actor.id,
            approvedByRole: actor.role,
            expiresAt
        }
    });

    await rcce.events.publish({
        eventCode: "ACCESS_GRANT_APPROVED",
        domain: "PRIVACY_CONTROL",
        actorUserId: actor.id,
        actorRole: actor.role,
        affectedRecord: updated.grantCode,
        severity: "INFO",
        requestId,
        notifications: [
            {
                recipientUserId: updated.developerId,
                recipientRole: "DEVELOPER",
                title: "Sensitive Access Grant Approved",
                message: `Grant ${updated.grantCode} (${updated.scope}) approved for ${mins} minutes.`,
                severity: "INFO"
            }
        ]
    });

    return updated;
}

async function revokeSensitiveAccessGrant({ grantId, actor, requestId, ipAddress }) {
    const grant = await prisma.developerAccessGrant.findUnique({ where: { id: grantId } });
    if (!grant) {
        throw new AppError("No matching record was found.", 404, "RECORD_NOT_FOUND");
    }

    const updated = await prisma.developerAccessGrant.update({
        where: { id: grantId },
        data: {
            status: "REVOKED",
            revokedAt: new Date()
        }
    });

    await rcce.audit.record({
        userId: actor.id,
        role: actor.role,
        action: "DEVELOPER_ACCESS_GRANT_REVOKED",
        module: "PRIVACY_CONTROL",
        affectedRecord: updated.grantCode,
        outcome: "SUCCESS",
        requestId,
        ipAddress
    });

    return updated;
}

async function listConfigurations() {
    return await prisma.systemConfiguration.findMany({
        orderBy: [{ category: "asc" }, { configKey: "asc" }]
    });
}

async function upsertConfiguration({ configKey, configValue, category = "GENERAL", description = "", actor, requestId, ipAddress }) {
    if (!configKey) {
        throw new AppError("Some required information is missing.", 400, "VALIDATION_MISSING_INFO");
    }

    const saved = await prisma.systemConfiguration.upsert({
        where: { configKey: String(configKey).toUpperCase() },
        update: {
            configValue: configValue ?? {},
            category,
            description,
            updatedById: actor.id,
            updatedByRole: actor.role
        },
        create: {
            configKey: String(configKey).toUpperCase(),
            configValue: configValue ?? {},
            category,
            description,
            updatedById: actor.id,
            updatedByRole: actor.role
        }
    });

    invalidateControlConfigCache();

    await rcce.audit.record({
        userId: actor.id,
        role: actor.role,
        action: `CONFIG_UPDATED_${saved.configKey}`,
        module: "SYSTEM_CONFIG",
        affectedRecord: saved.configKey,
        outcome: "SUCCESS",
        requestId,
        ipAddress
    });

    return saved;
}

async function setMaintenanceMode({ enabled, message, actor, requestId, ipAddress }) {
    const configValue = {
        enabled: Boolean(enabled),
        message: message || "System is undergoing scheduled maintenance by Engineering Operations.",
        updatedAt: new Date().toISOString(),
        updatedBy: actor.email || actor.id
    };

    const saved = await upsertConfiguration({
        configKey: "MAINTENANCE_MODE",
        configValue,
        category: "MAINTENANCE",
        description: "Global maintenance mode flag controlled via GBS-RCCE Developer Control Engine.",
        actor,
        requestId,
        ipAddress
    });

    await rcce.events.publish({
        eventCode: "MAINTENANCE_MODE_CHANGED",
        domain: "DEVELOPER_CONTROL",
        actorUserId: actor.id,
        actorRole: actor.role,
        affectedRecord: "MAINTENANCE_MODE",
        severity: configValue.enabled ? "WARNING" : "INFO",
        requestId,
        notifications: [
            {
                recipientRole: "ALL",
                title: configValue.enabled ? "System Maintenance Activated" : "System Maintenance Completed",
                message: configValue.enabled
                    ? configValue.message
                    : "Normal system operations have resumed.",
                severity: configValue.enabled ? "WARNING" : "SUCCESS"
            }
        ]
    });

    return saved;
}

module.exports = {
    getCatalogue,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getAuditLogs,
    getEvents,
    getErrorLogs,
    resolveErrorLog,
    getDeveloperControlOverview,
    getUsersActivity,
    getPermissionsMatrix,
    updateRolePermissionOverride,
    listAccessGrants,
    requestSensitiveAccessGrant,
    approveSensitiveAccessGrant,
    revokeSensitiveAccessGrant,
    listConfigurations,
    upsertConfiguration,
    setMaintenanceMode
};
