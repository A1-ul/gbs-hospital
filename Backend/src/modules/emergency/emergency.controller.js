"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
EMERGENCY & AMBULANCE CONTROLLER
Phase 12 Production Hardened - CommonJS Only
LOCATION: src/modules/emergency/emergency.controller.js
====================================================
*/

const service = require("./emergency.service");
const logger = require("../../core/utils/logger");

async function registerAmbulance(req, res, next) {
    try {
        const result = await service.registerAmbulance(req.body);
        return res.status(201).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

async function getAmbulances(req, res, next) {
    try {
        const result = await service.getAmbulanceFleet(req.query);
        return res.status(200).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

async function getAmbulanceById(req, res, next) {
    try {
        const result = await service.getAmbulanceById(req.params.id);
        return res.status(200).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

async function updateAmbulanceTelemetry(req, res, next) {
    try {
        const result = await service.updateAmbulanceTelemetry(req.params.id, req.body);
        return res.status(200).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

async function createDispatch(req, res, next) {
    try {
        const result = await service.createDispatchCallout(req.body);
        return res.status(201).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

async function getDispatches(req, res, next) {
    try {
        const result = await service.getDispatches(req.query);
        return res.status(200).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

async function updateDispatchStatus(req, res, next) {
    try {
        const result = await service.updateDispatchStatus(req.params.id, req.body);
        return res.status(200).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

async function registerEmergencyCase(req, res, next) {
    try {
        const result = await service.registerEmergencyCase(req.body);
        return res.status(201).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

async function getEmergencyCases(req, res, next) {
    try {
        const result = await service.getEmergencyCases(req.query);
        return res.status(200).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

async function updateEmergencyCase(req, res, next) {
    try {
        const result = await service.updateEmergencyCase(req.params.id, req.body);
        return res.status(200).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

async function getEmergencyDashboardStats(req, res, next) {
    try {
        const result = await service.getEmergencyDashboardStats();
        return res.status(200).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    registerAmbulance,
    getAmbulances,
    getAmbulanceById,
    updateAmbulanceTelemetry,
    createDispatch,
    getDispatches,
    updateDispatchStatus,
    registerEmergencyCase,
    getEmergencyCases,
    updateEmergencyCase,
    getEmergencyDashboardStats
};
