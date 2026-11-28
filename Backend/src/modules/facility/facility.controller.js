"use strict";

const service = require("./facility.service");
const { rcce } = require("../../core/gbs-rcce.bootstrap");

async function getTelemetry(req, res, next) {
    try {
        const data = await service.getFacilityTelemetry();
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function listTasks(req, res, next) {
    try {
        const data = await service.listFacilityTasks(req.query);
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function createTask(req, res, next) {
    try {
        const data = await service.createFacilityTask(req.body, req.user);
        await rcce.events.publish({
            eventCode: "REQUEST_SUBMITTED",
            domain: "FACILITY",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "ADMIN",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.taskCode || data.id,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: [
                {
                    recipientRole: "ADMIN",
                    title: "Facility Task Logged",
                    message: `Facility task ${data.taskCode} (${data.category || "OPERATIONS"}) logged for action.`,
                    severity: "INFO"
                }
            ]
        }).catch(() => { });
        return res.rcceSuccess("FACILITY_TASK_LOGGED", data, {
            httpStatus: 201,
            message: `Facility task ${data.taskCode} logged cleanly.`
        });
    } catch (err) {
        next(err);
    }
}

async function updateStatus(req, res, next) {
    try {
        const data = await service.updateFacilityTaskStatus(req.params.id, req.body, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "FACILITY",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "ADMIN",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.taskCode || req.params.id,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: []
        }).catch(() => { });
        return res.rcceSuccess("RECORD_UPDATED", data, {
            httpStatus: 200,
            message: `Facility task ${data.taskCode} updated to ${data.status}.`
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { getTelemetry, listTasks, createTask, updateStatus };
