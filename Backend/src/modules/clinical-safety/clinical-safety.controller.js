"use strict";

const service = require("./clinical-safety.service");
const { rcce } = require("../../core/gbs-rcce.bootstrap");

async function getGuardrailsStatus(req, res, next) {
    try {
        const data = await service.getGuardrailsStatus();
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
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
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function recordPatientAllergy(req, res, next) {
    try {
        const data = await service.recordPatientAllergy(req.params.patientId, req.body, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "CLINICAL_SAFETY",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "DOCTOR",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.id || req.params.patientId,
            severity: "WARNING",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: [
                {
                    recipientRole: "PHARMACIST",
                    title: "Patient Allergy Guardrail Updated",
                    message: `Allergy documented (${data.allergen || "allergy alert"}) for patient ${req.params.patientId}. Dispensing alerts active.`,
                    severity: "WARNING"
                },
                {
                    recipientRole: "DOCTOR",
                    title: "Patient Allergy Documented",
                    message: `Allergy guardrail activated for patient ${req.params.patientId}.`,
                    severity: "WARNING"
                }
            ]
        }).catch(() => { });
        return res.rcceSuccess("CLINICAL_SAFETY_ALERT", data, {
            httpStatus: 201,
            message: "Patient allergy documented and active across all prescribing/dispensing guardrails."
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
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function listOverrides(req, res, next) {
    try {
        const data = await service.listClinicalSafetyOverrides(req.query);
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function recordOverride(req, res, next) {
    try {
        const data = await service.logClinicalSafetyOverride(req.body, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "CLINICAL_SAFETY",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "DOCTOR",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.id || req.body?.patientId || "SAFETY_OVERRIDE",
            severity: "WARNING",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: [
                {
                    recipientRole: "ADMIN",
                    title: "Clinical Safety Override Logged",
                    message: `Clinician override recorded (${data.overrideType || "SAFETY"}) with documented justification.`,
                    severity: "WARNING"
                }
            ]
        }).catch(() => { });
        return res.rcceSuccess("CLINICAL_OVERRIDE_RECORDED", data, {
            httpStatus: 201,
            message: "Clinical safety override logged to immutable audit trail."
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
