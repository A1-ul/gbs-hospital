"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
GIS FACILITY TRACKING & FLOOR PLANS - CONTROLLER
Phase 21 Production Hardened - CommonJS Only
LOCATION: src/modules/facility-maps/facility-maps.controller.js
====================================================
*/

const service = require("./facility-maps.service");

async function createGeofence(req, res, next) {
    try {
        const result = await service.createGeofence(req.body);
        res.status(201).json({
            success: true,
            message: `Facility geofence ${result.code} created successfully`,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function getGeofences(req, res, next) {
    try {
        const { hospitalId, facilityType, active } = req.query;
        const result = await service.getGeofences({ hospitalId, facilityType, active });
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function evaluatePing(req, res, next) {
    try {
        const result = await service.evaluateLocationPing(req.body);
        res.status(200).json({
            success: true,
            message: "GPS location ping evaluated against active geofences",
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function getBreachEvents(req, res, next) {
    try {
        const { geofenceId, entityType, eventType, page, limit } = req.query;
        const result = await service.getBreachEvents({ geofenceId, entityType, eventType, page, limit });
        res.status(200).json({
            success: true,
            data: result.events,
            pagination: result.pagination
        });
    } catch (err) {
        next(err);
    }
}

async function createFloorPlan(req, res, next) {
    try {
        const result = await service.createFloorPlan(req.body);
        res.status(201).json({
            success: true,
            message: `Floor plan ${result.code} created successfully`,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function getFloorPlans(req, res, next) {
    try {
        const { buildingName, active } = req.query;
        const result = await service.getFloorPlans({ buildingName, active });
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function getFloorPlanById(req, res, next) {
    try {
        const { id } = req.params;
        const result = await service.getFloorPlanById(id);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function getTelemetry(req, res, next) {
    try {
        const result = await service.getGisTelemetry();
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    createGeofence,
    getGeofences,
    evaluatePing,
    getBreachEvents,
    createFloorPlan,
    getFloorPlans,
    getFloorPlanById,
    getTelemetry
};
