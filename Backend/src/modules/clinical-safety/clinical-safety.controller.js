"use strict";

const service = require("./clinical-safety.service");

async function getGuardrailsStatus(req, res, next) {
    try {
        const data = await service.getGuardrailsStatus();
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function attemptToggleGuardrail(req, res, next) {
    try {
        service.rejectGuardrailDisableAttempt(req.user, req.body?.guardrail || req.body?.key);
    } catch (err) {
        next(err);
    }
}

async function getPatientAllergies(req, res, next) {
    try {
        const data = await service.getPatientAllergies(req.params.patientId);
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function recordPatientAllergy(req, res, next) {
    try {
        const data = await service.recordPatientAllergy(req.params.patientId, req.body, req.user);
        return res.status(201).json({
            success: true,
            message: "Patient allergy documented and active across all prescribing/dispensing guardrails.",
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

async function checkMedicationSafety(req, res, next) {
    try {
        const data = await service.checkPatientMedicationSafety({
            patientId: req.body?.patientId || req.query?.patientId,
            proposedMedications: req.body?.proposedMedications || req.body?.medications || []
        });
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function listOverrides(req, res, next) {
    try {
        const data = await service.listClinicalSafetyOverrides(req.query);
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function recordOverride(req, res, next) {
    try {
        const data = await service.logClinicalSafetyOverride(req.body, req.user);
        return res.status(201).json({
            success: true,
            message: "Clinical safety override logged to immutable audit trail.",
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getGuardrailsStatus,
    attemptToggleGuardrail,
    getPatientAllergies,
    recordPatientAllergy,
    checkMedicationSafety,
    listOverrides,
    recordOverride
};
