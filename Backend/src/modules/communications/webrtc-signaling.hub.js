"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
REAL-TIME WEBRTC ROOM PRESENCE & SIGNALING RELAY HUB
Supports 1-on-1 Voice/Video Calls & Multi-Participant Camera Conference Rooms
100% CommonJS — Zero Background Timers (Clean Process & Jest Shutdown)
LOCATION: Backend/src/modules/communications/webrtc-signaling.hub.js
================================================================================
*/

const PARTICIPANT_TTL_MS = 90 * 1000; // 90 seconds heartbeat window
const SIGNAL_TTL_MS = 5 * 60 * 1000;  // 5 minutes signal retention window
const MAX_SIGNALS_PER_ROOM = 400;

const rooms = new Map();

function normalizeRoomCode(roomCode) {
    return String(roomCode || "").trim().toUpperCase();
}

function getOrCreateRoom(roomCode) {
    const key = normalizeRoomCode(roomCode);
    if (!key) return null;
    if (!rooms.has(key)) {
        rooms.set(key, {
            roomCode: key,
            participants: new Map(), // userId -> participant snapshot
            signals: [],
            nextSeq: 1,
            updatedAt: Date.now()
        });
    }
    return rooms.get(key);
}

function pruneRoom(room) {
    if (!room) return;
    const now = Date.now();

    for (const [uid, p] of room.participants.entries()) {
        if (now - p.lastSeenAt > PARTICIPANT_TTL_MS) {
            room.participants.delete(uid);
        }
    }

    if (room.signals.length > 0) {
        room.signals = room.signals.filter((s) => now - s.createdAtMs <= SIGNAL_TTL_MS);
        if (room.signals.length > MAX_SIGNALS_PER_ROOM) {
            room.signals = room.signals.slice(-MAX_SIGNALS_PER_ROOM);
        }
    }

    if (room.participants.size === 0 && room.signals.length === 0 && now - room.updatedAt > SIGNAL_TTL_MS) {
        rooms.delete(room.roomCode);
    }
}

function serializeParticipants(room) {
    if (!room) return [];
    pruneRoom(room);
    return Array.from(room.participants.values()).map((p) => ({
        userId: p.userId,
        name: p.name,
        role: p.role,
        email: p.email || null,
        callMode: p.callMode,
        audioEnabled: Boolean(p.audioEnabled),
        videoEnabled: Boolean(p.videoEnabled),
        screenSharing: Boolean(p.screenSharing),
        joinedAt: p.joinedAt,
        lastSeenAt: new Date(p.lastSeenAt).toISOString()
    }));
}

function joinRoom(roomCode, participant = {}) {
    const room = getOrCreateRoom(roomCode);
    if (!room || !participant.userId) return [];

    pruneRoom(room);
    const uid = String(participant.userId);
    const now = Date.now();
    const existing = room.participants.get(uid);
    const defaultVideo = participant.callMode ? participant.callMode === "VIDEO" : true;

    room.participants.set(uid, {
        userId: uid,
        name: participant.name || existing?.name || "Hospital User",
        role: participant.role || existing?.role || "STAFF",
        email: participant.email || existing?.email || null,
        callMode: participant.callMode || existing?.callMode || "VIDEO",
        audioEnabled: participant.audioEnabled !== undefined ? Boolean(participant.audioEnabled) : (existing ? existing.audioEnabled : true),
        videoEnabled: participant.videoEnabled !== undefined ? Boolean(participant.videoEnabled) : (existing ? existing.videoEnabled : defaultVideo),
        screenSharing: participant.screenSharing !== undefined ? Boolean(participant.screenSharing) : (existing ? existing.screenSharing : false),
        joinedAt: existing ? existing.joinedAt : new Date(now).toISOString(),
        lastSeenAt: now
    });
    room.updatedAt = now;

    return serializeParticipants(room);
}

function heartbeatRoom(roomCode, userId, mediaState = {}) {
    const key = normalizeRoomCode(roomCode);
    const room = rooms.get(key);
    if (!room || !userId) return [];

    const uid = String(userId);
    const existing = room.participants.get(uid);
    if (existing) {
        existing.lastSeenAt = Date.now();
        if (mediaState.audioEnabled !== undefined) existing.audioEnabled = Boolean(mediaState.audioEnabled);
        if (mediaState.videoEnabled !== undefined) existing.videoEnabled = Boolean(mediaState.videoEnabled);
        if (mediaState.screenSharing !== undefined) existing.screenSharing = Boolean(mediaState.screenSharing);
        if (mediaState.callMode) existing.callMode = String(mediaState.callMode).toUpperCase();
        room.updatedAt = Date.now();
    }
    return serializeParticipants(room);
}

function leaveRoom(roomCode, userId) {
    const key = normalizeRoomCode(roomCode);
    const room = rooms.get(key);
    if (!room) return [];
    if (userId) {
        room.participants.delete(String(userId));
        room.updatedAt = Date.now();
    }
    const remaining = serializeParticipants(room);
    if (remaining.length === 0) {
        rooms.delete(key);
    }
    return remaining;
}

function closeRoom(roomCode) {
    const key = normalizeRoomCode(roomCode);
    const room = rooms.get(key);
    const previousUserIds = room ? Array.from(room.participants.keys()) : [];
    rooms.delete(key);
    return previousUserIds;
}

function pushSignal(roomCode, signalInput = {}) {
    const room = getOrCreateRoom(roomCode);
    if (!room) return null;
    pruneRoom(room);

    const now = Date.now();
    const record = {
        seq: room.nextSeq++,
        roomCode: room.roomCode,
        fromUserId: String(signalInput.fromUserId || ""),
        fromName: signalInput.fromName || "Hospital User",
        fromRole: signalInput.fromRole || "STAFF",
        toUserId: signalInput.toUserId ? String(signalInput.toUserId) : null,
        type: String(signalInput.type || "ICE_CANDIDATE").toUpperCase(),
        payload: signalInput.payload || {},
        createdAtMs: now,
        createdAt: new Date(now).toISOString()
    };

    room.signals.push(record);
    if (room.signals.length > MAX_SIGNALS_PER_ROOM) {
        room.signals = room.signals.slice(-MAX_SIGNALS_PER_ROOM);
    }
    room.updatedAt = now;

    if (record.fromUserId && room.participants.has(record.fromUserId)) {
        room.participants.get(record.fromUserId).lastSeenAt = now;
    }

    return {
        seq: record.seq,
        roomCode: record.roomCode,
        fromUserId: record.fromUserId,
        fromName: record.fromName,
        fromRole: record.fromRole,
        toUserId: record.toUserId,
        type: record.type,
        payload: record.payload,
        createdAt: record.createdAt
    };
}

function pullSignals(roomCode, userId, afterSeq = 0) {
    const key = normalizeRoomCode(roomCode);
    const room = rooms.get(key);
    if (!room) {
        return {
            roomCode: key,
            latestSeq: Number(afterSeq) || 0,
            participants: [],
            signals: []
        };
    }

    pruneRoom(room);
    const uid = String(userId || "");
    const minSeq = Math.max(0, Number(afterSeq) || 0);

    const matched = room.signals
        .filter((s) => s.seq > minSeq && s.fromUserId !== uid && (!s.toUserId || s.toUserId === uid))
        .map((s) => ({
            seq: s.seq,
            roomCode: s.roomCode,
            fromUserId: s.fromUserId,
            fromName: s.fromName,
            fromRole: s.fromRole,
            toUserId: s.toUserId,
            type: s.type,
            payload: s.payload,
            createdAt: s.createdAt
        }));

    const latestSeq = room.signals.length > 0
        ? room.signals[room.signals.length - 1].seq
        : Math.max(minSeq, room.nextSeq - 1);

    return {
        roomCode: key,
        latestSeq,
        participants: serializeParticipants(room),
        signals: matched
    };
}

function getRoomSnapshot(roomCode) {
    const key = normalizeRoomCode(roomCode);
    const room = rooms.get(key);
    if (!room) {
        return { roomCode: key, participantCount: 0, participants: [] };
    }
    const participants = serializeParticipants(room);
    return {
        roomCode: key,
        participantCount: participants.length,
        participants
    };
}

function getActiveRoomUserIds() {
    const ids = new Set();
    for (const room of rooms.values()) {
        pruneRoom(room);
        for (const uid of room.participants.keys()) {
            ids.add(uid);
        }
    }
    return Array.from(ids);
}

function resetHub() {
    rooms.clear();
}

module.exports = {
    joinRoom,
    heartbeatRoom,
    leaveRoom,
    closeRoom,
    pushSignal,
    pullSignals,
    getRoomSnapshot,
    getActiveRoomUserIds,
    resetHub
};
