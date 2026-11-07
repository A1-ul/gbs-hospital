"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
RADIOLOGY & PACS CONTROLLER
HTTP Request Handling for Diagnostic Imaging & Reporting
LOCATION: src/modules/radiology/controllers/radiology.controller.js
====================================================
*/

const radiologyService = require("../services/radiology.service");

async function createRadiologyOrder(req, res, next) {
    try {
        const result = await radiologyService.createRadiologyOrder(req.body, req.user);
        res.status(201).json({
            success: true,
            message: "Radiology diagnostic examination ordered successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getRadiologyOrders(req, res, next) {
    try {
        const result = await radiologyService.getRadiologyOrders(req.query);
        res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getRadiologyOrderById(req, res, next) {
    try {
        const result = await radiologyService.getRadiologyOrderById(req.params.id);
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function scheduleRadiologyOrder(req, res, next) {
    try {
        const result = await radiologyService.scheduleRadiologyOrder(req.params.id, req.body, req.user);
        res.status(200).json({
            success: true,
            message: "Radiology procedure scheduled successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function acquireDicomStudy(req, res, next) {
    try {
        const studyData = {
            ...req.body,
            orderId: req.params.id || req.body.orderId
        };
        const result = await radiologyService.acquireDicomStudy(studyData, req.user);
        res.status(201).json({
            success: true,
            message: "DICOM Study acquired and ingested into PACS archive",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getPacsStudyDossier(req, res, next) {
    try {
        const result = await radiologyService.getPacsStudyDossier(req.params.uid);
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function authorRadiologyReport(req, res, next) {
    try {
        const reportData = {
            ...req.body,
            orderId: req.params.id || req.body.orderId
        };
        const result = await radiologyService.authorRadiologyReport(reportData, req.user);
        res.status(201).json({
            success: true,
            message: "Radiology diagnostic report authored successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function verifyRadiologyReport(req, res, next) {
    try {
        const result = await radiologyService.verifyRadiologyReport(req.params.id, req.body, req.user);
        res.status(200).json({
            success: true,
            message: "Radiology report verified and finalized with electronic signature",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getRadiologyDashboardTelemetry(req, res, next) {
    try {
        const result = await radiologyService.getRadiologyDashboardTelemetry();
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function seedRadiologyCatalog(req, res, next) {
    try {
        const result = await radiologyService.seedRadiologyCatalog();
        res.status(200).json({
            success: true,
            message: "Radiology reference catalog seeded successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createRadiologyOrder,
    getRadiologyOrders,
    getRadiologyOrderById,
    scheduleRadiologyOrder,
    acquireDicomStudy,
    getPacsStudyDossier,
    authorRadiologyReport,
    verifyRadiologyReport,
    getRadiologyDashboardTelemetry,
    seedRadiologyCatalog
};
