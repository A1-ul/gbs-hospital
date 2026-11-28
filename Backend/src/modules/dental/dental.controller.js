"use strict";

const service = require("./dental.service");
const { rcce } = require("../../core/gbs-rcce.bootstrap");

async function getTelemetry(req, res, next) {
    try {
        const data = await service.getDentalTelemetry();
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function listRecords(req, res, next) {
    try {
        const data = await service.listDentalRecords(req.query);
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function createRecord(req, res, next) {
    try {
        const data = await service.createDentalRecord(req.body, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "DENTAL",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "DENTIST",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.recordNumber || data.id,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: []
        }).catch(() => { });
        return res.rcceSuccess("DENTAL_RECORD_SAVED", data, {
            httpStatus: 201,
            message: `Dental record ${data.recordNumber} saved successfully.`
        });
    } catch (err) {
        next(err);
    }
}

async function updateRecord(req, res, next) {
    try {
        const data = await service.updateDentalRecord(req.params.id, req.body, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "DENTAL",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "DENTIST",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.recordNumber || req.params.id,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: []
        }).catch(() => { });
        return res.rcceSuccess("RECORD_UPDATED", data, {
            httpStatus: 200,
            message: "Dental record updated cleanly."
        });
    } catch (err) {
        next(err);
    }
}

async function getPatientOdontogram(req, res, next) {
    try {
        const data = await service.getPatientOdontogram(req.params.patientId);
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getTelemetry,
    listRecords,
    createRecord,
    updateRecord,
    getPatientOdontogram
};
