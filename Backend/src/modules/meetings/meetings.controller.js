"use strict";

const service = require("./meetings.service");

async function getTelemetry(req, res, next) {
    try {
        const data = await service.getMeetingTelemetry();
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function list(req, res, next) {
    try {
        const data = await service.listMeetings(req.query);
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

async function create(req, res, next) {
    try {
        const data = await service.scheduleMeeting(req.body, req.user);
        return res.status(201).json({
            success: true,
            message: `Online meeting ${data.meetingCode} scheduled successfully.`,
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

async function join(req, res, next) {
    try {
        const data = await service.joinMeeting(req.params.id, req.user);
        return res.status(200).json({
            success: true,
            message: `Joined live meeting room ${data.webrtcSession.roomCode}.`,
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

async function end(req, res, next) {
    try {
        const data = await service.endMeeting(req.params.id, req.body, req.user);
        return res.status(200).json({
            success: true,
            message: `Meeting ${data.meetingCode} ended and minutes saved.`,
            data,
            requestId: req.requestId
        });
    } catch (err) {
        next(err);
    }
}

async function cancel(req, res, next) {
    try {
        const data = await service.cancelMeeting(req.params.id, req.user);
        return res.status(200).json({ success: true, data, requestId: req.requestId });
    } catch (err) {
        next(err);
    }
}

module.exports = { getTelemetry, list, create, join, end, cancel };
