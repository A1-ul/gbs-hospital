"use strict";

const service = require("./icu.service");

async function getTelemetry(req, res, next) {
    try {
        const data = await service.getIcuTelemetry();
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function listMonitors(req, res, next) {
    try {
        const data = await service.listIcuMonitors(req.query);
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function recordVitals(req, res, next) {
    try {
        const data = await service.recordIcuVitals(req.body, req.user);
        return res.status(201).json({
            success: true,
            message:
                data.alertLevel === "CRITICAL"
                    ? `CRITICAL ICU ALERT triggered (${data.monitorCode}, NEWS2=${data.news2Score}). Immediate clinical review required.`
                    : `ICU vitals recorded cleanly (${data.monitorCode}).`,
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

async function acknowledgeAlert(req, res, next) {
    try {
        const data = await service.acknowledgeIcuAlert(req.params.id, req.body, req.user);
        return res.status(200).json({
            success: true,
            message: "ICU critical alert acknowledged and audited.",
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

async function getPatientTrends(req, res, next) {
    try {
        const data = await service.getPatientVitalTrends(req.params.patientId);
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getTelemetry,
    listMonitors,
    recordVitals,
    acknowledgeAlert,
    getPatientTrends
};
