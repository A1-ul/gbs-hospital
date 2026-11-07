"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHARMACY CONTROLLER
HTTP Request Handling for Pharmacy & Inventory Operations
LOCATION: src/modules/pharmacy/controllers/pharmacy.controller.js
====================================================
*/

const pharmacyService = require("../services/pharmacy.service");
const logger = require("../../../core/utils/logger");

async function createPharmacyItem(req, res, next) {
    try {
        const item = await pharmacyService.createPharmacyItem(req.body, req.user);
        res.status(201).json({
            success: true,
            message: "Medication item cataloged successfully in hospital formulary",
            data: item,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getPharmacyItems(req, res, next) {
    try {
        const result = await pharmacyService.getPharmacyItems(req.query);
        res.status(200).json({
            success: true,
            data: result.items,
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getPharmacyItemById(req, res, next) {
    try {
        const item = await pharmacyService.getPharmacyItemById(req.params.id);
        res.status(200).json({
            success: true,
            data: item,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function receiveBatchStock(req, res, next) {
    try {
        const result = await pharmacyService.receiveBatchStock(req.body, req.user);
        res.status(201).json({
            success: true,
            message: "Batch stock received and added to active inventory",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function adjustStock(req, res, next) {
    try {
        const result = await pharmacyService.adjustStock(req.body, req.user);
        res.status(200).json({
            success: true,
            message: "Stock adjustment recorded in audit log successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getPendingPrescriptions(req, res, next) {
    try {
        const result = await pharmacyService.getPendingPrescriptions(req.query);
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

async function dispensePrescription(req, res, next) {
    try {
        const result = await pharmacyService.dispensePrescription(req.params.id, req.body, req.user);
        res.status(200).json({
            success: true,
            message: "Prescription verified and dispensed successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getDispenseHistory(req, res, next) {
    try {
        const result = await pharmacyService.getDispenseHistory(req.query);
        res.status(200).json({
            success: true,
            data: result.dispenses,
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

async function getExpiryAlerts(req, res, next) {
    try {
        const alerts = await pharmacyService.getExpiryAlerts(req.query.hospitalId, req.query.days);
        res.status(200).json({
            success: true,
            data: alerts,
            count: alerts.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getLowStockAlerts(req, res, next) {
    try {
        const alerts = await pharmacyService.getLowStockAlerts(req.query.hospitalId);
        res.status(200).json({
            success: true,
            data: alerts,
            count: alerts.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getPharmacistDashboardTelemetry(req, res, next) {
    try {
        const telemetry = await pharmacyService.getPharmacistDashboardTelemetry(req.query.hospitalId);
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
    createPharmacyItem,
    getPharmacyItems,
    getPharmacyItemById,
    receiveBatchStock,
    adjustStock,
    getPendingPrescriptions,
    dispensePrescription,
    getDispenseHistory,
    getExpiryAlerts,
    getLowStockAlerts,
    getPharmacistDashboardTelemetry
};
