"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ENTERPRISE POSTGRESQL CONNECTION POOL & INFRASTRUCTURE CONFIGURATION
CommonJS Only — Safe Render.com + PgBouncer + Multi-Instance Scaling
LOCATION: Backend/src/config/database.config.js
================================================================================
*/

function clampInt(value, fallback, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    const intVal = Math.floor(parsed);
    if (intVal < min) return min;
    if (intVal > max) return max;
    return intVal;
}

const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";
const isTest = String(process.env.NODE_ENV || "").toLowerCase() === "test";

// Default per-instance connection limit leaves ample headroom for Render rolling deploys (2x overlap),
// Prisma bootstrap/migration jobs, and PostgreSQL superuser reserved connections.
const defaultConnectionLimit = isTest ? 8 : isProduction ? 10 : 12;

const poolConfig = Object.freeze({
    connectionLimit: clampInt(
        process.env.DB_POOL_MAX || process.env.DB_CONNECTION_LIMIT,
        defaultConnectionLimit,
        2,
        50
    ),
    min: clampInt(process.env.DB_POOL_MIN, 2, 1, 10),
    poolTimeoutSec: clampInt(process.env.DB_POOL_TIMEOUT, 20, 5, 120),
    connectTimeoutSec: clampInt(process.env.DB_CONNECT_TIMEOUT, 10, 3, 60),
    socketTimeoutSec: clampInt(process.env.DB_SOCKET_TIMEOUT, 30, 10, 180),
    idleInTransactionTimeoutMs: clampInt(process.env.DB_IDLE_IN_TX_TIMEOUT_MS, 30000, 5000, 120000),
    instanceCount: clampInt(process.env.RENDER_INSTANCE_COUNT || process.env.DB_APP_INSTANCES, 1, 1, 20),
    pgbouncerExplicit: String(process.env.DB_PGBOUNCER || "false").toLowerCase() === "true",
    warnThresholdPct: clampInt(process.env.DB_POOL_WARN_PCT, 80, 50, 94),
    criticalThresholdPct: clampInt(process.env.DB_POOL_CRITICAL_PCT, 95, 81, 99)
});

/**
 * Enriches a PostgreSQL DATABASE_URL with safe Prisma connection pool parameters
 * without overwriting parameters already explicitly provided in the URL.
 * Supports Render Managed PostgreSQL and PgBouncer transaction-pooling mode.
 */
function buildOptimizedDatabaseUrl(rawUrl, overrides = {}) {
    if (!rawUrl || typeof rawUrl !== "string") {
        return {
            url: rawUrl || "",
            effective: {
                connectionLimit: overrides.connectionLimit || poolConfig.connectionLimit,
                poolTimeoutSec: overrides.poolTimeoutSec || poolConfig.poolTimeoutSec,
                connectTimeoutSec: overrides.connectTimeoutSec || poolConfig.connectTimeoutSec,
                socketTimeoutSec: overrides.socketTimeoutSec || poolConfig.socketTimeoutSec,
                pgbouncerEnabled: Boolean(overrides.pgbouncer ?? poolConfig.pgbouncerExplicit)
            }
        };
    }

    try {
        const parsed = new URL(rawUrl);
        const connLimit = clampInt(
            parsed.searchParams.get("connection_limit") || overrides.connectionLimit || poolConfig.connectionLimit,
            poolConfig.connectionLimit,
            2,
            50
        );
        const poolTimeout = clampInt(
            parsed.searchParams.get("pool_timeout") || overrides.poolTimeoutSec || poolConfig.poolTimeoutSec,
            poolConfig.poolTimeoutSec,
            5,
            120
        );
        const connectTimeout = clampInt(
            parsed.searchParams.get("connect_timeout") || overrides.connectTimeoutSec || poolConfig.connectTimeoutSec,
            poolConfig.connectTimeoutSec,
            3,
            60
        );
        const socketTimeout = clampInt(
            parsed.searchParams.get("socket_timeout") || overrides.socketTimeoutSec || poolConfig.socketTimeoutSec,
            poolConfig.socketTimeoutSec,
            10,
            180
        );

        const pgbouncerDetected =
            String(parsed.searchParams.get("pgbouncer") || "").toLowerCase() === "true" ||
            parsed.port === "6432" ||
            Boolean(overrides.pgbouncer ?? poolConfig.pgbouncerExplicit);

        if (!parsed.searchParams.has("connection_limit")) {
            parsed.searchParams.set("connection_limit", String(connLimit));
        }
        if (!parsed.searchParams.has("pool_timeout")) {
            parsed.searchParams.set("pool_timeout", String(poolTimeout));
        }
        if (!parsed.searchParams.has("connect_timeout")) {
            parsed.searchParams.set("connect_timeout", String(connectTimeout));
        }
        if (!parsed.searchParams.has("socket_timeout")) {
            parsed.searchParams.set("socket_timeout", String(socketTimeout));
        }
        if (pgbouncerDetected) {
            parsed.searchParams.set("pgbouncer", "true");
            if (!parsed.searchParams.has("statement_cache_size")) {
                parsed.searchParams.set("statement_cache_size", "0");
            }
        }

        return {
            url: parsed.toString(),
            effective: {
                connectionLimit: connLimit,
                poolTimeoutSec: poolTimeout,
                connectTimeoutSec: connectTimeout,
                socketTimeoutSec: socketTimeout,
                pgbouncerEnabled: pgbouncerDetected
            }
        };
    } catch (_err) {
        return {
            url: rawUrl,
            effective: {
                connectionLimit: poolConfig.connectionLimit,
                poolTimeoutSec: poolConfig.poolTimeoutSec,
                connectTimeoutSec: poolConfig.connectTimeoutSec,
                socketTimeoutSec: poolConfig.socketTimeoutSec,
                pgbouncerEnabled: poolConfig.pgbouncerExplicit
            }
        };
    }
}

const databaseConfig = {
    provider: "postgresql",
    url: process.env.DATABASE_URL,
    pool: {
        ...poolConfig,
        max: poolConfig.connectionLimit
    },
    storage: Object.freeze({
        dbQuotaMb: clampInt(process.env.DB_STORAGE_QUOTA_MB, 1024, 128, 1048576),
        warnThresholdPct: 80,
        criticalThresholdPct: 95
    }),
    retry: Object.freeze({
        attempts: clampInt(process.env.DB_MAX_RETRIES || process.env.DB_RETRY, 5, 1, 20),
        delay: clampInt(process.env.DB_RETRY_DELAY, 1500, 250, 30000)
    }),
    logging: process.env.DB_LOGGING === "true",
    buildOptimizedDatabaseUrl
};

module.exports = Object.freeze(databaseConfig);
