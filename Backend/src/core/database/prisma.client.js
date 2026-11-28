"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PRISMA DATABASE CLIENT — OPTIMIZED CONNECTION POOL SINGLETON
Production Hardened • CommonJS Only • PgBouncer & Multi-Tenant Safe
LOCATION: Backend/src/core/database/prisma.client.js
================================================================================
*/

const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");
const { environment } = require("../../config/environment");
const databaseConfig = require("../../config/database.config");
const { startPrismaMonitor } = require("./prisma.monitor");

const GLOBAL_KEY = "__GBS_HOSPITAL_PRISMA__";
const POOL_STATE_KEY = "__GBS_HOSPITAL_PRISMA_POOL_STATE__";

if (!global[POOL_STATE_KEY]) {
    global[POOL_STATE_KEY] = {
        connectionTimeouts: 0,
        failedConnections: 0,
        recoveredConnections: 0,
        lastTimeoutAt: null,
        lastFailureAt: null,
        lastFailureCode: null,
        effectivePool: null
    };
}

const poolState = global[POOL_STATE_KEY];

function createClient() {
    const rawUrl = process.env.DATABASE_URL;
    const { url: optimizedUrl, effective } = databaseConfig.buildOptimizedDatabaseUrl(rawUrl);
    poolState.effectivePool = Object.freeze({
        ...effective,
        instanceCount: databaseConfig.pool.instanceCount,
        minPool: databaseConfig.pool.min,
        warnThresholdPct: databaseConfig.pool.warnThresholdPct,
        criticalThresholdPct: databaseConfig.pool.criticalThresholdPct
    });

    const clientOptions = {
        log: environment.IS_DEVELOPMENT
            ? [{ emit: "event", level: "query" }, "warn", "error"]
            : [{ emit: "event", level: "query" }, "error"],
        errorFormat: "minimal",
        transactionOptions: {
            maxWait: Math.min(15000, effective.poolTimeoutSec * 1000),
            timeout: 25000
        }
    };

    if (optimizedUrl) {
        clientOptions.datasources = {
            db: { url: optimizedUrl }
        };
    }

    const prisma = new PrismaClient(clientOptions);
    startPrismaMonitor(prisma);

    return prisma;
}

const prisma = global[GLOBAL_KEY] || createClient();

if (!global[GLOBAL_KEY]) {
    global[GLOBAL_KEY] = prisma;
}

function recordPoolTimeout(code = "P2024") {
    poolState.connectionTimeouts += 1;
    poolState.lastTimeoutAt = new Date().toISOString();
    poolState.lastFailureCode = code;
}

function recordConnectionFailure(code = "P1001") {
    poolState.failedConnections += 1;
    poolState.lastFailureAt = new Date().toISOString();
    poolState.lastFailureCode = code;
}

function recordConnectionRecovery() {
    poolState.recoveredConnections += 1;
}

function getPoolRuntimeState() {
    return Object.freeze({
        connectionTimeouts: poolState.connectionTimeouts,
        failedConnections: poolState.failedConnections,
        recoveredConnections: poolState.recoveredConnections,
        lastTimeoutAt: poolState.lastTimeoutAt,
        lastFailureAt: poolState.lastFailureAt,
        lastFailureCode: poolState.lastFailureCode,
        effectivePool: poolState.effectivePool || databaseConfig.pool
    });
}

async function connectPrisma() {
    try {
        await prisma.$connect();
        logger.info({
            message: "Prisma database connected",
            poolLimit: poolState.effectivePool?.connectionLimit,
            poolTimeoutSec: poolState.effectivePool?.poolTimeoutSec,
            pgbouncer: poolState.effectivePool?.pgbouncerEnabled || false
        });
    } catch (error) {
        recordConnectionFailure(error?.code || "CONNECT_ERROR");
        logger.error({
            message: "Prisma connection failed",
            error: { message: error.message }
        });
        throw error;
    }
}

async function disconnectPrisma() {
    try {
        await prisma.$disconnect();
        logger.info({ message: "Prisma disconnected safely" });
    } catch (error) {
        logger.error({
            message: "Prisma disconnect failed",
            error: { message: error.message }
        });
    }
}

if (!environment.IS_TEST && !global.__GBS_PRISMA_SHUTDOWN__) {
    global.__GBS_PRISMA_SHUTDOWN__ = true;

    process.once("SIGINT", async () => {
        await disconnectPrisma();
        process.exit(0);
    });

    process.once("SIGTERM", async () => {
        await disconnectPrisma();
        process.exit(0);
    });
}

module.exports = prisma;
module.exports.connectPrisma = connectPrisma;
module.exports.disconnectPrisma = disconnectPrisma;
module.exports.recordPoolTimeout = recordPoolTimeout;
module.exports.recordConnectionFailure = recordConnectionFailure;
module.exports.recordConnectionRecovery = recordConnectionRecovery;
module.exports.getPoolRuntimeState = getPoolRuntimeState;
