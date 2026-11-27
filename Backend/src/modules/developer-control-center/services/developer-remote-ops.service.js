"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
DEVELOPER CONTROL CENTER — REMOTE SYSTEM MANAGEMENT & INFRASTRUCTURE OPS SERVICE
CommonJS Only (Step 35 Remote System Management)
LOCATION: Backend/src/modules/developer-control-center/services/developer-remote-ops.service.js
================================================================================
Real, audited PostgreSQL + OS + Application remote operations exclusively for
verified DEVELOPER accounts:
  - Live Cluster & Database Health Telemetry
  - Deployment Ledger & Rollback Readiness
  - Cache Invalidation & Refresh
  - PostgreSQL ANALYZE Optimization
  - Expired Session / Idempotency Log Rotation (AuditLog preserved immutably)
  - Dynamic Feature Flags Management
*/

const os = require("os");
const fs = require("fs");
const path = require("path");
const prisma = require("../../../core/database/prisma.client");
const { environment } = require("../../../config/environment");
const { invalidateControlConfigCache, refreshControlConfig } = require("../../../core/middleware/rcce-audit.middleware");
const AppError = require("../../../core/errors/app.error");

const BACKUPS_DIR = path.resolve(__dirname, "..", "..", "..", "..", "backups");
const DEPLOYMENT_HISTORY_KEY = "DEVELOPER_DEPLOYMENT_HISTORY";
const FEATURE_FLAGS_KEY = "DEVELOPER_FEATURE_FLAGS";

async function writeDeveloperAudit({ actor, action, affectedRecord, description, ipAddress, metadata }) {
    return prisma.auditLog.create({
        data: {
            userId: actor?.id || null,
            role: actor?.role || "DEVELOPER",
            action,
            module: "DEVELOPER_REMOTE_OPS",
            affectedRecord: affectedRecord || "SYSTEM",
            outcome: "SUCCESS",
            description,
            ipAddress: ipAddress || null,
            metadata: metadata || undefined
        }
    });
}

/**
 * 1. Live Cluster, Process & PostgreSQL Health Telemetry
 */
async function getClusterHealth() {
    const dbStart = Date.now();
    const pgStatsRows = await prisma.$queryRaw`
        SELECT
            current_database() AS database_name,
            current_setting('max_connections')::int AS max_connections,
            (SELECT count(*)::int FROM pg_stat_activity) AS active_connections,
            pg_database_size(current_database())::bigint AS database_size_bytes
    `;
    const dbLatencyMs = Date.now() - dbStart;
    const pgRow = pgStatsRows && pgStatsRows[0] ? pgStatsRows[0] : {};

    const activeSessions = await prisma.session.count({ where: { expiresAt: { gt: new Date() } } });
    const expiredSessions = await prisma.session.count({ where: { expiresAt: { lte: new Date() } } });
    const totalTenants = await prisma.tenant.count();
    const lockedTenants = await prisma.tenant.count({ where: { systemLocked: true } });
    const unresolvedErrors = await prisma.systemErrorLog.count({ where: { resolved: false } });

    const mem = process.memoryUsage();
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();

    return {
        checkedAt: new Date().toISOString(),
        serviceName: environment.RENDER_SERVICE_NAME,
        environment: environment.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        hostname: os.hostname(),
        uptimeSeconds: Math.floor(process.uptime()),
        cpu: {
            cores: os.cpus().length,
            loadAverage1m: Number((os.loadavg()[0] || 0).toFixed(2)),
            loadAverage5m: Number((os.loadavg()[1] || 0).toFixed(2)),
            loadAverage15m: Number((os.loadavg()[2] || 0).toFixed(2))
        },
        memory: {
            processRssMb: Math.round(mem.rss / (1024 * 1024)),
            heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
            heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
            hostTotalMb: Math.round(totalMemBytes / (1024 * 1024)),
            hostFreeMb: Math.round(freeMemBytes / (1024 * 1024))
        },
        database: {
            engine: "PostgreSQL",
            name: pgRow.database_name || "gbs_hospital",
            latencyMs: dbLatencyMs,
            activeConnections: Number(pgRow.active_connections || 0),
            maxConnections: Number(pgRow.max_connections || 100),
            sizeMb: Number((Number(pgRow.database_size_bytes || 0) / (1024 * 1024)).toFixed(2))
        },
        runtimeCounts: {
            activeSessions,
            expiredSessions,
            totalTenants,
            lockedTenants,
            unresolvedErrors
        }
    };
}

/**
 * 2. Deployment History & Checkpoint Ledger
 */
async function getDeploymentHistory() {
    const rec = await prisma.systemConfiguration.findUnique({
        where: { configKey: DEPLOYMENT_HISTORY_KEY }
    });
    const entries = Array.isArray(rec?.configValue?.entries) ? rec.configValue.entries : [];

    return {
        serviceName: environment.RENDER_SERVICE_NAME,
        publicUrl: environment.PRODUCTION_PUBLIC_URL,
        environment: environment.NODE_ENV,
        totalRecordedDeployments: entries.length,
        entries
    };
}

async function recordDeploymentCheckpoint({ version, gitCommit, notes, status = "DEPLOYED", actor, ipAddress }) {
    const existing = await prisma.systemConfiguration.findUnique({
        where: { configKey: DEPLOYMENT_HISTORY_KEY }
    });
    const prevEntries = Array.isArray(existing?.configValue?.entries) ? existing.configValue.entries : [];

    const entry = {
        id: `DEP-${Date.now()}`,
        version: String(version || "2.0.0").trim(),
        gitCommit: gitCommit ? String(gitCommit).trim() : null,
        environment: environment.NODE_ENV,
        serviceName: environment.RENDER_SERVICE_NAME,
        status: String(status).toUpperCase(),
        notes: String(notes || "Verified production deployment checkpoint").trim(),
        recordedBy: actor?.email || actor?.id || "DEVELOPER",
        recordedAt: new Date().toISOString()
    };

    const updatedEntries = [entry, ...prevEntries].slice(0, 50);

    await prisma.systemConfiguration.upsert({
        where: { configKey: DEPLOYMENT_HISTORY_KEY },
        update: {
            configValue: { entries: updatedEntries },
            updatedById: actor?.id || null,
            updatedByRole: actor?.role || "DEVELOPER"
        },
        create: {
            configKey: DEPLOYMENT_HISTORY_KEY,
            category: "DEPLOYMENT",
            description: "Audited Developer deployment checkpoint history",
            configValue: { entries: updatedEntries },
            updatedById: actor?.id || null,
            updatedByRole: actor?.role || "DEVELOPER"
        }
    });

    await writeDeveloperAudit({
        actor,
        action: "DEVELOPER_DEPLOYMENT_CHECKPOINT_RECORDED",
        affectedRecord: entry.id,
        description: `Recorded deployment checkpoint ${entry.version} (${entry.status})`,
        ipAddress,
        metadata: entry
    });

    return entry;
}

/**
 * 3. Clear & Refresh In-Memory Control Caches
 */
async function clearSystemCaches({ actor, ipAddress }) {
    invalidateControlConfigCache();
    const refreshed = await refreshControlConfig(true);

    await writeDeveloperAudit({
        actor,
        action: "DEVELOPER_CACHE_CLEARED",
        affectedRecord: "RCCE_CONTROL_CACHE",
        description: "Developer invalidated and rehydrated system control and permission override caches.",
        ipAddress
    });

    return {
        clearedAt: new Date().toISOString(),
        cachesCleared: ["RCCE_CONTROL_CONFIG_CACHE", "DYNAMIC_PERMISSION_OVERRIDE_CACHE"],
        maintenanceModeActive: Boolean(refreshed?.maintenanceMode?.enabled)
    };
}

/**
 * 4. Optimize PostgreSQL Query Planner Statistics (Safe ANALYZE)
 */
async function optimizeDatabase({ actor, ipAddress }) {
    const start = Date.now();
    await prisma.$executeRawUnsafe('ANALYZE "User"');
    await prisma.$executeRawUnsafe('ANALYZE "Patient"');
    await prisma.$executeRawUnsafe('ANALYZE "AuditLog"');
    await prisma.$executeRawUnsafe('ANALYZE "Session"');
    await prisma.$executeRawUnsafe('ANALYZE "Tenant"');
    const durationMs = Date.now() - start;

    await writeDeveloperAudit({
        actor,
        action: "DEVELOPER_DATABASE_OPTIMIZED",
        affectedRecord: "POSTGRESQL_ANALYZE",
        description: `Executed PostgreSQL ANALYZE planner optimization across core tables in ${durationMs}ms.`,
        ipAddress,
        metadata: { durationMs, tablesAnalyzed: ["User", "Patient", "AuditLog", "Session", "Tenant"] }
    });

    return {
        executedAt: new Date().toISOString(),
        operation: "POSTGRESQL_ANALYZE",
        tablesAnalyzed: ["User", "Patient", "AuditLog", "Session", "Tenant"],
        durationMs
    };
}

/**
 * 5. Rotate & Prune Expired Ephemeral Records (Sessions & Idempotency Keys ONLY; AuditLog immutable)
 */
async function rotateAndPruneLogs({ actor, ipAddress }) {
    const now = new Date();
    const expiredSessionsRes = await prisma.session.deleteMany({
        where: { expiresAt: { lte: now } }
    });
    const expiredIdempotencyRes = await prisma.idempotencyRecord.deleteMany({
        where: { expiresAt: { lte: now } }
    });

    const summary = {
        executedAt: now.toISOString(),
        expiredSessionsPruned: expiredSessionsRes.count,
        expiredIdempotencyRecordsPruned: expiredIdempotencyRes.count,
        auditLogsPreservedImmutably: true
    };

    await writeDeveloperAudit({
        actor,
        action: "DEVELOPER_LOGS_AND_SESSIONS_ROTATED",
        affectedRecord: "SESSION_AND_IDEMPOTENCY_HOUSEKEEPING",
        description: `Pruned ${summary.expiredSessionsPruned} expired session(s) and ${summary.expiredIdempotencyRecordsPruned} expired idempotency record(s). AuditLog preserved immutably.`,
        ipAddress,
        metadata: summary
    });

    return summary;
}

/**
 * 6. Dynamic Enterprise Feature Flags (PostgreSQL-persisted)
 */
const DEFAULT_FEATURE_FLAGS = Object.freeze({
    AI_CLINICAL_ASSISTANCE: { enabled: true, description: "4-Step Human-Approved AI Clinical Decision Support" },
    WEBRTC_TELEMEDICINE: { enabled: true, description: "Doctor-Patient Encrypted WebRTC Video Visits" },
    VOICE_BIOMETRIC_VAULT: { enabled: true, description: "Central Voiceprint & 4-Step Facial Security Vault" },
    NHIA_ECLAIMS_EXPORT: { enabled: true, description: "NHIA G-DRG XML/JSON E-Claims Compiler" },
    AUTOMATED_TRIAL_SWEEP: { enabled: true, description: "Day 14/7/3/1/0 Automated Subscription Countdown Sweep" }
});

async function listFeatureFlags() {
    const rec = await prisma.systemConfiguration.findUnique({
        where: { configKey: FEATURE_FLAGS_KEY }
    });
    const stored = rec?.configValue && typeof rec.configValue === "object" ? rec.configValue : {};
    const merged = {};

    for (const [k, def] of Object.entries(DEFAULT_FEATURE_FLAGS)) {
        merged[k] = {
            key: k,
            enabled: stored[k]?.enabled !== undefined ? Boolean(stored[k].enabled) : def.enabled,
            description: stored[k]?.description || def.description,
            updatedAt: stored[k]?.updatedAt || null,
            updatedBy: stored[k]?.updatedBy || "SYSTEM_DEFAULT"
        };
    }

    for (const [k, val] of Object.entries(stored)) {
        if (!merged[k]) {
            merged[k] = {
                key: k,
                enabled: Boolean(val?.enabled),
                description: val?.description || "Custom enterprise feature flag",
                updatedAt: val?.updatedAt || null,
                updatedBy: val?.updatedBy || "DEVELOPER"
            };
        }
    }

    return {
        totalFlags: Object.keys(merged).length,
        flags: Object.values(merged)
    };
}

async function setFeatureFlag({ flagKey, enabled, description, actor, ipAddress }) {
    const normalizedKey = String(flagKey || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (!normalizedKey || normalizedKey.length < 3) {
        throw new AppError("A valid feature flag key (min 3 characters) is required.", 400, "INVALID_FEATURE_FLAG");
    }

    const existing = await prisma.systemConfiguration.findUnique({
        where: { configKey: FEATURE_FLAGS_KEY }
    });
    const currentMap = existing?.configValue && typeof existing.configValue === "object" ? { ...existing.configValue } : {};

    currentMap[normalizedKey] = {
        enabled: Boolean(enabled),
        description: description || DEFAULT_FEATURE_FLAGS[normalizedKey]?.description || "Custom enterprise feature flag",
        updatedAt: new Date().toISOString(),
        updatedBy: actor?.email || actor?.id || "DEVELOPER"
    };

    await prisma.systemConfiguration.upsert({
        where: { configKey: FEATURE_FLAGS_KEY },
        update: {
            configValue: currentMap,
            updatedById: actor?.id || null,
            updatedByRole: actor?.role || "DEVELOPER"
        },
        create: {
            configKey: FEATURE_FLAGS_KEY,
            category: "FEATURE_FLAGS",
            description: "Developer-controlled enterprise feature flags",
            configValue: currentMap,
            updatedById: actor?.id || null,
            updatedByRole: actor?.role || "DEVELOPER"
        }
    });

    await writeDeveloperAudit({
        actor,
        action: "DEVELOPER_FEATURE_FLAG_UPDATED",
        affectedRecord: normalizedKey,
        description: `Developer set feature flag ${normalizedKey} = ${Boolean(enabled)}`,
        ipAddress,
        metadata: { flagKey: normalizedKey, enabled: Boolean(enabled) }
    });

    return {
        key: normalizedKey,
        ...currentMap[normalizedKey]
    };
}

/**
 * 7. Rollback & Disaster Recovery Readiness Manifest
 */
async function getRollbackReadiness() {
    let backupFiles = [];
    if (fs.existsSync(BACKUPS_DIR)) {
        backupFiles = fs
            .readdirSync(BACKUPS_DIR)
            .filter((f) => f.endsWith(".json") && f !== "facility-branding.json")
            .map((filename) => {
                const full = path.join(BACKUPS_DIR, filename);
                const stat = fs.statSync(full);
                return {
                    filename,
                    sizeBytes: stat.size,
                    modifiedAt: stat.mtime.toISOString()
                };
            })
            .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
    }

    const deployments = await getDeploymentHistory();

    return {
        checkedAt: new Date().toISOString(),
        rtoTarget: "<= 2 Hours",
        rpoTarget: "<= 2 Hours",
        patientSafetyEmergencyBypassActive: true,
        availableBackupsCount: backupFiles.length,
        latestBackup: backupFiles[0] || null,
        recentDeployments: deployments.entries.slice(0, 5),
        renderRollbackGuide: "Render Dashboard -> gbs-hospital-system -> Events -> Rollback to Previous Verified Deploy"
    };
}

module.exports = {
    getClusterHealth,
    getDeploymentHistory,
    recordDeploymentCheckpoint,
    clearSystemCaches,
    optimizeDatabase,
    rotateAndPruneLogs,
    listFeatureFlags,
    setFeatureFlag,
    getRollbackReadiness
};
