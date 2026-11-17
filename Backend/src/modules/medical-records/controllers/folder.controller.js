"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MEDICAL FOLDER ARCHIVE CONTROLLER
FOLDER_RETRIEVER Role Operations & Physical File Tracking
LOCATION: src/modules/medical-records/controllers/folder.controller.js
====================================================
*/

const folderService = require("../services/folder.service");
const { rcce } = require("../../../core/gbs-rcce.bootstrap");

/**
 * Request Physical Medical Folder Retrieval
 * POST /api/v1/medical-records/folders/request
 */
async function requestFolderRetrieval(req, res, next) {
    try {
        const requestingUserId = req.user.id;
        const requestingRole = req.user.role;
        const payload = {
            ...req.body,
            requestingRole
        };

        const result = await folderService.requestFolderRetrieval(payload, requestingUserId);
        try {
            await rcce.events.publish({
                eventCode: "REQUEST_SUBMITTED",
                domain: "MEDICAL_RECORDS",
                actorUserId: requestingUserId,
                actorRole: requestingRole,
                affectedRecord: result?.request?.id || req.body?.patientId,
                severity: "INFO",
                requestId: req.requestId,
                notifications: [
                    {
                        recipientRole: "FOLDER_RETRIEVER",
                        title: "Medical Folder Retrieval Requested",
                        message: result.message || "A physical medical folder retrieval request is queued.",
                        severity: "INFO"
                    }
                ]
            });
        } catch (_pubErr) {}

        return res.rcceSuccess("REQUEST_SUBMITTED", result, {
            httpStatus: 201,
            message: result.message
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Folder Retriever Work Queue
 * GET /api/v1/medical-records/folders/retrieval-queue
 */
async function getRetrievalQueue(req, res, next) {
    try {
        const hospitalId = req.query.hospitalId || (req.user ? req.user.hospitalId : null);
        const { status } = req.query;

        const queue = await folderService.getRetrievalQueue(hospitalId, status);
        return res.status(200).json({
            success: true,
            count: queue.length,
            data: queue
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Mark Folder Retrieved from Shelf
 * POST /api/v1/medical-records/folders/requests/:requestId/retrieve
 */
async function markFolderRetrieved(req, res, next) {
    try {
        const { requestId } = req.params;
        const retrieverUserId = req.user.id;

        const result = await folderService.markFolderRetrieved(requestId, retrieverUserId);
        return res.status(200).json({
            success: true,
            message: result.message,
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Mark Folder Delivered to Destination Clinic
 * POST /api/v1/medical-records/folders/requests/:requestId/deliver
 */
async function markFolderDelivered(req, res, next) {
    try {
        const { requestId } = req.params;
        const retrieverUserId = req.user.id;

        const result = await folderService.markFolderDelivered(requestId, retrieverUserId);
        return res.status(200).json({
            success: true,
            message: result.message,
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Return Physical Folder Back to Archive Shelf
 * POST /api/v1/medical-records/folders/:folderId/return
 */
async function returnFolderToArchive(req, res, next) {
    try {
        const { folderId } = req.params;
        const returnerUserId = req.user.id;

        const result = await folderService.returnFolderToArchive(folderId, req.body, returnerUserId);
        return res.status(200).json({
            success: true,
            message: result.message,
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Physical Folder Audit Trail & Chain of Custody
 * GET /api/v1/medical-records/folders/:folderId/audit-trail
 */
async function getFolderAuditTrail(req, res, next) {
    try {
        const { folderId } = req.params;
        const auditTrail = await folderService.getFolderAuditTrail(folderId);
        return res.status(200).json({
            success: true,
            data: auditTrail
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Folder Retriever Role Dashboard Summary
 * GET /api/v1/medical-records/folders/retriever-dashboard
 */
async function getFolderRetrieverDashboardSummary(req, res, next) {
    try {
        const hospitalId = req.query.hospitalId || (req.user ? req.user.hospitalId : null);
        const summary = await folderService.getFolderRetrieverDashboardSummary(hospitalId);
        return res.status(200).json({
            success: true,
            data: summary
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    requestFolderRetrieval,
    getRetrievalQueue,
    markFolderRetrieved,
    markFolderDelivered,
    returnFolderToArchive,
    getFolderAuditTrail,
    getFolderRetrieverDashboardSummary
};
