"use strict";

const service = require("./documents.service");
const { rcce } = require("../../core/gbs-rcce.bootstrap");

async function getTelemetry(req, res, next) {
    try {
        const data = await service.getDocumentTelemetry();
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function list(req, res, next) {
    try {
        const data = await service.listDocuments(req.query);
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function create(req, res, next) {
    try {
        const data = await service.createDocument(req.body, req.user);
        await rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "DOCUMENTS",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "FOLDER_RETRIEVER",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.documentCode || data.id,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: []
        }).catch(() => { });
        return res.rcceSuccess("DOCUMENT_STORED", data, {
            httpStatus: 201,
            message: `Document ${data.documentCode} stored with SHA-256 integrity & retention policy.`
        });
    } catch (err) {
        next(err);
    }
}

async function newVersion(req, res, next) {
    try {
        const data = await service.createNewVersion(req.params.id, req.body, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "DOCUMENTS",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "FOLDER_RETRIEVER",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.documentCode || req.params.id,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: []
        }).catch(() => { });
        return res.rcceSuccess("DOCUMENT_STORED", data, {
            httpStatus: 201,
            message: `Created version v${data.versionNumber} (${data.documentCode}).`
        });
    } catch (err) {
        next(err);
    }
}

async function deliver(req, res, next) {
    try {
        const data = await service.deliverDocument(req.params.id, req.body, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "DOCUMENTS",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "FOLDER_RETRIEVER",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.documentCode || req.params.id,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: [
                {
                    recipientRole: "ADMIN",
                    title: "Hospital Document Delivered",
                    message: `Document ${data.documentCode || req.params.id} delivered to ${data.deliveredTo}.`,
                    severity: "INFO"
                }
            ]
        }).catch(() => { });
        return res.rcceSuccess("RECORD_UPDATED", data, {
            httpStatus: 200,
            message: `Document delivered to ${data.deliveredTo}.`
        });
    } catch (err) {
        next(err);
    }
}

async function archive(req, res, next) {
    try {
        const data = await service.archiveSoftDeleteDocument(req.params.id, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "DOCUMENTS",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "ADMIN",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.documentCode || req.params.id,
            severity: "WARNING",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: []
        }).catch(() => { });
        return res.rcceSuccess("RECORD_UPDATED", data, {
            httpStatus: 200,
            message: "Document archived under automated deletion protection (recoverable)."
        });
    } catch (err) {
        next(err);
    }
}

async function restore(req, res, next) {
    try {
        const data = await service.restoreDocument(req.params.id, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "DOCUMENTS",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "ADMIN",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.documentCode || req.params.id,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: []
        }).catch(() => { });
        return res.rcceSuccess("RECORD_UPDATED", data, {
            httpStatus: 200,
            message: `Document ${data.documentCode} restored cleanly.`
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { getTelemetry, list, create, newVersion, deliver, archive, restore };
