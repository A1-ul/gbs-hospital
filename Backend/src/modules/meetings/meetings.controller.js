"use strict";

const service = require("./meetings.service");
const { rcce } = require("../../core/gbs-rcce.bootstrap");

async function getTelemetry(req, res, next) {
    try {
        const data = await service.getMeetingTelemetry();
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function list(req, res, next) {
    try {
        const data = await service.listMeetings(req.query);
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function create(req, res, next) {
    try {
        const data = await service.scheduleMeeting(req.body, req.user);
        await rcce.events.publish({
            eventCode: "REQUEST_SUBMITTED",
            domain: "MEETINGS",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "ADMIN",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.meetingCode || data.id,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: [
                {
                    recipientRole: "ALL",
                    title: "Hospital Meeting Scheduled",
                    message: `Online meeting ${data.meetingCode} (${data.title || "Clinical Briefing"}) scheduled.`,
                    severity: "INFO"
                }
            ]
        }).catch(() => {});
        return res.rcceSuccess("MEETING_SCHEDULED", data, {
            httpStatus: 201,
            message: `Online meeting ${data.meetingCode} scheduled successfully.`
        });
    } catch (err) {
        next(err);
    }
}

async function join(req, res, next) {
    try {
        const data = await service.joinMeeting(req.params.id, req.user);
        return res.rcceSuccess("SUCCESS", data, {
            httpStatus: 200,
            message: `Joined live meeting room ${data.webrtcSession.roomCode}.`
        });
    } catch (err) {
        next(err);
    }
}

async function end(req, res, next) {
    try {
        const data = await service.endMeeting(req.params.id, req.body, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "MEETINGS",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "ADMIN",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.meetingCode || req.params.id,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: []
        }).catch(() => {});
        return res.rcceSuccess("RECORD_UPDATED", data, {
            httpStatus: 200,
            message: `Meeting ${data.meetingCode} ended and minutes saved.`
        });
    } catch (err) {
        next(err);
    }
}

async function cancel(req, res, next) {
    try {
        const data = await service.cancelMeeting(req.params.id, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "MEETINGS",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "ADMIN",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: data.meetingCode || req.params.id,
            severity: "WARNING",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: []
        }).catch(() => {});
        return res.rcceSuccess("RECORD_UPDATED", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

module.exports = { getTelemetry, list, create, join, end, cancel };
