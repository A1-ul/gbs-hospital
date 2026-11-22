"use strict";

const service = require("./eye-clinic.service");

async function getTelemetry(req, res, next) {
    try {
        const data = await service.getEyeClinicTelemetry();
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function listExams(req, res, next) {
    try {
        const data = await service.listEyeExams(req.query);
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function createExam(req, res, next) {
    try {
        const data = await service.createEyeExam(req.body, req.user);
        return res.status(201).json({
            success: true,
            message: data.ocularHypertensionFlag
                ? `Eye exam ${data.examNumber} recorded with OCULAR HYPERTENSION ALERT (IOP > 21 mmHg).`
                : `Eye exam ${data.examNumber} saved successfully.`,
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

async function updateExam(req, res, next) {
    try {
        const data = await service.updateEyeExam(req.params.id, req.body, req.user);
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function getPatientHistory(req, res, next) {
    try {
        const data = await service.getPatientEyeHistory(req.params.patientId);
        return res.status(200).json({ success: true, data, requestId: req.requestId });
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
