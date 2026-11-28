"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
INTELLIGENT CENTRAL ENGINE & DATABASE CONNECTION MONITOR
Production Hardened • CommonJS Only • Zero Mock Health Responses
LOCATION: Backend/src/core/monitoring/connection-monitor.service.js
================================================================================
Independently probes:
  1. Backend Express Runtime (status + process uptime + API response metrics)
  2. GBS-RCCE Central Engine (Response, Business Rules, Events, Audit, Control)
  3. PostgreSQL Database (live SELECT 1 probe + measured latency + pool state)

Tracks truthful ONLINE / DEGRADED / OFFLINE states, last successful connection,
last failure reason (strictly credential-redacted), and recent connection errors.
*/

const prisma = require("../database/prisma.client");
const { getPoolRuntimeState } = require("../database/prisma.client");
const metricsService = require("./metrics.service");
const logger = require("../utils/logger");

const STATE_KEY = "__GBS_HOSPITAL_CONNECTION_MONITOR__";
const MAX_RECENT_ERRORS = 25;

if (!global[STATE_KEY]) {
    global[STATE_KEY] = {
        startedAt: new Date().toISOString(),
        overallStatus: "ONLINE",
        backendStatus: "ONLINE",
        centralEngineStatus: "ONLINE",
        databaseStatus: "UNKNOWN",
        lastCheckAt: null,
        lastSuccessfulConnection: null,
        lastFailureAt: null,
        lastFailureReason: null,
        lastDatabaseLatencyMs: null,
        consecutiveFailures: 0,
        totalChecks: 0,
        totalRecoveries: 0,
        recentConnectionErrors: []
    };
}

const monitorState = global[STATE_KEY];

/**
 * Strip any URLs, passwords, or private connection secrets before recording or returning errors.
 */
function sanitizeErrorReason(rawMessage) {
    if (!rawMessage) return "Unknown connection issue";
    return String(rawMessage)
        .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "postgresql://[REDACTED]")
        .replace(/(password|passwd|pwd|secret|token|apikey|api_key)\s*[:=]\s*[^\s&;,"']+/gi, "$1=[REDACTED]")
        .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
        .replace(/\b(sk_live|sk_test|pk_live|pk_test)_[A-Za-z0-9]+\b/gi, "[REDACTED_KEY]")
        .slice(0, 260);
}

function recordConnectionError(component, error, codeOverride = null) {
    const reason = sanitizeErrorReason(
        typeof error === "string" ? error : (error?.message || "Connection probe failed")
    );
    const code = codeOverride || error?.code || "CONNECTION_ERROR";
    const entry = {
        timestamp: new Date().toISOString(),
        component,
        code,
        reason
    };

    monitorState.lastFailureAt = entry.timestamp;
    monitorState.lastFailureReason = `[${component}] ${reason}`;
    monitorState.recentConnectionErrors.unshift(entry);
    if (monitorState.recentConnectionErrors.length > MAX_RECENT_ERRORS) {
        monitorState.recentConnectionErrors.length = MAX_RECENT_ERRORS;
    }

    return entry;
}

/**
 * Probe GBS-RCCE Central Engine subsystems independently of PostgreSQL
 */
function probeCentralEngine() {
    try {
        const { rcce } = require("../gbs-rcce.bootstrap");
        const hasResponse = Boolean(rcce && rcce.response && typeof rcce.response.expressMiddleware === "function");
        const hasRules = Boolean(rcce && rcce.rules && typeof rcce.rules.enforce === "function");
        const hasEvents = Boolean(rcce && rcce.events && typeof rcce.events.publish === "function");
        const hasAudit = Boolean(rcce && rcce.audit && typeof rcce.audit.record === "function");
        const hasControl = Boolean(rcce && rcce.control);
        const hasError = Boolean(rcce && rcce.errors);

        const subsystems = {
            responseEngine: hasResponse,
            businessRulesEngine: hasRules,
            eventNotificationEngine: hasEvents,
            auditEngine: hasAudit,
            controlEngine: hasControl,
            errorEngine: hasError
        };
        const subsystemValues = Object.values(subsystems);
        const totalSubsystems = subsystemValues.length;
        const healthySubsystems = subsystemValues.filter(Boolean).length;
        const allReady = healthySubsystems === totalSubsystems;
        return {
            status: allReady ? "ONLINE" : (healthySubsystems > 0 ? "DEGRADED" : "OFFLINE"),
            healthy: allReady,
            healthySubsystems,
            totalSubsystems,
            subsystems
        };
    } catch (error) {
        recordConnectionError("CENTRAL_ENGINE", error, "RCCE_INIT_FAILURE");
        return {
            status: "OFFLINE",
            healthy: false,
            healthySubsystems: 0,
            totalSubsystems: 6,
            subsystems: {},
            error: sanitizeErrorReason(error.message)
        };
    }
}

/**
 * Probe PostgreSQL independently with real latency timing and timeout protection
 */
async function probeDatabase(timeoutMs = 5000) {
    const start = Date.now();
    let timer = null;
    try {
        const queryPromise = prisma.$queryRaw`SELECT 1 AS alive`;
        const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => {
                const err = new Error(`PostgreSQL health probe exceeded ${timeoutMs}ms timeout`);
                err.code = "DB_PROBE_TIMEOUT";
                reject(err);
            }, timeoutMs);
        });

        await Promise.race([queryPromise, timeoutPromise]);
        const latencyMs = Date.now() - start;
        const slowThresholdMs = Number(process.env.DB_SLOW_PROBE_MS || 1500);

        return {
            connected: true,
            status: latencyMs >= slowThresholdMs ? "DEGRADED" : "ONLINE",
            latencyMs,
            engine: "PostgreSQL"
        };
    } catch (error) {
        const latencyMs = Date.now() - start;
        recordConnectionError("DATABASE", error, error?.code || "DB_UNREACHABLE");
        logger.error({
            message: "Connection monitor database probe failed",
            code: error?.code || "DB_UNREACHABLE",
            latencyMs,
            reason: sanitizeErrorReason(error?.message)
        });
        return {
            connected: false,
            status: "OFFLINE",
            latencyMs,
            engine: "PostgreSQL",
            error: sanitizeErrorReason(error?.message)
        };
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/**
 * Compute truthful overall state from independent Backend, Central Engine, and Database probes
 */
function computeOverallStatus({ centralEngineStatus, databaseStatus }) {
    if (centralEngineStatus === "OFFLINE" && databaseStatus === "OFFLINE") {
        return "OFFLINE";
    }
    if (databaseStatus === "OFFLINE" || centralEngineStatus === "OFFLINE") {
        return "DEGRADED";
    }
    if (databaseStatus === "DEGRADED" || centralEngineStatus === "DEGRADED") {
        return "DEGRADED";
    }
    return "ONLINE";
}

/**
 * Execute a full live connection health evaluation across Backend, Central Engine & Database
 */
async function evaluateConnectionHealth({ timeoutMs = 5000 } = {}) {
    const checkStart = Date.now();
    const prevStatus = monitorState.overallStatus;

    const engineProbe = probeCentralEngine();
    const dbProbe = await probeDatabase(timeoutMs);

    const overallStatus = computeOverallStatus({
        centralEngineStatus: engineProbe.status,
        databaseStatus: dbProbe.status
    });

    const nowIso = new Date().toISOString();
    monitorState.totalChecks += 1;
    monitorState.lastCheckAt = nowIso;
    monitorState.backendStatus = "ONLINE";
    monitorState.centralEngineStatus = engineProbe.status;
    monitorState.databaseStatus = dbProbe.status;
    monitorState.lastDatabaseLatencyMs = dbProbe.latencyMs;
    monitorState.overallStatus = overallStatus;

    if (dbProbe.connected && engineProbe.healthy) {
        if (monitorState.consecutiveFailures > 0 || prevStatus === "OFFLINE" || prevStatus === "DEGRADED") {
            monitorState.totalRecoveries += 1;
        }
        monitorState.consecutiveFailures = 0;
        monitorState.lastSuccessfulConnection = nowIso;
    } else {
        monitorState.consecutiveFailures += 1;
    }

    const metricsSnap = metricsService.getMetrics();
    const avgApiResponseMs = metricsSnap?.gauges?.["http.response_time_ms"]?.average ?? 0;
    const totalRequests = metricsSnap?.counters?.["http.requests_total"] ?? 0;
    const failed5xx = metricsSnap?.counters?.["http.requests_failed_5xx"] ?? 0;
    const poolRuntime = getPoolRuntimeState();

    return {
        overallStatus,
        httpStatus: dbProbe.connected && engineProbe.healthy ? 200 : 503,
        components: {
            backend: {
                status: "ONLINE",
                uptimeSeconds: Math.floor(process.uptime())
            },
            centralEngine: {
                status: engineProbe.status,
                name: "GBS-RCCE",
                healthy: engineProbe.healthy,
                healthySubsystems: engineProbe.healthySubsystems,
                totalSubsystems: engineProbe.totalSubsystems,
                subsystems: engineProbe.subsystems
            },
            database: {
                status: dbProbe.status,
                connected: dbProbe.connected,
                engine: "PostgreSQL",
                latencyMs: dbProbe.latencyMs,
                poolTimeouts: poolRuntime.connectionTimeouts,
                failedConnections: poolRuntime.failedConnections,
                recoveredConnections: poolRuntime.recoveredConnections
            }
        },
        apiPerformance: {
            probeDurationMs: Date.now() - checkStart,
            avgResponseTimeMs: avgApiResponseMs,
            totalRequests,
            failed5xx
        },
        telemetry: {
            startedAt: monitorState.startedAt,
            lastCheckAt: monitorState.lastCheckAt,
            lastSuccessfulConnection: monitorState.lastSuccessfulConnection,
            lastFailureAt: monitorState.lastFailureAt,
            lastFailureReason: monitorState.lastFailureReason,
            consecutiveFailures: monitorState.consecutiveFailures,
            totalChecks: monitorState.totalChecks,
            totalRecoveries: monitorState.totalRecoveries,
            serverUptimeSeconds: Math.floor(process.uptime()),
            recentConnectionErrors: [...monitorState.recentConnectionErrors]
        }
    };
}

function getMonitorSnapshot() {
    return {
        ...monitorState,
        serverUptimeSeconds: Math.floor(process.uptime()),
        recentConnectionErrors: [...monitorState.recentConnectionErrors]
    };
}

module.exports = {
    evaluateConnectionHealth,
    probeCentralEngine,
    probeDatabase,
    recordConnectionError,
    sanitizeErrorReason,
    computeOverallStatus,
    getMonitorSnapshot
};
