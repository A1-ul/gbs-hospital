"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PRISMA CONNECTION RESILIENCE & AUTOMATIC RECOVERY LAYER
Production Hardened • CommonJS Only • Exponential Backoff + Jitter
LOCATION: Backend/src/core/database/prisma.connection.js
================================================================================
*/

const logger = require("../utils/logger");
const prisma = require("./prisma.client");
const databaseConfig = require("../../config/database.config");
const {
    recordConnectionFailure,
    recordConnectionRecovery,
    recordPoolTimeout
} = require("./prisma.client");

function getNumber(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) {
        return fallback;
    }
    return number;
}

const MAX_RETRIES = getNumber(process.env.DB_MAX_RETRIES, 5, 1, 20);
const BASE_RETRY_DELAY = getNumber(process.env.DB_RETRY_DELAY, 1500, 200, 30000);
const TRANSIENT_DB_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);

let connected = false;
let connecting = null;
let disconnecting = false;

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeError(error) {
    return {
        message: error?.message || "Unknown database error",
        code: error?.code || null
    };
}

function isTransientConnectionError(error) {
    if (!error) return false;
    if (error.code && TRANSIENT_DB_CODES.has(error.code)) return true;
    const msg = String(error.message || "").toLowerCase();
    return (
        msg.includes("can't reach database server") ||
        msg.includes("server has closed the connection") ||
        msg.includes("connection reset") ||
        msg.includes("timed out fetching a new connection from the connection pool")
    );
}

async function checkDatabaseConnection() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        if (!connected) {
            connected = true;
            recordConnectionRecovery();
        }
        return true;
    } catch (error) {
        connected = false;
        if (error?.code === "P2024" || error?.code === "P1008") {
            recordPoolTimeout(error.code);
        } else {
            recordConnectionFailure(error?.code || "HEALTH_CHECK_FAILED");
        }
        logger.error({
            message: "Database health check failed",
            error: normalizeError(error)
        });
        return false;
    }
}

async function connectWithRetry() {
    if (connected) {
        return true;
    }
    if (connecting) {
        return connecting;
    }

    connecting = (async () => {
        let lastError;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                logger.info({
                    message: "Database connection attempt",
                    attempt,
                    maxRetries: MAX_RETRIES,
                    database: "PostgreSQL"
                });

                await prisma.$connect();
                await prisma.$queryRaw`SELECT 1`;
                try {
                    const idleTxTimeoutMs = Number(databaseConfig.pool.idleInTransactionTimeoutMs || 30000);
                    if (Number.isInteger(idleTxTimeoutMs) && idleTxTimeoutMs >= 5000 && idleTxTimeoutMs <= 120000) {
                        await prisma.$executeRawUnsafe(`SET idle_in_transaction_session_timeout = ${idleTxTimeoutMs}`);
                    }
                } catch (_txTimeoutErr) {
                    // PgBouncer transaction-pooling or restricted roles may disallow session SET; continue cleanly
                }
                connected = true;
                if (attempt > 1) {
                    recordConnectionRecovery();
                }

                logger.info({
                    message: "Database connection established",
                    database: "PostgreSQL"
                });
                return true;
            } catch (error) {
                lastError = error;
                connected = false;
                recordConnectionFailure(error?.code || "CONNECT_FAILED");
                logger.error({
                    message: "Database connection failed",
                    attempt,
                    error: normalizeError(error)
                });

                if (attempt < MAX_RETRIES) {
                    const backoffMs = Math.min(15000, BASE_RETRY_DELAY * Math.pow(2, attempt - 1));
                    const jitterMs = Math.floor(Math.random() * 250);
                    await wait(backoffMs + jitterMs);
                }
            }
        }

        const databaseError = new Error(`Database unavailable after ${MAX_RETRIES} attempts`);
        databaseError.code = "DATABASE_CONNECTION_FAILED";
        databaseError.cause = lastError;
        throw databaseError;
    })();

    try {
        return await connecting;
    } finally {
        connecting = null;
    }
}

/**
 * Safely executes a database operation with automatic transient-drop retry & recovery.
 */
async function executeWithDbRecovery(operationFn, { maxAttempts = 3, baseDelayMs = 150 } = {}) {
    if (typeof operationFn !== "function") {
        throw new TypeError("operationFn must be a function");
    }

    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const result = await operationFn();
            if (attempt > 1) {
                connected = true;
                recordConnectionRecovery();
            }
            return result;
        } catch (error) {
            lastError = error;
            const transient = isTransientConnectionError(error);
            if (error?.code === "P2024" || error?.code === "P1008") {
                recordPoolTimeout(error.code);
            } else if (transient) {
                recordConnectionFailure(error?.code || "TRANSIENT_DB_ERROR");
            }

            if (!transient || attempt >= maxAttempts) {
                throw error;
            }

            connected = false;
            logger.warn({
                message: "Transient PostgreSQL interruption detected; retrying safely",
                attempt,
                maxAttempts,
                code: error?.code || null
            });

            await wait(baseDelayMs * attempt);
            try {
                await prisma.$connect();
            } catch (_reconnErr) {
                // Retry loop will evaluate next attempt
            }
        }
    }
    throw lastError;
}

async function disconnectDatabase() {
    if (disconnecting) return;
    disconnecting = true;
    try {
        await prisma.$disconnect();
        connected = false;
        logger.info({ message: "Database disconnected safely" });
    } catch (error) {
        logger.error({
            message: "Database disconnect failed",
            error: normalizeError(error)
        });
    } finally {
        disconnecting = false;
    }
}

module.exports = {
    connectWithRetry,
    checkDatabaseConnection,
    disconnectDatabase,
    executeWithDbRecovery,
    isTransientConnectionError
};
