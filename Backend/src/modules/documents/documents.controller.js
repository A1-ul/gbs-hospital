"use strict";

const service = require("./documents.service");

async function getTelemetry(req, res, next) {
    try {
        const data = await service.getDocumentTelemetry();
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function list(req, res, next) {
    try {
        const data = await service.listDocuments(req.query);
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function create(req, res, next) {
    try {
        const data = await service.createDocument(req.body, req.user);
        return res.status(201).json({
            success: true,
            message: `Document ${data.documentCode} stored with SHA-256 integrity & retention policy.`,
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

async function newVersion(req, res, next) {
    try {
        const data = await service.createNewVersion(req.params.id, req.body, req.user);
        return res.status(201).json({
            success: true,
            message: `Created version v${data.versionNumber} (${data.documentCode}).`,
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

async function deliver(req, res, next) {
    try {
        const data = await service.deliverDocument(req.params.id, req.body, req.user);
        return res.status(200).json({
            success: true,
            message: `Document delivered to ${data.deliveredTo}.`,
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

async function archive(req, res, next) {
    try {
        const data = await service.archiveSoftDeleteDocument(req.params.id, req.user);
        return res.status(200).json({
            success: true,
            message: "Document archived under automated deletion protection (recoverable).",
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

async function restore(req, res, next) {
    try {
        const data = await service.restoreDocument(req.params.id, req.user);
        return res.status(200).json({
            success: true,
            message: `Document ${data.documentCode} restored cleanly.`,
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { getTelemetry, list, create, newVersion, deliver, archive, restore };
