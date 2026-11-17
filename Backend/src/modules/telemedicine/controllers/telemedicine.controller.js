"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
WEBRTC VIDEO TELEMEDICINE - CONTROLLER
Phase 21 Production Hardened - CommonJS Only
LOCATION: src/modules/telemedicine/controllers/telemedicine.controller.js
====================================================
*/

const service = require("../services/telemedicine.service");
const { rcce } = require("../../../core/gbs-rcce.bootstrap");

async function schedule(req, res, next) {
    try {
        const result = await service.scheduleConsultation(req.body);
        try {
            await rcce.events.publish({
                eventCode: "REQUEST_SUBMITTED",
                domain: "TELEMEDICINE",
                actorUserId: req.user?.id,
                actorRole: req.user?.role,
                affectedRecord: result.sessionCode || result.id,
                severity: "INFO",
                requestId: req.requestId,
                notifications: [
                    {
                        recipientRole: "DOCTOR",
                        title: "Telemedicine Consultation Scheduled",
                        message: `Virtual clinic session ${result.sessionCode} scheduled.`,
                        severity: "INFO"
                    }
                ]
            });
        } catch (_pubErr) {}
        return res.rcceSuccess("REQUEST_SUBMITTED", result, {
            httpStatus: 201,
            message: `Telemedicine session ${result.sessionCode} scheduled`
        });
    } catch (err) {
        next(err);
    }
}

async function list(req, res, next) {
    try {
        const { doctorId, patientId, status, date, page, limit } = req.query;
        const result = await service.getConsultations({ doctorId, patientId, status, date, page, limit });
        res.status(200).json({
            success: true,
            data: result.consultations,
            pagination: result.pagination
        });
    } catch (err) {
        next(err);
    }
}

async function getById(req, res, next) {
    try {
        const { idOrCode } = req.params;
        const result = await service.getConsultationById(idOrCode);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function joinWaitingRoom(req, res, next) {
    try {
        const { sessionCode } = req.params;
        const result = await service.joinWaitingRoom(sessionCode, req.body);
        res.status(200).json({
            success: true,
            message: `Checked into virtual waiting room for ${sessionCode}`,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function startCall(req, res, next) {
    try {
        const { sessionCode } = req.params;
        const result = await service.startVideoCall(sessionCode, req.body);
        res.status(200).json({
            success: true,
            message: `Video call session ${sessionCode} active`,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function signal(req, res, next) {
    try {
        const { sessionCode } = req.params;
        const result = await service.updateSignalingState(sessionCode, req.body);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function endCall(req, res, next) {
    try {
        const { sessionCode } = req.params;
        const result = await service.endConsultation(sessionCode, req.body);
        res.status(200).json({
            success: true,
            message: `Consultation ${sessionCode} completed successfully`,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function cancel(req, res, next) {
    try {
        const { sessionCode } = req.params;
        const result = await service.cancelConsultation(sessionCode, req.body);
        res.status(200).json({
            success: true,
            message: `Consultation ${sessionCode} cancelled`,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function getTelemetry(req, res, next) {
    try {
        const result = await service.getTelemedicineTelemetry();
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    schedule,
    list,
    getById,
    joinWaitingRoom,
    startCall,
    signal,
    endCall,
    cancel,
    getTelemetry
};
