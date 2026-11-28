"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ALL-USERS VOICE/VIDEO CALLING & MULTI-CAMERA CONFERENCE CONTROLLER
Canonical GBS-RCCE Envelopes & Exact User Feedback
LOCATION: Backend/src/modules/communications/communications.controller.js
================================================================================
*/

const service = require("./communications.service");

async function getDirectory(req, res, next) {
    try {
        const data = await service.getContactDirectory(req.user, req.query);
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function listCalls(req, res, next) {
    try {
        const data = await service.listUserCallsAndConferences(req.user, req.query);
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function getIncomingCalls(req, res, next) {
    try {
        const data = await service.getIncomingCalls(req.user);
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function initiateCall(req, res, next) {
    try {
        const data = await service.initiateDirectCall(req.body, req.user, req.requestId);
        const calleeName = data.call?.callee?.name || "recipient";
        const modeWord = data.call?.callMode === "VOICE" ? "Voice" : "Video";
        return res.rcceSuccess("CALL_INITIATED", data, {
            httpStatus: 201,
            message: `${modeWord} call started — ringing ${calleeName} now.`
        });
    } catch (err) {
        next(err);
    }
}

async function acceptCall(req, res, next) {
    try {
        const data = await service.acceptDirectCall(req.params.id, req.body, req.user, req.requestId);
        return res.rcceSuccess("CALL_ACCEPTED", data, {
            httpStatus: 200,
            message: `Call answered — connecting live ${data.webrtcSession?.callMode === "VOICE" ? "voice audio" : "camera & audio"}.`
        });
    } catch (err) {
        next(err);
    }
}

async function declineCall(req, res, next) {
    try {
        const data = await service.declineDirectCall(req.params.id, req.body, req.user, req.requestId);
        return res.rcceSuccess("CALL_DECLINED", data, {
            httpStatus: 200,
            message: data.reason || "Call declined."
        });
    } catch (err) {
        next(err);
    }
}

async function endCall(req, res, next) {
    try {
        const data = await service.endCallOrConference(req.params.id, req.body, req.user, req.requestId);
        return res.rcceSuccess("CALL_ENDED", data, {
            httpStatus: 200,
            message: `Call ended safely (duration: ${data.durationSeconds}s).`
        });
    } catch (err) {
        next(err);
    }
}

async function createConference(req, res, next) {
    try {
        const data = await service.createConferenceRoom(req.body, req.user, req.requestId);
        return res.rcceSuccess("MEETING_SCHEDULED", data, {
            httpStatus: 201,
            message: `Conference room ${data.conference.roomCode} is ready for live camera video.`
        });
    } catch (err) {
        next(err);
    }
}

async function joinRoom(req, res, next) {
    try {
        const data = await service.joinRoomSession(req.params.roomCode, req.body, req.user);
        return res.rcceSuccess("CONFERENCE_JOINED", data, {
            httpStatus: 200,
            message: `Joined live room ${data.webrtcSession.roomCode} (${data.webrtcSession.activeParticipants.length} active participant${data.webrtcSession.activeParticipants.length === 1 ? "" : "s"}).`
        });
    } catch (err) {
        next(err);
    }
}

async function leaveRoom(req, res, next) {
    try {
        const data = await service.leaveRoomSession(req.params.roomCode, req.user);
        return res.rcceSuccess("CALL_ENDED", data, {
            httpStatus: 200,
            message: `You left room ${data.roomCode}.`
        });
    } catch (err) {
        next(err);
    }
}

async function postSignal(req, res, next) {
    try {
        const data = await service.relayWebRtcSignal(req.params.roomCode, req.body, req.user);
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function getSignals(req, res, next) {
    try {
        const data = await service.pollWebRtcSignals(req.params.roomCode, req.query, req.user);
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getDirectory,
    listCalls,
    getIncomingCalls,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    createConference,
    joinRoom,
    leaveRoom,
    postSignal,
    getSignals
};
