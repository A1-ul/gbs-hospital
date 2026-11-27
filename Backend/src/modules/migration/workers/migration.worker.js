"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MIGRATION SERVICE — BACKGROUND WORKER PROCESSOR (STEP 30)
CommonJS Only
LOCATION: Backend/src/modules/migration/workers/migration.worker.js
================================================================================
Executes approved data migration jobs asynchronously from migration.queue.js
and writes completion/failure audit trails to PostgreSQL.
*/

const prisma = require("../../../core/database/prisma.client");
const migrationService = require("../services/migration.service");
const migrationQueue = require("../queues/migration.queue");
const logger = require("../../../core/utils/logger");

let workerInitialized = false;

async function processMigrationJob({ jobId, duplicateStrategy, importedBy }) {
    logger.info({
        message: "Migration background worker executing approved job",
        jobId,
        duplicateStrategy,
        importedBy
    });

    const result = await migrationService.executeImport({
        jobId,
        duplicateStrategy: duplicateStrategy || "SKIP",
        importedBy: importedBy || "MIGRATION_WORKER"
    });

    await prisma.auditLog.create({
        data: {
            role: "MIGRATION_WORKER",
            action: "MIGRATION_BACKGROUND_WORKER_COMPLETED",
            module: "MIGRATION",
            affectedRecord: jobId,
            outcome: result?.summary?.failed > 0 ? "PARTIAL" : "SUCCESS",
            description: `Background migration worker finished job ${jobId}: ${result?.summary?.imported || 0} imported, ${result?.summary?.failed || 0} failed, ${result?.summary?.skippedDuplicates || 0} skipped.`
        }
    }).catch(() => {});

    return result;
}

function initializeMigrationWorker() {
    if (workerInitialized) return;
    migrationQueue.registerWorkerProcessor(processMigrationJob);
    workerInitialized = true;
}

initializeMigrationWorker();

module.exports = {
    initializeMigrationWorker,
    processMigrationJob
};
