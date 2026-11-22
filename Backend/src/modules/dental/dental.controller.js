"use strict";

const service = require("./dental.service");

async function getTelemetry(req, res, next) {
    try {
        const data = await service.getDentalTelemetry();
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function listRecords(req, res, next) {
    try {
        const data = await service.listDentalRecords(req.query);
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function createRecord(req, res, next) {
    try {
        const data = await service.createDentalRecord(req.body, req.user);
        return res.status(201).json({
            success: true,
            message: `Dental record ${data.recordNumber} saved successfully.`,
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

async function updateRecord(req, res, next) {
    try {
        const data = await service.updateDentalRecord(req.params.id, req.body, req.user);
        return res.status(200).json({
            success: true,
            message: "Dental record updated cleanly.",
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

async function getPatientOdontogram(req, res, next) {
    try {
        const data = await service.getPatientOdontogram(req.params.patientId);
        return res.status(200).json({ success: true, data, requestId: req.requestId });
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
