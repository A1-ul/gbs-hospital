"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
DEMO TRIAL 10-ENTRY QUOTA ENFORCEMENT MIDDLEWARE
CommonJS Only — PostgreSQL-Backed, Zero Fake Counters
LOCATION: Backend/src/core/middleware/demo-quota.middleware.js
================================================================================
Enforces an exact 10-entry write limit on supervised learning demo sessions
(isDemoSession === true) while allowing real production workflows to execute
identically to live production for those 10 trial entries.
- NEVER impacts real authenticated production accounts or DEVELOPER accounts.
- Read-only requests (GET/HEAD/OPTIONS) remain unlimited in Demo mode.
- Failed validation/error responses (non-2xx) do NOT consume a trial entry.
- The 11th write entry is blocked cleanly with HTTP 403 DEMO_TRIAL_LIMIT_REACHED.
*/

const jwt = require("jsonwebtoken");
const prisma = require("../database/prisma.client");
const { environment } = require("../../config/environment");
const { rcce } = require("../gbs-rcce.bootstrap");
const { trackAuditWrite } = require("./rcce-audit.middleware");
const logger = require("../utils/logger");

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const EXEMPT_DEMO_WRITE_PREFIXES = [
    "/auth/logout",
    "/auth/login",
    "/auth/signup",
    "/auth/demo-session",
    "/auth/demo-quota",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/health"
];

function getMaxDemoEntries() {
    const parsed = Number(process.env.DEMO_MAX_ENTRIES || 10);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 10;
}

function getDemoQuotaConfigKey(sessionId) {
    return `DEMO_QUOTA_${String(sessionId)}`;
}

function resolveDemoActor(req) {
    if (req.user && typeof req.user === "object") {
        return req.user;
    }
    try {
        const authHeader = req.headers && req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        const secret = environment?.JWT_SECRET || process.env.JWT_SECRET;
        if (!secret) return null;
        return jwt.verify(authHeader.slice(7).trim(), secret, { algorithms: ["HS256"] });
    } catch (_err) {
        return null;
    }
}

async function initDemoQuota(sessionId, { userId = null, role = null } = {}) {
    const maxEntries = getMaxDemoEntries();
    const configKey = getDemoQuotaConfigKey(sessionId);
    const payload = {
        sessionId,
        userId,
        role,
        entriesUsed: 0,
        maxEntries,
        entries: [],
        initializedAt: new Date().toISOString()
    };

    await prisma.systemConfiguration.upsert({
        where: { configKey },
        update: {
            category: "DEMO_TRIAL_QUOTA",
            configValue: payload,
            updatedById: userId,
            updatedByRole: role
        },
        create: {
            configKey,
            category: "DEMO_TRIAL_QUOTA",
            description: `10-entry trial quota ledger for demo session ${sessionId}`,
            configValue: payload,
            updatedById: userId,
            updatedByRole: role
        }
    });

    return {
        isDemoSession: true,
        entriesUsed: 0,
        maxEntries,
        remaining: maxEntries,
        limitReached: false
    };
}

async function getDemoQuotaStatus(sessionId) {
    const maxEntries = getMaxDemoEntries();
    if (!sessionId) {
        return {
            isDemoSession: true,
            entriesUsed: 0,
            maxEntries,
            remaining: maxEntries,
            limitReached: false
        };
    }

    const configKey = getDemoQuotaConfigKey(sessionId);
    const record = await prisma.systemConfiguration.findUnique({ where: { configKey } });
    const val = record?.configValue || null;
    const entriesUsed = Number(val?.entriesUsed || 0);
    const effectiveLimit = Number(val?.maxEntries || maxEntries);
    const remaining = Math.max(0, effectiveLimit - entriesUsed);

    return {
        isDemoSession: true,
        entriesUsed,
        maxEntries: effectiveLimit,
        remaining,
        limitReached: entriesUsed >= effectiveLimit
    };
}

async function recordDemoEntry(sessionId, { userId = null, role = null, method = "POST", path = "" } = {}) {
    const maxEntries = getMaxDemoEntries();
    const configKey = getDemoQuotaConfigKey(sessionId);

    return prisma.$transaction(async (tx) => {
        const existing = await tx.systemConfiguration.findUnique({ where: { configKey } });
        const prev = existing?.configValue || {
            sessionId,
            userId,
            role,
            entriesUsed: 0,
            maxEntries,
            entries: [],
            initializedAt: new Date().toISOString()
        };

        const nextCount = Number(prev.entriesUsed || 0) + 1;
        const effectiveLimit = Number(prev.maxEntries || maxEntries);
        const history = Array.isArray(prev.entries) ? prev.entries.slice(-19) : [];
        history.push({
            entryNumber: nextCount,
            method,
            path,
            recordedAt: new Date().toISOString()
        });

        const updatedVal = {
            ...prev,
            entriesUsed: nextCount,
            maxEntries: effectiveLimit,
            entries: history,
            lastEntryAt: new Date().toISOString()
        };

        await tx.systemConfiguration.upsert({
            where: { configKey },
            update: {
                category: "DEMO_TRIAL_QUOTA",
                configValue: updatedVal,
                updatedById: userId,
                updatedByRole: role
            },
            create: {
                configKey,
                category: "DEMO_TRIAL_QUOTA",
                description: `10-entry trial quota ledger for demo session ${sessionId}`,
                configValue: updatedVal,
                updatedById: userId,
                updatedByRole: role
            }
        });

        return {
            isDemoSession: true,
            entriesUsed: nextCount,
            maxEntries: effectiveLimit,
            remaining: Math.max(0, effectiveLimit - nextCount),
            limitReached: nextCount >= effectiveLimit
        };
    });
}

function setDemoQuotaHeaders(res, quota) {
    if (!res || res.headersSent || !quota) return;
    res.setHeader("X-Demo-Mode", "true");
    res.setHeader("X-Demo-Entries-Used", String(quota.entriesUsed));
    res.setHeader("X-Demo-Entries-Limit", String(quota.maxEntries));
    res.setHeader("X-Demo-Entries-Remaining", String(quota.remaining));
}

async function demoQuotaGuard(req, res, next) {
    try {
        const actor = resolveDemoActor(req);
        if (!actor || actor.isDemoSession !== true) {
            return next();
        }

        const sessionId = actor.sessionId || `anon-${actor.id}`;
        const method = String(req.method || "GET").toUpperCase();
        const cleanPath = String(req.path || "").split("?")[0];

        const currentQuota = await getDemoQuotaStatus(sessionId);
        req.demoQuota = currentQuota;

        const isTrackedWrite =
            WRITE_METHODS.has(method) &&
            !EXEMPT_DEMO_WRITE_PREFIXES.some((prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`));

        if (!isTrackedWrite) {
            setDemoQuotaHeaders(res, currentQuota);
            return next();
        }

        if (currentQuota.entriesUsed >= currentQuota.maxEntries) {
            setDemoQuotaHeaders(res, currentQuota);

            const auditPromise = rcce.audit.record({
                userId: actor.id || null,
                role: actor.role || "DEMO",
                action: "DEMO_TRIAL_LIMIT_REACHED",
                module: "DEMO_QUOTA",
                affectedRecord: `${method} ${cleanPath}`,
                outcome: "DENIED",
                requestId: req.requestId || null,
                responseCode: "DEMO_TRIAL_LIMIT_REACHED",
                httpStatus: 403,
                method,
                path: req.originalUrl,
                ipAddress: req.ip || null,
                description: `Demo trial session ${sessionId} reached maximum ${currentQuota.maxEntries}/${currentQuota.maxEntries} write entries.`
            });
            if (typeof trackAuditWrite === "function") {
                trackAuditWrite(auditPromise);
            }
            res.locals.rcceAuditRecorded = true;

            return res.status(403).json(
                rcce.response.buildEnvelope({
                    success: false,
                    code: "DEMO_TRIAL_LIMIT_REACHED",
                    message: `Demo trial limit reached (${currentQuota.entriesUsed}/${currentQuota.maxEntries} entries). Sign up or sign in with a verified hospital account for unlimited production operations.`,
                    httpStatus: 403,
                    requestId: req.requestId || null,
                    data: currentQuota
                })
            );
        }

        // Commit the PostgreSQL quota increment BEFORE flushing the HTTP response so headers
        // reflect real committed state and rapid sequential requests can never race.
        const originalJson = res.json.bind(res);
        let incremented = false;
        let incrementPromise = null;

        const commitWriteEntry = () => {
            if (incremented) return incrementPromise;
            incremented = true;
            incrementPromise = recordDemoEntry(sessionId, {
                userId: actor.id || null,
                role: actor.role || null,
                method,
                path: cleanPath
            }).catch((err) => {
                logger.warn({ message: "Demo quota increment warning", error: err.message });
                return currentQuota;
            });
            if (typeof trackAuditWrite === "function") {
                trackAuditWrite(incrementPromise);
            }
            return incrementPromise;
        };

        res.json = function wrappedDemoQuotaJson(body) {
            const status = res.statusCode || 200;
            const succeeded = status >= 200 && status < 300 && !(body && typeof body === "object" && body.success === false);
            if (succeeded) {
                commitWriteEntry()
                    .then((committedQuota) => {
                        setDemoQuotaHeaders(res, committedQuota);
                        originalJson(body);
                    })
                    .catch(() => {
                        setDemoQuotaHeaders(res, currentQuota);
                        originalJson(body);
                    });
                return res;
            }
            setDemoQuotaHeaders(res, currentQuota);
            return originalJson(body);
        };

        res.on("finish", () => {
            if (!incremented && res.statusCode >= 200 && res.statusCode < 300) {
                commitWriteEntry();
            }
        });

        return next();
    } catch (error) {
        logger.error({ message: "demoQuotaGuard error", error: error.message });
        return next(error);
    }
}

module.exports = {
    getMaxDemoEntries,
    initDemoQuota,
    getDemoQuotaStatus,
    recordDemoEntry,
    demoQuotaGuard
};
