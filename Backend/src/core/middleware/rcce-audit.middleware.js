"use strict";

/*
================================================================================
GBS CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE (GBS-RCCE)
MIDDLEWARE: Maintenance Guard, Permission Overrides & Audit Logger
LOCATION: Backend/src/core/middleware/rcce-audit.middleware.js
================================================================================
Monitors all API traffic through GBS-RCCE:
  1. Enforces authorized maintenance mode when activated by Developer
  2. Checks dynamic role permission overrides managed in Developer Control
  3. Automatically audits mutations, denied/failed requests, and Developer
     sensitive data accesses with SHA-256 tamper-evident hash chaining
================================================================================
*/

const jwt = require("jsonwebtoken");
const { environment } = require("../../config/environment");
const prisma = require("../database/prisma.client");
const { rcce } = require("../gbs-rcce.bootstrap");

function extractVerifiedActor(req) {
    if (req.user && req.user.role) return req.user;
    try {
        const authHeader = req.headers && req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
        const secret = environment?.JWT_SECRET || process.env.JWT_SECRET;
        if (!secret) return null;
        return jwt.verify(authHeader.slice(7), secret);
    } catch (_err) {
        return null;
    }
}

let configCache = {
    maintenanceMode: { enabled: false, message: "" },
    rolePermissionOverrides: {},
    developerStrictPrivacy: false,
    loadedAt: 0
};

async function refreshControlConfig(force = false) {
    const now = Date.now();
    if (!force && now - configCache.loadedAt < 3000) {
        return configCache;
    }
    try {
        const rows = await prisma.systemConfiguration.findMany({
            where: {
                configKey: {
                    in: [
                        "MAINTENANCE_MODE",
                        "ROLE_PERMISSION_OVERRIDES",
                        "DEVELOPER_PRIVACY_POLICY"
                    ]
                }
            }
        });
        const map = {};
        for (const r of rows) {
            map[r.configKey] = r.configValue;
        }
        configCache = {
            maintenanceMode: map.MAINTENANCE_MODE || { enabled: false, message: "" },
            rolePermissionOverrides: map.ROLE_PERMISSION_OVERRIDES || {},
            developerStrictPrivacy: Boolean(map.DEVELOPER_PRIVACY_POLICY?.strictPiiLock),
            loadedAt: now
        };
    } catch (_err) {
        // Safe fallback if table isn't seeded yet
        configCache.loadedAt = now;
    }
    return configCache;
}

function invalidateControlConfigCache() {
    configCache.loadedAt = 0;
}

function getRolePermissionOverride(roleName) {
    return configCache.rolePermissionOverrides[roleName] || { granted: [], revoked: [] };
}

function isModulePermissionRevoked(roleName, moduleName, method = "GET") {
    const override = getRolePermissionOverride(roleName);
    const revoked = new Set(override.revoked || []);
    const action = method === "GET" ? "read" : method === "DELETE" ? "delete" : "write";
    return (
        revoked.has(`${moduleName.toLowerCase()}:${action}`) ||
        revoked.has(`${moduleName.toLowerCase()}:*`) ||
        revoked.has("*")
    );
}

const SENSITIVE_PII_PREFIXES = [
    "/api/v1/patients",
    "/api/v1/users",
    "/api/v1/clinical",
    "/api/v1/admissions",
    "/api/v1/billing",
    "/api/v1/hr",
    "/api/v1/biometrics",
    "/api/v1/medical-records",
    "/api/v1/mortuary"
];

function extractModuleFromPath(url = "") {
    const clean = String(url).split("?")[0].replace(/^\/api\/v\d+\/?/, "");
    return (clean.split("/")[0] || "SYSTEM").toUpperCase();
}

function isSensitivePath(url = "") {
    const clean = String(url).split("?")[0];
    return SENSITIVE_PII_PREFIXES.some((prefix) => clean.startsWith(prefix));
}

function createRcceTrafficMiddleware() {
    return async function rcceTrafficMiddleware(req, res, next) {
        const fullPath = req.originalUrl ? req.originalUrl.split("?")[0] : req.path;

        // Allow health probes, SSE notifications, auth routes seamlessly
        const isBypassPath =
            fullPath.startsWith("/api/v1/health") ||
            fullPath.startsWith("/api/v1/auth") ||
            fullPath.startsWith("/api/v1/rcce/developer") ||
            fullPath.startsWith("/api/v1/tenants/developer");

        const cfg = await refreshControlConfig(false);
        const actor = extractVerifiedActor(req);
        const moduleName = extractModuleFromPath(fullPath);

        if (cfg.maintenanceMode?.enabled && !isBypassPath) {
            if (actor?.role !== "DEVELOPER") {
                const def = rcce.catalogue.get("MAINTENANCE_MODE", 503, false);
                rcce.audit.record({
                    userId: actor?.id || null,
                    role: actor?.role || "ANONYMOUS",
                    tenantId: actor?.hospitalId || null,
                    action: "MAINTENANCE_MODE_BLOCKED",
                    module: moduleName,
                    affectedRecord: `${req.method} ${fullPath}`,
                    outcome: "DENIED",
                    requestId: req.requestId,
                    responseCode: def.code,
                    httpStatus: 503,
                    method: req.method,
                    path: fullPath,
                    ipAddress: req.ip,
                    userAgent: req.get("user-agent")
                });
                res.locals.rcceAuditRecorded = true;
                return res.status(503).json(
                    rcce.response.buildEnvelope({
                        success: false,
                        code: def.code,
                        message: cfg.maintenanceMode.message || def.message,
                        httpStatus: 503,
                        requestId: req.requestId
                    })
                );
            }
        }

        // Enforce dynamic Role Permission Revocations configured in Developer Control Engine
        if (actor?.role && !isBypassPath && !fullPath.startsWith("/api/v1/rcce")) {
            if (isModulePermissionRevoked(actor.role, moduleName, String(req.method).toUpperCase())) {
                const def = rcce.catalogue.get("FORBIDDEN_PERMISSION", 403, false);
                rcce.audit.record({
                    userId: actor.id,
                    role: actor.role,
                    tenantId: actor.hospitalId || null,
                    action: "DYNAMIC_PERMISSION_REVOKED_DENIED",
                    module: moduleName,
                    affectedRecord: `${req.method} ${fullPath}`,
                    outcome: "DENIED",
                    requestId: req.requestId,
                    responseCode: def.code,
                    httpStatus: 403,
                    method: req.method,
                    path: fullPath,
                    ipAddress: req.ip,
                    userAgent: req.get("user-agent")
                });
                res.locals.rcceAuditRecorded = true;
                return res.status(403).json(
                    rcce.response.buildEnvelope({
                        success: false,
                        code: def.code,
                        message: def.message,
                        httpStatus: 403,
                        requestId: req.requestId
                    })
                );
            }
        }

        // Audit activity & outcomes cleanly on finish
        res.on("finish", () => {
            if (fullPath === "/api/v1/health" || fullPath === "/api/v1/rcce/notifications/stream") {
                return;
            }
            const method = String(req.method).toUpperCase();
            const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
            const isErrorOutcome = res.statusCode >= 400;
            const isDevSensitiveRead =
                req.user?.role === "DEVELOPER" && isSensitivePath(fullPath);

            // Prevent double-logging routes that already logged inside explicit audit engine middleware
            if (res.locals.rcceAuditRecorded) return;
            if (!isMutation && !isErrorOutcome && !isDevSensitiveRead) return;

            let outcome = "SUCCESS";
            if (res.getHeader("X-Idempotency-Replayed") === "true") {
                outcome = "DUPLICATE_REPLAY";
            } else if ([401, 403, 423].includes(res.statusCode)) {
                outcome = "DENIED";
            } else if (res.statusCode >= 400) {
                outcome = "FAILURE";
            }

            const envelope = res.locals.rcceEnvelope;
            const actionName = isDevSensitiveRead
                ? `DEVELOPER_SENSITIVE_${method}`
                : `${extractModuleFromPath(fullPath)}_${method}`;

            rcce.audit.record({
                userId: req.user?.id || null,
                role: req.user?.role || "ANONYMOUS",
                tenantId: req.user?.hospitalId || null,
                hospitalId: req.user?.hospitalId || null,
                action: actionName,
                module: extractModuleFromPath(fullPath),
                affectedRecord:
                    (envelope?.data && (envelope.data.id || envelope.data.mrn || envelope.data.billNumber || envelope.data.tenantCode)) ||
                    req.params?.id ||
                    fullPath,
                outcome,
                requestId: req.requestId || res.getHeader("X-Request-ID") || null,
                responseCode: envelope?.code || null,
                httpStatus: res.statusCode,
                method,
                path: fullPath,
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
                description: isDevSensitiveRead
                    ? `Developer access on sensitive endpoint ${method} ${fullPath}`
                    : `${method} ${fullPath} -> HTTP ${res.statusCode} (${outcome})`
            }).catch(() => {});
        });

        return next();
    };
}

module.exports = {
    createRcceTrafficMiddleware,
    refreshControlConfig,
    invalidateControlConfigCache,
    getRolePermissionOverride,
    isModulePermissionRevoked
};
