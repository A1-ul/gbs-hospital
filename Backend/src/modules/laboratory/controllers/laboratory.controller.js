"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
LABORATORY & PATHOLOGY CONTROLLER
HTTP Request Handling for Clinical Laboratory Operations
LOCATION: src/modules/laboratory/controllers/laboratory.controller.js
====================================================
*/

const labService = require("../services/laboratory.service");

async function createLabRequest(req, res, next) {
    try {
        const result = await labService.createLabRequest(req.body, req.user);
        res.status(201).json({
            success: true,
            message: "Laboratory diagnostic request ordered successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getLabRequests(req, res, next) {
    try {
        const result = await labService.getLabRequests(req.query);
        res.status(200).json({
            success: true,
            data: result.items,
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getLabRequestById(req, res, next) {
    try {
        const result = await labService.getLabRequestById(req.params.id);
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function collectSpecimen(req, res, next) {
    try {
        const result = await labService.collectSpecimen(req.params.id, req.body, req.user);
        res.status(201).json({
            success: true,
            message: "Specimen sample collected and barcoded successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function receiveSpecimenInLab(req, res, next) {
    try {
        const result = await labService.receiveSpecimenInLab(req.params.barcode, req.user);
        res.status(200).json({
            success: true,
            message: "Specimen accessioned into laboratory workqueue successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function enterTestResults(req, res, next) {
    try {
        const result = await labService.enterTestResults(req.params.id, req.body, req.user);
        res.status(200).json({
            success: true,
            message: "Laboratory parameter results recorded successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function verifyAndReleaseResults(req, res, next) {
    try {
        const result = await labService.verifyAndReleaseResults(req.params.id, req.body, req.user);
        res.status(200).json({
            success: true,
            message: "Official laboratory report verified and released to medical chart",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getLaboratoryDashboardTelemetry(req, res, next) {
    try {
        const telemetry = await labService.getLaboratoryDashboardTelemetry();
        res.status(200).json({
            success: true,
            data: telemetry,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createLabRequest,
    getLabRequests,
    getLabRequestById,
    collectSpecimen,
    receiveSpecimenInLab,
    enterTestResults,
    verifyAndReleaseResults,
    getLaboratoryDashboardTelemetry
};
