"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MIGRATION SERVICE MODULE - HTTP CONTROLLER
Phase 20 Production Hardened - CommonJS Only
LOCATION: src/modules/migration/controllers/migration.controller.js
====================================================
*/

const migrationService = require("../services/migration.service");
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

        res.status(200).json({
            success: true,
            message: `Migration job ${job.jobCode} approved for execution`,
            data: job
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

        res.status(200).json({
            success: true,
            message: `Import executed: ${result.summary.imported} imported, ${result.summary.failed} failed`,
            data: result
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
    getTemplates
};
