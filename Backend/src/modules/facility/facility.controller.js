"use strict";

const service = require("./facility.service");

async function getTelemetry(req, res, next) {
    try {
        const data = await service.getFacilityTelemetry();
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function listTasks(req, res, next) {
    try {
        const data = await service.listFacilityTasks(req.query);
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function createTask(req, res, next) {
    try {
        const data = await service.createFacilityTask(req.body, req.user);
        return res.status(201).json({
            success: true,
            message: `Facility task ${data.taskCode} logged cleanly.`,
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

async function updateStatus(req, res, next) {
    try {
        const data = await service.updateFacilityTaskStatus(req.params.id, req.body, req.user);
        return res.status(200).json({
            success: true,
            message: `Facility task ${data.taskCode} updated to ${data.status}.`,
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { getTelemetry, listTasks, createTask, updateStatus };
