"use strict";

const service = require("./icu.service");
const { rcce } = require("../../core/gbs-rcce.bootstrap");

async function getTelemetry(req, res, next) {
    try {
        const data = await service.getIcuTelemetry();
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function listMonitors(req, res, next) {
    try {
        const data = await service.listIcuMonitors(req.query);
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function recordVitals(req, res, next) {
    try {
        const data = await service.recordIcuVitals(req.body, req.user);
        const isCritical = data.alertLevel === "CRITICAL";
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "ICU",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "NURSE",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.monitorCode || data.id,
            severity: isCritical ? "CRITICAL" : "INFO",
            requestId: req.requestId,
            asyncDelivery: !isCritical,
            notifications: isCritical
                ? [
                    {
                        recipientRole: "DOCTOR",
                        title: "CRITICAL ICU NEWS2 Alert",
                        message: `Critical ICU alert (${data.monitorCode}, NEWS2=${data.news2Score}). Immediate clinical review required.`,
                        severity: "CRITICAL"
                    },
                    {
                        recipientRole: "NURSE",
                        title: "CRITICAL ICU Vitals Escalation",
                        message: `Monitor ${data.monitorCode} flagged CRITICAL (NEWS2=${data.news2Score}).`,
                        severity: "WARNING"
                    }
                ]
                : []
        }).catch(() => {});

        return res.rcceSuccess(isCritical ? "ICU_CRITICAL_ALERT" : "ICU_VITALS_RECORDED", data, {
            httpStatus: 201,
            message: isCritical
                ? `CRITICAL ICU ALERT triggered (${data.monitorCode}, NEWS2=${data.news2Score}). Immediate clinical review required.`
                : `ICU vitals recorded cleanly (${data.monitorCode}).`
        });
    } catch (err) {
        next(err);
    }
}

async function acknowledgeAlert(req, res, next) {
    try {
        const data = await service.acknowledgeIcuAlert(req.params.id, req.body, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "ICU",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "DOCTOR",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.monitorCode || req.params.id,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: [
                {
                    recipientRole: "NURSE",
                    title: "ICU Critical Alert Acknowledged",
                    message: `ICU alert ${data.monitorCode || req.params.id} was acknowledged by ${req.user?.role || "clinician"}.`,
                    severity: "INFO"
                }
            ]
        }).catch(() => {});
        return res.rcceSuccess("RECORD_UPDATED", data, {
            httpStatus: 200,
            message: "ICU critical alert acknowledged and audited."
        });
    } catch (err) {
        next(err);
    }
}

async function getPatientTrends(req, res, next) {
    try {
        const data = await service.getPatientVitalTrends(req.params.patientId);
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
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
