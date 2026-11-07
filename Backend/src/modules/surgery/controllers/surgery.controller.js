"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
SURGERY, OPERATING THEATRE & PACU CONTROLLER
HTTP Handler for Surgical Lifecycle & Safety
LOCATION: src/modules/surgery/controllers/surgery.controller.js
====================================================
*/

const surgeryService = require("../services/surgery.service");

async function createSurgicalCase(req, res, next) {
    try {
        const result = await surgeryService.createSurgicalCase(req.body, req.user);
        res.status(201).json({
            success: true,
            message: "Surgical procedure booked and scheduled successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getSurgicalCases(req, res, next) {
    try {
        const result = await surgeryService.getSurgicalCases(req.query);
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

async function getSurgicalCaseById(req, res, next) {
    try {
        const result = await surgeryService.getSurgicalCaseById(req.params.id);
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function updateSurgicalCaseStatus(req, res, next) {
    try {
        const result = await surgeryService.updateSurgicalCaseStatus(req.params.id, req.body);
        res.status(200).json({
            success: true,
            message: "Surgical case status updated successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function updateSurgicalChecklist(req, res, next) {
    try {
        const result = await surgeryService.updateSurgicalChecklist(req.params.id, req.body, req.user);
        res.status(200).json({
            success: true,
            message: "WHO Surgical Safety Checklist verified and recorded successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function recordAnesthesia(req, res, next) {
    try {
        const result = await surgeryService.recordAnesthesia(req.params.id, req.body, req.user);
        res.status(200).json({
            success: true,
            message: "Anesthesia protocol and intra-op management documented successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function recordOperativeReport(req, res, next) {
    try {
        const result = await surgeryService.recordOperativeReport(req.params.id, req.body, req.user);
        res.status(200).json({
            success: true,
            message: "Surgeon operative notes documented and patient transferred to PACU",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function recordPacuRecovery(req, res, next) {
    try {
        const result = await surgeryService.recordPacuRecovery(req.params.id, req.body, req.user);
        res.status(200).json({
            success: true,
            message: "PACU Modified Aldrete assessment and post-op disposition recorded",
            data: result.pacuRecord,
            evaluation: result.evaluation,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getSurgeryDashboardTelemetry(req, res, next) {
    try {
        const result = await surgeryService.getSurgeryDashboardTelemetry();
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getOperatingTheatres(req, res, next) {
    try {
        const result = await surgeryService.getOperatingTheatres();
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getSurgicalCatalog(req, res, next) {
    try {
        const result = await surgeryService.getSurgicalCatalog();
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function seedOperatingTheatres(req, res, next) {
    try {
        const result = await surgeryService.seedOperatingTheatres();
        res.status(201).json({
            success: true,
            message: "Operating theatre suites seeded successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function seedSurgicalCatalog(req, res, next) {
    try {
        const result = await surgeryService.seedSurgicalCatalog();
        res.status(201).json({
            success: true,
            message: "Standard surgical procedures catalog seeded successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createSurgicalCase,
    getSurgicalCases,
    getSurgicalCaseById,
    updateSurgicalCaseStatus,
    updateSurgicalChecklist,
    recordAnesthesia,
    recordOperativeReport,
    recordPacuRecovery,
    getSurgeryDashboardTelemetry,
    getOperatingTheatres,
    getSurgicalCatalog,
    seedOperatingTheatres,
    seedSurgicalCatalog
};
