"use strict";

const service = require("./ai-clinical.service");

async function getTelemetry(req, res, next) {
    try {
        const data = await service.getAiClinicalTelemetry();
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function listSuggestions(req, res, next) {
    try {
        const data = await service.listSuggestions(req.query);
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function analyze(req, res, next) {
    try {
        const data = await service.generateClinicalSuggestion(req.body, req.user);
        return res.status(201).json({
            success: true,
            message: `Advisory AI recommendation (${data.suggestionCode}) generated. Licensed clinician review and final decision required.`,
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

async function review(req, res, next) {
    try {
        const data = await service.reviewClinicalSuggestion(req.params.id, req.body, req.user);
        return res.status(200).json({
            success: true,
            message: `Human clinician review recorded (${data.workflowStatus}).`,
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

async function finalDecision(req, res, next) {
    try {
        const data = await service.recordFinalClinicalDecision(req.params.id, req.body, req.user);
        return res.status(200).json({
            success: true,
            message: `Final clinical decision recorded and audited (${data.suggestionCode}).`,
            data,
            requestId: req.requestId
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
