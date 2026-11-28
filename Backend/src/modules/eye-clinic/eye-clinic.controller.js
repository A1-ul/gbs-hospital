"use strict";

const service = require("./eye-clinic.service");
const { rcce } = require("../../core/gbs-rcce.bootstrap");

async function getTelemetry(req, res, next) {
    try {
        const data = await service.getEyeClinicTelemetry();
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function listExams(req, res, next) {
    try {
        const data = await service.listEyeExams(req.query);
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function createExam(req, res, next) {
    try {
        const data = await service.createEyeExam(req.body, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "EYE_CLINIC",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "EYE_DOCTOR",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.examNumber || data.id,
            severity: data.ocularHypertensionFlag ? "WARNING" : "INFO",
            requestId: req.requestId,
            asyncDelivery: !data.ocularHypertensionFlag,
            notifications: data.ocularHypertensionFlag
                ? [
                    {
                        recipientRole: "DOCTOR",
                        title: "Ocular Hypertension Alert (IOP > 21 mmHg)",
                        message: `Eye exam ${data.examNumber} flagged elevated intraocular pressure.`,
                        severity: "WARNING"
                    }
                ]
                : []
        }).catch(() => { });
        return res.rcceSuccess("EYE_EXAM_RECORDED", data, {
            httpStatus: 201,
            message: data.ocularHypertensionFlag
                ? `Eye exam ${data.examNumber} recorded with OCULAR HYPERTENSION ALERT (IOP > 21 mmHg).`
                : `Eye exam ${data.examNumber} saved successfully.`
        });
    } catch (err) {
        next(err);
    }
}

async function updateExam(req, res, next) {
    try {
        const data = await service.updateEyeExam(req.params.id, req.body, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "EYE_CLINIC",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "EYE_DOCTOR",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.examNumber || req.params.id,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: []
        }).catch(() => { });
        return res.rcceSuccess("RECORD_UPDATED", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function getPatientHistory(req, res, next) {
    try {
        const data = await service.getPatientEyeHistory(req.params.patientId);
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getTelemetry,
    listExams,
    createExam,
    updateExam,
    getPatientHistory
};
