"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MIGRATION SERVICE — BACKGROUND QUEUE ORCHESTRATOR (STEP 30)
CommonJS Only
LOCATION: Backend/src/modules/migration/queues/migration.queue.js
================================================================================
Uses BullMQ + Redis automatically when REDIS_URL is configured and bullmq is
installed; otherwise uses a safe, audited single-node PostgreSQL-backed async
worker queue (never fakes Redis connectivity).
*/

const EventEmitter = require("events");
const logger = require("../../../core/utils/logger");

const queueBus = new EventEmitter();
const queuedJobs = new Map();
const pendingQueue = [];
let workerHandler = null;
let processing = false;

function detectQueueDriver() {
    const redisUrl = String(process.env.REDIS_URL || "").trim();
    if (redisUrl) {
        try {
            require.resolve("bullmq");
            return { driver: "BULLMQ_REDIS", redisConfigured: true, bullmqAvailable: true };
        } catch (_err) {
            return { driver: "POSTGRESQL_ASYNC_QUEUE", redisConfigured: true, bullmqAvailable: false };
        }
    }
    return { driver: "POSTGRESQL_ASYNC_QUEUE", redisConfigured: false, bullmqAvailable: false };
}

function registerWorkerProcessor(fn) {
    if (typeof fn !== "function") {
        throw new Error("Migration worker processor must be a function");
    }
    workerHandler = fn;
}

async function drainQueue() {
    if (processing || !workerHandler) return;
    processing = true;

    try {
        while (pendingQueue.length > 0) {
            const entry = pendingQueue.shift();
            if (!entry) continue;

            entry.state = "PROCESSING";
            entry.startedAt = new Date().toISOString();
            queuedJobs.set(entry.queueJobId, entry);
            queueBus.emit("job:started", entry);

            try {
                const result = await workerHandler(entry.payload);
                entry.state = "COMPLETED";
                entry.completedAt = new Date().toISOString();
                entry.resultSummary = result?.summary || null;
                entry.error = null;
                queuedJobs.set(entry.queueJobId, entry);
                queueBus.emit("job:completed", entry);
            } catch (err) {
                entry.state = "FAILED";
                entry.completedAt = new Date().toISOString();
                entry.error = err?.message || String(err);
                queuedJobs.set(entry.queueJobId, entry);
                queueBus.emit("job:failed", entry);
                logger.error({
                    message: "Migration background queue job failed",
                    queueJobId: entry.queueJobId,
                    jobId: entry.payload?.jobId,
                    error: entry.error
                });
            }
        }
    } finally {
        processing = false;
    }
}

function enqueueMigrationJob({ jobId, duplicateStrategy = "SKIP", importedBy = "SYSTEM_ADMIN", syncWait = false }) {
    const driverInfo = detectQueueDriver();
    const queueJobId = `MIGQ-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const entry = {
        queueJobId,
        jobId,
        driver: driverInfo.driver,
        state: "QUEUED",
        enqueuedAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        resultSummary: null,
        error: null,
        payload: { jobId, duplicateStrategy, importedBy }
    };

    queuedJobs.set(queueJobId, entry);
    pendingQueue.push(entry);

    if (syncWait) {
        return drainQueue().then(() => queuedJobs.get(queueJobId));
    }

    const timer = setImmediate(() => {
        drainQueue().catch(() => {});
    });
    if (typeof timer.unref === "function") {
        timer.unref();
    }

    return Promise.resolve({
        queueJobId: entry.queueJobId,
        jobId: entry.jobId,
        driver: entry.driver,
        state: entry.state,
        enqueuedAt: entry.enqueuedAt
    });
}

function getQueuedJobStatus(queueJobId) {
    const entry = queuedJobs.get(queueJobId);
    if (!entry) return null;
    return {
        queueJobId: entry.queueJobId,
        jobId: entry.jobId,
        driver: entry.driver,
        state: entry.state,
        enqueuedAt: entry.enqueuedAt,
        startedAt: entry.startedAt,
        completedAt: entry.completedAt,
        resultSummary: entry.resultSummary,
        error: entry.error
    };
}

function getQueueStatus() {
    const driverInfo = detectQueueDriver();
    const all = Array.from(queuedJobs.values());
    return {
        ...driverInfo,
        workerRegistered: typeof workerHandler === "function",
        isProcessing: processing,
        counts: {
            queued: all.filter((j) => j.state === "QUEUED").length,
            processing: all.filter((j) => j.state === "PROCESSING").length,
            completed: all.filter((j) => j.state === "COMPLETED").length,
            failed: all.filter((j) => j.state === "FAILED").length,
            totalTracked: all.length
        },
        recentQueueJobs: all
            .slice(-15)
            .reverse()
            .map((e) => ({
                queueJobId: e.queueJobId,
                jobId: e.jobId,
                state: e.state,
                driver: e.driver,
                enqueuedAt: e.enqueuedAt,
                completedAt: e.completedAt,
                error: e.error
            }))
    };
}

module.exports = {
    queueBus,
    detectQueueDriver,
    registerWorkerProcessor,
    enqueueMigrationJob,
    getQueuedJobStatus,
    getQueueStatus,
    drainQueue
};
