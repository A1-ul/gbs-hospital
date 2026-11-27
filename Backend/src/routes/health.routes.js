"use strict";

const router = require("express").Router();
const jwt = require("jsonwebtoken");

const { evaluateConnectionHealth } = require("../core/monitoring/connection-monitor.service");
const { developerSecurityGuard } = require("../modules/developer-control-center/services/developer-security-guard.middleware");
const { environment } = require("../config/environment");
const envConfig = require("../config/environment/environment.config");
const authMiddleware = require("../core/middleware/auth.middleware");
const authorizeRoles = require("../core/security/role.middleware");
const { ADMIN_ROLES } = require("../config/roles");
const {
    getGlobalOverviewStats,
    getEnvironmentAndDataIdentification,
    getFacilityBranding,
    updateFacilityBranding
} = require("../modules/tenant-management/backup-and-environment.service");

function extractOptionalActor(req) {
    try {
        const authHeader = req.headers && req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
        const secret = environment.JWT_SECRET || process.env.JWT_SECRET;
        if (!secret) return null;
        return jwt.verify(authHeader.slice(7).trim(), secret, { algorithms: ["HS256"] });
    } catch (_err) {
        return null;
    }
}

router.get("/", async (req, res) => {
    const report = await evaluateConnectionHealth({ timeoutMs: 5000 });
    const dbConnected = Boolean(report.components?.database?.connected);
    const engineHealthy = Boolean(report.components?.centralEngine?.healthy);

    res.status(report.httpStatus).json({
        status: dbConnected && engineHealthy ? "healthy" : "degraded",
        overallStatus: report.overallStatus,
        server: "running",
        centralEngine: report.components.centralEngine.status,
        database: dbConnected ? "connected" : "offline",
        databaseStatus: report.components.database.status,
        databaseLatencyMs: report.components.database.latencyMs,
        avgApiResponseTimeMs: report.apiPerformance.avgResponseTimeMs,
        lastSuccessfulConnection: report.telemetry.lastSuccessfulConnection,
        engine: "PostgreSQL",
        environment: envConfig.activeEnvironment,
        demoModeEnabled: envConfig.demoModeEnabled,
        serviceName: envConfig.renderServiceName,
        timestamp: new Date(),
        uptime: process.uptime(),
        requestId: req.requestId || null
    });
});

// Developer-Only Full Central Engine & Database Connection Diagnostics (Zero Credential Leakage)
router.get(
    "/connection-diagnostics",
    authMiddleware,
    developerSecurityGuard,
    async (req, res, next) => {
        try {
            const report = await evaluateConnectionHealth({ timeoutMs: 5000 });
            return res.status(200).json({
                success: true,
                data: {
                    environment: envConfig.activeEnvironment,
                    serviceName: envConfig.renderServiceName,
                    productionPublicUrl: envConfig.productionPublicUrl,
                    overallStatus: report.overallStatus,
                    components: report.components,
                    apiPerformance: report.apiPerformance,
                    telemetry: report.telemetry
                }
            });
        } catch (err) {
            next(err);
        }
    }
);

// Real-time PostgreSQL Global Overview Statistics (Zero Hardcoded Data)
// Unauthenticated requests receive ONLY non-PII aggregate metrics & public facility branding.
router.get("/overview-stats", async (req, res, next) => {
    try {
        const actor = extractOptionalActor(req);
        const stats = await getGlobalOverviewStats();

        if (!actor) {
            return res.status(200).json({
                success: true,
                data: {
                    environment: stats.environment,
                    databaseEngine: stats.databaseEngine,
                    timestamp: stats.timestamp,
                    uptimeSeconds: stats.uptimeSeconds,
                    facilityBranding: stats.facilityBranding,
                    metrics: stats.metrics,
                    opdEncountersToday: [],
                    recentAuditLogs: [],
                    recentNotifications: [],
                    restrictedView: true
                }
            });
        }

        const isAdminOrDev = ADMIN_ROLES.includes(actor.role);
        return res.status(200).json({
            success: true,
            data: {
                ...stats,
                recentAuditLogs: isAdminOrDev ? stats.recentAuditLogs : []
            }
        });
    } catch (err) {
        next(err);
    }
});

// Environment & Data Identification Summary
// Detailed DB host/table diagnostics restricted to authenticated Admins & Developer.
router.get("/environment-info", async (req, res, next) => {
    try {
        const actor = extractOptionalActor(req);
        const isAdminOrDev = Boolean(actor && ADMIN_ROLES.includes(actor.role));

        if (!isAdminOrDev) {
            return res.status(200).json({
                success: true,
                data: {
                    activeEnvironment: envConfig.activeEnvironment,
                    isProduction: envConfig.isProduction,
                    demoModeEnabled: envConfig.demoModeEnabled,
                    officialCompanyEmail: envConfig.officialCompanyEmail,
                    cloudHostingProvider: envConfig.cloudHostingProvider,
                    renderServiceName: envConfig.renderServiceName,
                    productionPublicUrl: envConfig.productionPublicUrl
                }
            });
        }

        const info = await getEnvironmentAndDataIdentification();
        return res.status(200).json({
            success: true,
            data: {
                ...info,
                demoModeEnabled: envConfig.demoModeEnabled,
                renderServiceName: envConfig.renderServiceName,
                productionPublicUrl: envConfig.productionPublicUrl
            }
        });
    } catch (err) {
        next(err);
    }
});

// Hospital Facility Branding
// GET is public so login screens display the hospital's name & logo.
// PUT/POST are strictly restricted to authenticated Administrators, Hospital Directors & Developer.
router.get("/facility-branding", async (req, res, next) => {
    try {
        const branding = await getFacilityBranding();
        return res.status(200).json({
            success: true,
            data: branding
        });
    } catch (err) {
        next(err);
    }
});

router.put(
    "/facility-branding",
    authMiddleware,
    authorizeRoles(...ADMIN_ROLES),
    async (req, res, next) => {
        try {
            const actorLabel = req.user?.email || req.user?.role || "Administrator";
            const branding = await updateFacilityBranding(req.body || {}, actorLabel);
            return res.status(200).json({
                success: true,
                message: `Hospital facility name updated to "${branding.hospitalName}". Main system name remains "${branding.mainSystemName}".`,
                data: branding
            });
        } catch (err) {
            next(err);
        }
    }
);

router.post(
    "/facility-branding",
    authMiddleware,
    authorizeRoles(...ADMIN_ROLES),
    async (req, res, next) => {
        try {
            const actorLabel = req.user?.email || req.user?.role || "Administrator";
            const branding = await updateFacilityBranding(req.body || {}, actorLabel);
            return res.status(200).json({
                success: true,
                message: `Hospital facility name updated to "${branding.hospitalName}". Main system name remains "${branding.mainSystemName}".`,
                data: branding
            });
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
