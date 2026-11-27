"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
DATABASE CONNECTION POOL, STORAGE & THRESHOLD ALERT MONITOR
Production Hardened • CommonJS Only • 80% Warning / 95% Critical Alerts
LOCATION: Backend/src/core/database/database.monitor.js
================================================================================
*/

const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const prisma = require("./prisma.client");
const { getPoolRuntimeState } = require("./prisma.client");
const databaseConfig = require("../../config/database.config");

const MONITOR_KEY = "__GBS_DATABASE_MONITOR__";
const BACKUPS_DIR = path.resolve(__dirname, "..", "..", "..", "backups");

if (!global[MONITOR_KEY]) {
    global[MONITOR_KEY] = {
        status: "starting",
        checks: 0,
        failures: 0,
        lastCheck: null,
        lastError: null,
        lastTelemetry: null,
        alertsHistory: []
    };
}

const metrics = global[MONITOR_KEY];

/**
 * Pure threshold evaluator (80% WARNING, 95% CRITICAL) for both connection pool & storage.
 */
function evaluateUtilizationAlerts({
    poolUtilizationPct = 0,
    serverUtilizationPct = 0,
    storageUtilizationPct = 0,
    warnPct = databaseConfig.pool.warnThresholdPct || 80,
    criticalPct = databaseConfig.pool.criticalThresholdPct || 95
}) {
    const peakConnPct = Math.max(Number(poolUtilizationPct || 0), Number(serverUtilizationPct || 0));
    const storagePct = Number(storageUtilizationPct || 0);

    let connectionAlertLevel = "OK";
    if (peakConnPct >= criticalPct) connectionAlertLevel = "CRITICAL";
    else if (peakConnPct >= warnPct) connectionAlertLevel = "WARNING";

    let storageAlertLevel = "OK";
    if (storagePct >= criticalPct) storageAlertLevel = "CRITICAL";
    else if (storagePct >= warnPct) storageAlertLevel = "WARNING";

    const alerts = [];
    if (connectionAlertLevel === "CRITICAL") {
        alerts.push({
            category: "DB_CONNECTION_POOL",
            severity: "CRITICAL",
            utilizationPct: peakConnPct,
            thresholdPct: criticalPct,
            message: `CRITICAL: PostgreSQL connection utilization at ${peakConnPct}% (>= ${criticalPct}%). Enable PgBouncer or upgrade PostgreSQL plan immediately.`
        });
    } else if (connectionAlertLevel === "WARNING") {
        alerts.push({
            category: "DB_CONNECTION_POOL",
            severity: "WARNING",
            utilizationPct: peakConnPct,
            thresholdPct: warnPct,
            message: `WARNING: PostgreSQL connection utilization at ${peakConnPct}% (>= ${warnPct}%). Monitor active queries and evaluate PgBouncer pooling.`
        });
    }

    if (storageAlertLevel === "CRITICAL") {
        alerts.push({
            category: "DB_STORAGE",
            severity: "CRITICAL",
            utilizationPct: storagePct,
            thresholdPct: criticalPct,
            message: `CRITICAL: PostgreSQL storage utilization at ${storagePct}% (>= ${criticalPct}%). Expand disk capacity or archive historical blobs.`
        });
    } else if (storageAlertLevel === "WARNING") {
        alerts.push({
            category: "DB_STORAGE",
            severity: "WARNING",
            utilizationPct: storagePct,
            thresholdPct: warnPct,
            message: `WARNING: PostgreSQL storage utilization at ${storagePct}% (>= ${warnPct}%). Schedule storage upgrade.`
        });
    }

    const overallLevel =
        connectionAlertLevel === "CRITICAL" || storageAlertLevel === "CRITICAL"
            ? "CRITICAL"
            : connectionAlertLevel === "WARNING" || storageAlertLevel === "WARNING"
                ? "WARNING"
                : "OK";

    return {
        connectionAlertLevel,
        storageAlertLevel,
        overallLevel,
        alerts
    };
}

function getLocalBackupFootprint() {
    let totalBytes = 0;
    let fileCount = 0;
    try {
        if (fs.existsSync(BACKUPS_DIR)) {
            const entries = fs.readdirSync(BACKUPS_DIR);
            for (const f of entries) {
                if (f.endsWith(".json") && f !== "facility-branding.json") {
                    const st = fs.statSync(path.join(BACKUPS_DIR, f));
                    if (st.isFile()) {
                        totalBytes += st.size;
                        fileCount += 1;
                    }
                }
            }
        }
    } catch (_err) {
        // Non-fatal filesystem inspection guard
    }
    return {
        backupFilesCount: fileCount,
        localBackupsMb: Number((totalBytes / (1024 * 1024)).toFixed(2))
    };
}

async function collectPoolAndStorageTelemetry() {
    const startedAt = Date.now();
    const runtimePool = getPoolRuntimeState();
    const effective = runtimePool.effectivePool || databaseConfig.pool;
    const configuredPoolLimit = Number(effective.connectionLimit || databaseConfig.pool.connectionLimit);
    const instanceCount = Number(effective.instanceCount || databaseConfig.pool.instanceCount || 1);

    const rows = await prisma.$queryRaw`
        SELECT
            current_database() AS database_name,
            current_setting('max_connections')::int AS max_connections,
            (SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database()) AS total_db_connections,
            (SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database() AND state = 'active') AS active_connections,
            (SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database() AND state = 'idle') AS idle_connections,
            (SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database() AND state = 'idle in transaction') AS idle_in_transaction,
            (SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock') AS waiting_lock_requests,
            (SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database() AND state = 'active' AND wait_event_type IS NOT NULL AND wait_event_type NOT IN ('Client', 'Activity')) AS waiting_requests,
            pg_database_size(current_database())::bigint AS database_size_bytes
    `;
    const latencyMs = Date.now() - startedAt;
    const r = (rows && rows[0]) || {};

    const postgresMaxConnections = Number(r.max_connections || 100);
    const totalDbConnections = Number(r.total_db_connections || 0);
    const activeConnections = Number(r.active_connections || 0);
    const idleConnections = Number(r.idle_connections || 0);
    const idleInTransaction = Number(r.idle_in_transaction || 0);
    const waitingRequests = Number(r.waiting_requests || 0);
    const waitingLockRequests = Number(r.waiting_lock_requests || 0);
    const dbSizeBytes = Number(r.database_size_bytes || 0);
    const sizeMb = Number((dbSizeBytes / (1024 * 1024)).toFixed(2));

    // Safe application pool ceiling = 75% of PostgreSQL max_connections (reserves 25% for rolling deploys, admin & migrations)
    const safeMaxAppConnections = Math.max(5, Math.floor(postgresMaxConnections * 0.75));
    const aggregateConfiguredAppPool = configuredPoolLimit * instanceCount;

    const poolUtilizationPct = Number(
        Math.min(100, (totalDbConnections / Math.max(1, aggregateConfiguredAppPool)) * 100).toFixed(1)
    );
    const serverUtilizationPct = Number(
        Math.min(100, (totalDbConnections / Math.max(1, postgresMaxConnections)) * 100).toFixed(1)
    );

    const quotaMb = Number(databaseConfig.storage.dbQuotaMb || 1024);
    const storageUtilizationPct = Number(
        Math.min(100, (sizeMb / Math.max(1, quotaMb)) * 100).toFixed(2)
    );

    const thresholdEval = evaluateUtilizationAlerts({
        poolUtilizationPct,
        serverUtilizationPct,
        storageUtilizationPct,
        warnPct: databaseConfig.pool.warnThresholdPct,
        criticalPct: databaseConfig.pool.criticalThresholdPct
    });

    for (const alert of thresholdEval.alerts) {
        const entry = { ...alert, recordedAt: new Date().toISOString() };
        metrics.alertsHistory = [entry, ...metrics.alertsHistory].slice(0, 30);
        if (alert.severity === "CRITICAL") {
            logger.error({ type: "DB_POOL_CRITICAL_ALERT", ...entry });
        } else {
            logger.warn({ type: "DB_POOL_WARNING_ALERT", ...entry });
        }
    }

    const backups = getLocalBackupFootprint();

    const telemetry = {
        checkedAt: new Date().toISOString(),
        engine: "PostgreSQL",
        databaseName: r.database_name || "gbs_hospital",
        latencyMs,
        pool: {
            configuredPerInstanceLimit: configuredPoolLimit,
            instanceCount,
            aggregateConfiguredPool: aggregateConfiguredAppPool,
            postgresMaxConnections,
            safeMaxAppConnections,
            safeToScaleMoreInstances: aggregateConfiguredAppPool < safeMaxAppConnections,
            totalConnections: totalDbConnections,
            activeConnections,
            idleConnections,
            idleInTransaction,
            waitingRequests,
            waitingLockRequests,
            poolUtilizationPct,
            serverUtilizationPct,
            poolTimeoutSec: effective.poolTimeoutSec || databaseConfig.pool.poolTimeoutSec,
            connectTimeoutSec: effective.connectTimeoutSec || databaseConfig.pool.connectTimeoutSec,
            socketTimeoutSec: effective.socketTimeoutSec || databaseConfig.pool.socketTimeoutSec,
            pgbouncerEnabled: Boolean(effective.pgbouncerEnabled),
            pgbouncerCompatible: true,
            connectionTimeouts: runtimePool.connectionTimeouts,
            failedConnections: runtimePool.failedConnections,
            recoveredConnections: runtimePool.recoveredConnections,
            lastFailureCode: runtimePool.lastFailureCode,
            warnThresholdPct: databaseConfig.pool.warnThresholdPct,
            criticalThresholdPct: databaseConfig.pool.criticalThresholdPct,
            alertLevel: thresholdEval.connectionAlertLevel
        },
        storage: {
            databaseSizeMb: sizeMb,
            databaseQuotaMb: quotaMb,
            remainingMb: Number(Math.max(0, quotaMb - sizeMb).toFixed(2)),
            storageUtilizationPct,
            alertLevel: thresholdEval.storageAlertLevel,
            ...backups
        },
        overallAlertLevel: thresholdEval.overallLevel,
        activeAlerts: thresholdEval.alerts
    };

    metrics.status = "healthy";
    metrics.lastCheck = new Date();
    metrics.lastTelemetry = telemetry;
    return telemetry;
}

async function monitorDatabase() {
    metrics.checks += 1;
    try {
        const telemetry = await collectPoolAndStorageTelemetry();
        logger.debug({
            message: "Database pool monitor check passed",
            activeConnections: telemetry.pool.activeConnections,
            idleConnections: telemetry.pool.idleConnections,
            poolUtilizationPct: telemetry.pool.poolUtilizationPct,
            alertLevel: telemetry.overallAlertLevel
        });

        return Object.freeze({
            status: "healthy",
            database: "PostgreSQL",
            timestamp: metrics.lastCheck,
            telemetry
        });
    } catch (error) {
        metrics.status = "unhealthy";
        metrics.failures += 1;
        metrics.lastError = error.message;
        metrics.lastCheck = new Date();

        logger.error({
            message: "Database monitor check failed",
            error: error.message
        });

        return Object.freeze({
            status: "unhealthy",
            database: "PostgreSQL",
            timestamp: metrics.lastCheck
        });
    }
}

function getDatabaseMonitorStatus() {
    return Object.freeze({
        ...metrics
    });
}

module.exports = {
    monitorDatabase,
    collectPoolAndStorageTelemetry,
    evaluateUtilizationAlerts,
    getDatabaseMonitorStatus
};
