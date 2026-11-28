"use strict";

const service = require("./ai-clinical.service");
const { rcce } = require("../../core/gbs-rcce.bootstrap");

async function getTelemetry(req, res, next) {
    try {
        const data = await service.getAiClinicalTelemetry();
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function listSuggestions(req, res, next) {
    try {
        const data = await service.listSuggestions(req.query);
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function analyze(req, res, next) {
    try {
        const data = await service.generateClinicalSuggestion(req.body, req.user);
        rcce.events.publish({
            eventCode: "REQUEST_SUBMITTED",
            domain: "AI_CLINICAL",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "DOCTOR",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.suggestionCode || data.id,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: [
                {
                    recipientRole: "DOCTOR",
                    title: "Clinical Advisory Awaiting Clinician Review",
                    message: `Advisory assessment ${data.suggestionCode} generated — licensed clinician approval required.`,
                    severity: "INFO"
                }
            ]
        }).catch(() => {});
        return res.rcceSuccess("CLINICAL_ADVISORY_RECORDED", data, {
            httpStatus: 201,
            message: `Advisory AI recommendation (${data.suggestionCode}) generated. Licensed clinician review and final decision required.`
        });
    } catch (err) {
        next(err);
    }
}

async function review(req, res, next) {
    try {
        const data = await service.reviewClinicalSuggestion(req.params.id, req.body, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "AI_CLINICAL",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "DOCTOR",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.suggestionCode || req.params.id,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: []
        }).catch(() => {});
        return res.rcceSuccess("RECORD_UPDATED", data, {
            httpStatus: 200,
            message: `Human clinician review recorded (${data.workflowStatus}).`
        });
    } catch (err) {
        next(err);
    }
}

async function finalDecision(req, res, next) {
    try {
        const data = await service.recordFinalClinicalDecision(req.params.id, req.body, req.user);
        rcce.events.publish({
            eventCode: "REQUEST_APPROVED",
            domain: "AI_CLINICAL",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "DOCTOR",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.suggestionCode || req.params.id,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: []
        }).catch(() => {});
        return res.rcceSuccess("RECORD_UPDATED", data, {
            httpStatus: 200,
            message: `Final clinical decision recorded and audited (${data.suggestionCode}).`
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getTelemetry,
    listSuggestions,
    analyze,
    review,
    finalDecision
};
