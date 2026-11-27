"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MIGRATION SERVICE MODULE - HTTP CONTROLLER
Phase 20 Production Hardened - CommonJS Only
LOCATION: src/modules/migration/controllers/migration.controller.js
====================================================
*/

const crypto = require("crypto");
const migrationService = require("../services/migration.service");
const migrationQueue = require("../queues/migration.queue");
require("../workers/migration.worker");
const logger = require("../../../core/utils/logger");

async function getCatalogs(req, res, next) {
    try {
        const catalogs = await migrationService.getMigrationCatalogs();
        res.status(200).json({
            success: true,
            data: catalogs
        });
    } catch (err) {
        next(err);
    }
}

async function getTelemetry(req, res, next) {
    try {
        const telemetry = await migrationService.getMigrationTelemetry();
        res.status(200).json({
            success: true,
            data: telemetry
        });
    } catch (err) {
        next(err);
    }
}

async function initializeJob(req, res, next) {
    try {
        const { targetEntity, sourceType, fileName, rawData, fileSizeBytes } = req.body;
        const initiatedBy = req.user ? `${req.user.firstName || ""} ${req.user.lastName || ""} (${req.user.email || ""})`.trim() : "SYSTEM_ADMIN";

        const result = await migrationService.initializeMigrationJob({
            targetEntity,
            sourceType,
            fileName,
            initiatedBy,
            rawData,
            fileSizeBytes
        });

        res.status(201).json({
            success: true,
            message: `Migration job ${result.job.jobCode} initialized successfully`,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function applyMapping(req, res, next) {
    try {
        const jobId = req.params.jobId || req.body.jobId;
        const { columnMappings, saveAsTemplate, templateName } = req.body;
        const userId = req.user ? req.user.email : "SYSTEM_ADMIN";

        const result = await migrationService.applyMappingAndValidate({
            jobId,
            columnMappings,
            saveAsTemplate,
            templateName,
            userId
        });

        res.status(200).json({
            success: true,
            message: `Mapping and validation applied to job ${result.job.jobCode}`,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function approveJob(req, res, next) {
    try {
        const { jobId } = req.params;
        const approvedBy = req.user ? `${req.user.firstName || ""} ${req.user.lastName || ""} (${req.user.email || ""})`.trim() : "SYSTEM_ADMIN";

        const job = await migrationService.approveMigrationJob({
            jobId,
            approvedBy
        });

        try {
            const { rcce } = require("../../../core/gbs-rcce.bootstrap");
            await rcce.events.publish({
                eventCode: "REQUEST_APPROVED",
                domain: "MIGRATION",
                actorUserId: req.user?.id,
                actorRole: req.user?.role,
                affectedRecord: job.jobCode || jobId,
                severity: "INFO",
                requestId: req.requestId,
                notifications: [
                    {
                        recipientRole: "DEVELOPER",
                        title: "Migration Job Approved",
                        message: `Data migration job ${job.jobCode} approved by ${approvedBy}.`,
                        severity: "INFO"
                    }
                ]
            });
        } catch (_pubErr) { }

        return res.rcceSuccess("REQUEST_APPROVED", job, {
            httpStatus: 200,
            message: `Migration job ${job.jobCode} approved for execution`
        });
    } catch (err) {
        next(err);
    }
}

async function executeImport(req, res, next) {
    try {
        const { jobId } = req.params;
        const { duplicateStrategy } = req.body || {};
        const importedBy = req.user ? req.user.email : "SYSTEM_ADMIN";

        const result = await migrationService.executeImport({
            jobId,
            duplicateStrategy,
            importedBy
        });

        try {
            const { rcce } = require("../../../core/gbs-rcce.bootstrap");
            await rcce.events.publish({
                eventCode: "RECORD_UPDATED",
                domain: "MIGRATION",
                actorUserId: req.user?.id,
                actorRole: req.user?.role,
                affectedRecord: jobId,
                severity: "INFO",
                requestId: req.requestId,
                notifications: [
                    {
                        recipientRole: "DEVELOPER",
                        title: "Data Migration Executed",
                        message: `Migration job ${jobId} finished: ${result.summary.imported} imported, ${result.summary.failed} failed.`,
                        severity: result.summary.failed > 0 ? "WARNING" : "SUCCESS"
                    }
                ]
            });
        } catch (_pubErr) { }

        return res.rcceSuccess("RECORD_UPDATED", result, {
            httpStatus: 200,
            message: `Import executed: ${result.summary.imported} imported, ${result.summary.failed} failed`
        });
    } catch (err) {
        next(err);
    }
}

async function rollbackJob(req, res, next) {
    try {
        const { jobId } = req.params;
        const { reason } = req.body || {};
        const rolledBackBy = req.user ? req.user.email : "SYSTEM_ADMIN";

        const result = await migrationService.rollbackMigrationJob({
            jobId,
            rolledBackBy,
            reason
        });

        res.status(200).json({
            success: true,
            message: `Job ${result.job.jobCode} rolled back: ${result.revertedCount} database entities reverted`,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function getJobs(req, res, next) {
    try {
        const { page, limit, status, targetEntity, search } = req.query;
        const result = await migrationService.getMigrationJobs({
            page,
            limit,
            status,
            targetEntity,
            search
        });

        res.status(200).json({
            success: true,
            data: result.jobs,
            pagination: result.pagination
        });
    } catch (err) {
        next(err);
    }
}

async function getJobById(req, res, next) {
    try {
        const { jobId } = req.params;
        const job = await migrationService.getJobDetails(jobId);

        res.status(200).json({
            success: true,
            data: job
        });
    } catch (err) {
        next(err);
    }
}

async function saveTemplate(req, res, next) {
    try {
        const { name, targetEntity, sourceType, columnMappings, transformationRules } = req.body;
        const createdBy = req.user ? req.user.email : "SYSTEM_ADMIN";

        const template = await migrationService.saveTemplate({
            name,
            targetEntity,
            sourceType,
            columnMappings,
            transformationRules,
            createdBy
        });

        res.status(201).json({
            success: true,
            message: `Migration template '${template.name}' saved`,
            data: template
        });
    } catch (err) {
        next(err);
    }
}

async function getTemplates(req, res, next) {
    try {
        const { targetEntity, sourceType } = req.query;
        const templates = await migrationService.getTemplates({ targetEntity, sourceType });

        res.status(200).json({
            success: true,
            data: templates
        });
    } catch (err) {
        next(err);
    }
}

async function getQueueStatus(req, res, next) {
    try {
        const status = migrationQueue.getQueueStatus();
        res.status(200).json({
            success: true,
            data: status
        });
    } catch (err) {
        next(err);
    }
}

async function enqueueApprovedJob(req, res, next) {
    try {
        const { jobId } = req.params;
        const { duplicateStrategy = "SKIP", syncWait = false } = req.body || {};
        const importedBy = req.user ? req.user.email : "SYSTEM_ADMIN";

        // Verify job exists and has passed Human Approval Gate before enqueueing
        const job = await migrationService.getJobDetails(jobId);
        if (job.status !== "APPROVED") {
            return res.status(400).json({
                success: false,
                code: "MIGRATION_APPROVAL_REQUIRED",
                message: `Migration job ${job.jobCode} must be APPROVED before background queueing (current status: ${job.status}).`
            });
        }

        const queued = await migrationQueue.enqueueMigrationJob({
            jobId,
            duplicateStrategy,
            importedBy,
            syncWait: Boolean(syncWait)
        });

        res.status(syncWait ? 200 : 202).json({
            success: true,
            message: syncWait
                ? `Migration job ${job.jobCode} processed by background worker (${queued.state})`
                : `Migration job ${job.jobCode} enqueued for background worker processing`,
            data: queued
        });
    } catch (err) {
        next(err);
    }
}

async function downloadVerificationReport(req, res, next) {
    try {
        const { jobId } = req.params;
        const format = String(req.query.format || "json").toLowerCase();
        const job = await migrationService.getJobDetails(jobId);

        const reportPayload = {
            reportGeneratedAt: new Date().toISOString(),
            jobId: job.id,
            jobCode: job.jobCode,
            targetEntity: job.targetEntity,
            sourceType: job.sourceType,
            fileName: job.fileName,
            status: job.status,
            initiatedBy: job.initiatedBy,
            approvedBy: job.approvedBy || null,
            totals: {
                totalRecords: job.totalRecords,
                importedRecords: job.importedRecords,
                failedRecords: job.failedRecords,
                duplicateRecords: job.duplicateRecords
            },
            rows: (job.records || []).map((r) => ({
                rowNumber: r.rowNumber,
                status: r.status,
                createdEntityId: r.createdEntityId || null,
                errorMessage: r.errorMessage || null
            }))
        };

        const checksum = crypto
            .createHash("sha256")
            .update(JSON.stringify(reportPayload))
            .digest("hex");

        if (format === "csv") {
            const header = "rowNumber,status,createdEntityId,errorMessage";
            const csvLines = reportPayload.rows.map((r) =>
                [
                    r.rowNumber,
                    `"${String(r.status || "").replace(/"/g, '""')}"`,
                    `"${String(r.createdEntityId || "").replace(/"/g, '""')}"`,
                    `"${String(r.errorMessage || "").replace(/"/g, '""')}"`
                ].join(",")
            );
            const csvContent = [header, ...csvLines].join("\n");
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="${job.jobCode}_verification_report.csv"`);
            res.setHeader("X-Report-SHA256", checksum);
            return res.status(200).send(csvContent);
        }

        res.setHeader("X-Report-SHA256", checksum);
        return res.status(200).json({
            success: true,
            data: {
                ...reportPayload,
                reportChecksumSha256: checksum
            }
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getCatalogs,
    getTelemetry,
    initializeJob,
    applyMapping,
    approveJob,
    executeImport,
    rollbackJob,
    getJobs,
    getJobById,
    saveTemplate,
    getTemplates,
    getQueueStatus,
    enqueueApprovedJob,
    downloadVerificationReport
};
