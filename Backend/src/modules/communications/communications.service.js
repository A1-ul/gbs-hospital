"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ALL-USERS VOICE/VIDEO CALLING & MULTI-CAMERA CONFERENCE SERVICE
PostgreSQL Persistence (HospitalMeeting + AuditLog + SystemNotification) +
Real-Time SSE Delivery + Multi-Peer WebRTC Signaling Hub
100% CommonJS — Zero Fake Connections, Strict Developer Isolation
LOCATION: Backend/src/modules/communications/communications.service.js
================================================================================
*/

const crypto = require("crypto");
const prisma = require("../../core/database/prisma.client");
const { ensureDefaultHospitalId } = require("../../core/database/hospital-resolver");
const AppError = require("../../core/errors/app.error");
const { rcce } = require("../../core/gbs-rcce.bootstrap");
const { hasDeveloperAccess } = require("../../config/roles");
const webrtcHub = require("./webrtc-signaling.hub");

const DIRECT_CALL_TYPES = new Set(["DIRECT_VOICE_CALL", "DIRECT_VIDEO_CALL"]);
const VALID_SIGNAL_TYPES = new Set(["OFFER", "ANSWER", "ICE_CANDIDATE", "MEDIA_STATE", "RENEGOTIATE"]);
const RING_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes before unanswered ring expires

const DEFAULT_ICE_SERVERS = Object.freeze([
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
]);

const ROLE_FRIENDLY_LABELS = Object.freeze({
    ADMINISTRATOR: { label: "Administrator", dept: "Hospital Administration" },
    HOSPITAL_DIRECTOR: { label: "Hospital Director", dept: "Executive Office" },
    DOCTOR: { label: "Medical Doctor", dept: "General Medicine" },
    SURGEON: { label: "Surgeon", dept: "Surgery & Operating Rooms" },
    DENTIST: { label: "Dentist", dept: "Dental Clinic" },
    EYE_DOCTOR: { label: "Eye Doctor", dept: "Eye Clinic" },
    RADIOLOGIST: { label: "Radiologist", dept: "X-Rays & Scans" },
    NURSE: { label: "Nurse", dept: "Nursing & Wards" },
    PHARMACIST: { label: "Pharmacist", dept: "Hospital Pharmacy" },
    LAB_TECHNICIAN: { label: "Lab Technician", dept: "Laboratory & Blood Bank" },
    RECEPTIONIST: { label: "Receptionist", dept: "Front Desk" },
    FOLDER_RETRIEVER: { label: "File Archivist", dept: "Medical Records Room" },
    ACCOUNTANT: { label: "Accountant", dept: "Billing & Accounts" },
    HR_MANAGER: { label: "HR Manager", dept: "Human Resources" },
    PATIENT: { label: "Patient", dept: "Patient & Family Portal" },
    DEVELOPER: { label: "System Engineer", dept: "System Engineering" }
});

function formatUserDisplayName(user) {
    if (!user) return "Hospital User";
    const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return full || user.email || "Hospital User";
}

function getFriendlyRoleMeta(role) {
    const key = String(role || "").toUpperCase();
    return ROLE_FRIENDLY_LABELS[key] || { label: key || "Staff", dept: "Hospital Team" };
}

function parseCallMeta(meeting) {
    if (!meeting) return null;
    if (meeting.agenda && typeof meeting.agenda === "string" && meeting.agenda.trim().startsWith("{")) {
        try {
            const parsed = JSON.parse(meeting.agenda);
            if (parsed && typeof parsed === "object") {
                return parsed;
            }
        } catch (_err) {
            // plain text conference agenda
        }
    }
    return null;
}

function isDirectCallRecord(meeting) {
    return Boolean(meeting && DIRECT_CALL_TYPES.has(String(meeting.meetingType || "").toUpperCase()));
}

function buildIceServersConfig() {
    if (process.env.WEBRTC_ICE_SERVERS_JSON) {
        try {
            const parsed = JSON.parse(process.env.WEBRTC_ICE_SERVERS_JSON);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        } catch (_err) {
            // fall back safely to default STUN servers
        }
    }
    return DEFAULT_ICE_SERVERS;
}

async function generateUniqueRoomCode(prefix) {
    const year = new Date().getFullYear();
    const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `${prefix}-${year}-${rand}`;
}

function serializeCallOrMeeting(record, currentUserId = null) {
    const meta = parseCallMeta(record);
    const snapshot = webrtcHub.getRoomSnapshot(record.meetingCode);
    const direct = isDirectCallRecord(record);

    return {
        id: record.id,
        roomCode: record.meetingCode,
        meetingCode: record.meetingCode,
        roomToken: record.roomToken,
        title: record.title,
        meetingType: record.meetingType,
        kind: direct ? "DIRECT_CALL" : "CONFERENCE",
        callMode: meta?.callMode || (record.meetingType === "DIRECT_VOICE_CALL" ? "VOICE" : "VIDEO"),
        department: record.department,
        status: record.status,
        organizerId: record.organizerId,
        organizerName: record.organizerName,
        caller: meta?.caller || null,
        callee: meta?.callee || null,
        isIncomingForMe: Boolean(
            direct &&
            currentUserId &&
            meta?.callee?.userId === String(currentUserId) &&
            record.status === "RINGING"
        ),
        note: meta?.note || (!direct ? record.agenda : null),
        screenShareEnabled: Boolean(record.screenShareEnabled),
        scheduledStart: record.scheduledStart,
        startedAt: record.startedAt,
        endedAt: record.endedAt,
        minutesSummary: record.minutesSummary || null,
        participants: Array.isArray(record.participants) ? record.participants : [],
        activeParticipants: snapshot.participants,
        activeParticipantCount: snapshot.participantCount,
        iceServers: buildIceServersConfig()
    };
}

/**
 * 1. Family-Friendly Contact Directory (ALL authenticated users; DEVELOPER excluded for public users)
 */
async function getContactDirectory(actor, { search = "", role = "", limit = 100 } = {}) {
    const actorIsDeveloper = hasDeveloperAccess(actor?.role);
    const where = {
        active: true,
        id: { not: actor?.id }
    };

    if (!actorIsDeveloper) {
        where.role = { name: { not: "DEVELOPER" } };
    }

    if (role && String(role).trim().toUpperCase() !== "ALL") {
        const requestedRole = String(role).trim().toUpperCase();
        if (requestedRole === "DEVELOPER" && !actorIsDeveloper) {
            return {
                total: 0,
                onlineCount: 0,
                contacts: []
            };
        }
        where.role = { name: requestedRole };
    }

    const cleanSearch = String(search || "").trim();
    if (cleanSearch) {
        where.OR = [
            { firstName: { contains: cleanSearch, mode: "insensitive" } },
            { lastName: { contains: cleanSearch, mode: "insensitive" } },
            { email: { contains: cleanSearch, mode: "insensitive" } }
        ];
    }

    const users = await prisma.user.findMany({
        where,
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            lastLogin: true,
            role: { select: { name: true } }
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        take: Math.min(Math.max(1, Number(limit) || 100), 200)
    });

    const onlineSet = new Set([
        ...rcce.events.getOnlineUserIds(),
        ...webrtcHub.getActiveRoomUserIds()
    ]);

    const contacts = users
        .map((u) => {
            const roleName = u.role?.name || "STAFF";
            const roleMeta = getFriendlyRoleMeta(roleName);
            const isOnline = onlineSet.has(String(u.id));
            return {
                id: u.id,
                name: formatUserDisplayName(u),
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                role: roleName,
                roleLabel: roleMeta.label,
                department: roleMeta.dept,
                isOnline,
                lastLoginAt: u.lastLogin || null
            };
        })
        .sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || a.name.localeCompare(b.name));

    return {
        total: contacts.length,
        onlineCount: contacts.filter((c) => c.isOnline).length,
        contacts
    };
}

/**
 * 2. Initiate a 1-on-1 Voice or Video Call to Any User
 */
async function initiateDirectCall(payload = {}, actor, requestId = null) {
    const calleeId = String(payload.calleeId || payload.targetUserId || "").trim();
    if (!calleeId) {
        throw new AppError("Please select the person you want to call.", 400, "MISSING_CALLEE");
    }
    if (calleeId === String(actor?.id)) {
        throw new AppError("You cannot place a direct call to your own account.", 400, "SELF_CALL_NOT_ALLOWED");
    }

    const callMode = String(payload.callMode || "VIDEO").trim().toUpperCase() === "VOICE" ? "VOICE" : "VIDEO";
    const note = payload.note ? String(payload.note).trim().slice(0, 240) : null;

    const [callerUser, calleeUser] = await Promise.all([
        prisma.user.findUnique({
            where: { id: actor.id },
            select: { id: true, firstName: true, lastName: true, email: true, role: { select: { name: true } } }
        }),
        prisma.user.findUnique({
            where: { id: calleeId },
            select: { id: true, firstName: true, lastName: true, email: true, active: true, role: { select: { name: true } } }
        })
    ]);

    if (!calleeUser || !calleeUser.active) {
        throw new AppError("The person you tried to call is unavailable or inactive.", 404, "CALLEE_NOT_FOUND");
    }

    const callerRoleName = callerUser?.role?.name || actor.role || "STAFF";
    const calleeRoleName = calleeUser.role?.name || "STAFF";

    if (calleeRoleName === "DEVELOPER" && !hasDeveloperAccess(actor?.role)) {
        throw new AppError("This contact cannot be called directly from the hospital directory.", 403, "FORBIDDEN");
    }

    const callerName = formatUserDisplayName(callerUser || actor);
    const calleeName = formatUserDisplayName(calleeUser);
    const callerMeta = getFriendlyRoleMeta(callerRoleName);
    const calleeMeta = getFriendlyRoleMeta(calleeRoleName);

    const hospitalId = actor?.hospitalId || (await ensureDefaultHospitalId());
    const roomCode = await generateUniqueRoomCode("CALL");
    const roomToken = `GBS-CALL-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const meetingType = callMode === "VOICE" ? "DIRECT_VOICE_CALL" : "DIRECT_VIDEO_CALL";

    const callMetadata = {
        kind: "DIRECT_CALL",
        callMode,
        caller: {
            userId: String(actor.id),
            name: callerName,
            role: callerRoleName,
            roleLabel: callerMeta.label,
            department: callerMeta.dept
        },
        callee: {
            userId: String(calleeUser.id),
            name: calleeName,
            role: calleeRoleName,
            roleLabel: calleeMeta.label,
            department: calleeMeta.dept
        },
        note
    };

    const now = new Date();
    const record = await prisma.$transaction(async (tx) => {
        const created = await tx.hospitalMeeting.create({
            data: {
                meetingCode: roomCode,
                hospitalId,
                title: `${callMode === "VOICE" ? "Voice" : "Video"} Call: ${callerName} & ${calleeName}`,
                meetingType,
                department: callerMeta.dept,
                organizerId: actor.id,
                organizerName: callerName,
                roomToken,
                scheduledStart: now,
                scheduledEnd: new Date(now.getTime() + 60 * 60 * 1000),
                status: "RINGING",
                participants: [
                    { userId: String(actor.id), name: callerName, role: callerRoleName, joinedAt: now.toISOString(), status: "CALLER_READY" },
                    { userId: String(calleeUser.id), name: calleeName, role: calleeRoleName, joinedAt: null, status: "RINGING" }
                ],
                screenShareEnabled: callMode === "VIDEO",
                agenda: JSON.stringify(callMetadata)
            }
        });

        await tx.auditLog.create({
            data: {
                userId: actor.id,
                role: callerRoleName,
                hospitalId,
                action: "DIRECT_CALL_INITIATED",
                module: "COMMUNICATIONS",
                outcome: "SUCCESS",
                affectedRecord: created.id,
                requestId,
                description: `[${roomCode}] ${callerName} started a ${callMode.toLowerCase()} call to ${calleeName}`
            }
        });

        return created;
    });

    // Register caller in live WebRTC room immediately so peer negotiation is ready
    webrtcHub.joinRoom(roomCode, {
        userId: actor.id,
        name: callerName,
        role: callerRoleName,
        email: callerUser?.email || actor.email,
        callMode,
        audioEnabled: true,
        videoEnabled: callMode === "VIDEO"
    });

    const serialized = serializeCallOrMeeting(record, actor.id);

    // Push real-time SSE incoming call alert directly to callee
    rcce.events.emitUserEvent(calleeUser.id, "call_event", {
        type: "INCOMING_CALL",
        call: {
            ...serialized,
            isIncomingForMe: true
        }
    });

    // Record persistent notification & event
    await rcce.events.publish({
        eventCode: "CALL_INITIATED",
        domain: "COMMUNICATIONS",
        actorUserId: actor.id,
        actorRole: actor.role,
        tenantId: actor.tenantId || null,
        affectedRecord: roomCode,
        severity: "INFO",
        requestId,
        asyncDelivery: true,
        notifications: [
            {
                recipientUserId: calleeUser.id,
                title: `Incoming ${callMode === "VOICE" ? "Voice" : "Video"} Call from ${callerName}`,
                message: `${callerName} (${callerMeta.label}) is calling you${note ? `: "${note}"` : "."}`,
                severity: "INFO",
                affectedRecord: roomCode
            }
        ]
    }).catch(() => {});

    return {
        call: serialized,
        webrtcSession: {
            roomCode,
            roomToken,
            callMode,
            iceServers: buildIceServersConfig(),
            joinedAs: callerName
        }
    };
}

/**
 * 3. Poll / Check Incoming Ringing Calls for Current User
 */
async function getIncomingCalls(actor) {
    const recentRinging = await prisma.hospitalMeeting.findMany({
        where: {
            meetingType: { in: ["DIRECT_VOICE_CALL", "DIRECT_VIDEO_CALL"] },
            status: "RINGING"
        },
        orderBy: { scheduledStart: "desc" },
        take: 30
    });

    const now = Date.now();
    const activeIncoming = [];
    const expiredIds = [];

    for (const rec of recentRinging) {
        const meta = parseCallMeta(rec);
        const ageMs = now - new Date(rec.scheduledStart).getTime();
        if (ageMs > RING_EXPIRY_MS) {
            expiredIds.push(rec.id);
            continue;
        }
        if (meta?.callee?.userId === String(actor.id)) {
            activeIncoming.push(serializeCallOrMeeting(rec, actor.id));
        }
    }

    if (expiredIds.length > 0) {
        await prisma.hospitalMeeting.updateMany({
            where: { id: { in: expiredIds }, status: "RINGING" },
            data: {
                status: "MISSED",
                endedAt: new Date(),
                minutesSummary: "Unanswered call timed out."
            }
        }).catch(() => {});
    }

    return {
        count: activeIncoming.length,
        incomingCalls: activeIncoming
    };
}

/**
 * 4. List Current User's Calls & Live/Scheduled Open Conference Meetings
 */
async function listUserCallsAndConferences(actor, { limit = 40 } = {}) {
    const rows = await prisma.hospitalMeeting.findMany({
        orderBy: { scheduledStart: "desc" },
        take: Math.min(Math.max(10, Number(limit) * 2), 150)
    });

    const uid = String(actor.id);
    const directCalls = [];
    const conferences = [];

    for (const row of rows) {
        if (isDirectCallRecord(row)) {
            const meta = parseCallMeta(row);
            const isParticipant =
                row.organizerId === uid ||
                meta?.caller?.userId === uid ||
                meta?.callee?.userId === uid;
            if (isParticipant) {
                directCalls.push(serializeCallOrMeeting(row, uid));
            }
        } else {
            conferences.push(serializeCallOrMeeting(row, uid));
        }
    }

    const maxItems = Math.min(Math.max(1, Number(limit) || 40), 100);
    return {
        directCalls: directCalls.slice(0, maxItems),
        conferences: conferences.slice(0, maxItems),
        liveConferenceCount: conferences.filter((c) => c.status === "LIVE" || c.activeParticipantCount > 0).length
    };
}

async function findCallOrMeetingOrThrow(idOrCode) {
    const clean = String(idOrCode || "").trim();
    if (!clean) {
        throw new AppError("Call or meeting room reference is required.", 400, "MISSING_ROOM_CODE");
    }
    const existing = await prisma.hospitalMeeting.findFirst({
        where: {
            OR: [{ id: clean }, { meetingCode: clean }, { roomToken: clean }]
        }
    });
    if (!existing) {
        throw new AppError("Call or meeting room not found.", 404, "CALL_NOT_FOUND");
    }
    return existing;
}

/**
 * 5. Accept an Incoming Direct Voice or Video Call
 */
async function acceptDirectCall(idOrCode, payload = {}, actor, requestId = null) {
    const existing = await findCallOrMeetingOrThrow(idOrCode);
    const meta = parseCallMeta(existing);
    const uid = String(actor.id);

    if (isDirectCallRecord(existing)) {
        const isAllowed = meta?.callee?.userId === uid || meta?.caller?.userId === uid || existing.organizerId === uid;
        if (!isAllowed) {
            throw new AppError("You are not a participant on this direct call.", 403, "FORBIDDEN");
        }
    }

    if (["COMPLETED", "CANCELLED", "MISSED"].includes(existing.status)) {
        throw new AppError(`This call has already ended (${existing.status.toLowerCase()}).`, 409, "CALL_ALREADY_ENDED");
    }

    const answerMode = payload.callMode
        ? (String(payload.callMode).toUpperCase() === "VOICE" ? "VOICE" : "VIDEO")
        : (meta?.callMode || "VIDEO");

    const actorUser = await prisma.user.findUnique({
        where: { id: actor.id },
        select: { id: true, firstName: true, lastName: true, email: true, role: { select: { name: true } } }
    });
    const actorRoleName = actorUser?.role?.name || actor.role || "STAFF";
    const actorName = formatUserDisplayName(actorUser || actor);

    const now = new Date();
    const participants = Array.isArray(existing.participants) ? [...existing.participants] : [];
    const idx = participants.findIndex((p) => p && String(p.userId) === uid);
    if (idx >= 0) {
        participants[idx] = { ...participants[idx], joinedAt: now.toISOString(), status: "CONNECTED" };
    } else {
        participants.push({ userId: uid, name: actorName, role: actorRoleName, joinedAt: now.toISOString(), status: "CONNECTED" });
    }

    const updated = await prisma.hospitalMeeting.update({
        where: { id: existing.id },
        data: {
            status: "LIVE",
            startedAt: existing.startedAt || now,
            participants
        }
    });

    const activeParticipants = webrtcHub.joinRoom(updated.meetingCode, {
        userId: uid,
        name: actorName,
        role: actorRoleName,
        email: actorUser?.email || actor.email,
        callMode: answerMode,
        audioEnabled: true,
        videoEnabled: answerMode === "VIDEO"
    });

    const serialized = serializeCallOrMeeting(updated, uid);

    // Notify the caller immediately via SSE that callee answered!
    const otherPartyId = meta?.caller?.userId === uid ? meta?.callee?.userId : meta?.caller?.userId;
    if (otherPartyId) {
        rcce.events.emitUserEvent(otherPartyId, "call_event", {
            type: "CALL_ACCEPTED",
            acceptedBy: { userId: uid, name: actorName, role: actor.role, callMode: answerMode },
            call: serialized,
            activeParticipants
        });
    }

    rcce.events.publish({
        eventCode: "CALL_ACCEPTED",
        domain: "COMMUNICATIONS",
        actorUserId: actor.id,
        actorRole: actor.role,
        tenantId: actor.tenantId || null,
        affectedRecord: updated.meetingCode,
        severity: "INFO",
        requestId,
        asyncDelivery: true,
        notifications: []
    }).catch(() => {});

    return {
        call: serialized,
        webrtcSession: {
            roomCode: updated.meetingCode,
            roomToken: updated.roomToken,
            callMode: answerMode,
            iceServers: buildIceServersConfig(),
            joinedAs: actorName,
            activeParticipants
        }
    };
}

/**
 * 6. Decline or Cancel a Ringing Direct Call
 */
async function declineDirectCall(idOrCode, payload = {}, actor, requestId = null) {
    const existing = await findCallOrMeetingOrThrow(idOrCode);
    const meta = parseCallMeta(existing);
    const uid = String(actor.id);

    if (isDirectCallRecord(existing)) {
        const isAllowed = meta?.callee?.userId === uid || meta?.caller?.userId === uid || existing.organizerId === uid;
        if (!isAllowed) {
            throw new AppError("You are not authorized to decline this call.", 403, "FORBIDDEN");
        }
    }

    const actorName = formatUserDisplayName(actor);
    const isCallerCancelling = meta?.caller?.userId === uid || existing.organizerId === uid;
    const reason = payload.reason
        ? String(payload.reason).trim().slice(0, 200)
        : (isCallerCancelling ? "Caller cancelled before answer." : "Declined by recipient.");

    const updated = await prisma.hospitalMeeting.update({
        where: { id: existing.id },
        data: {
            status: "CANCELLED",
            endedAt: new Date(),
            minutesSummary: reason
        }
    });

    webrtcHub.closeRoom(updated.meetingCode);
    const serialized = serializeCallOrMeeting(updated, uid);

    const otherPartyId = meta?.caller?.userId === uid ? meta?.callee?.userId : meta?.caller?.userId;
    if (otherPartyId) {
        rcce.events.emitUserEvent(otherPartyId, "call_event", {
            type: isCallerCancelling ? "CALL_CANCELLED" : "CALL_DECLINED",
            by: { userId: uid, name: actorName, role: actor.role },
            reason,
            call: serialized
        });
    }

    rcce.events.publish({
        eventCode: "CALL_DECLINED",
        domain: "COMMUNICATIONS",
        actorUserId: actor.id,
        actorRole: actor.role,
        tenantId: actor.tenantId || null,
        affectedRecord: updated.meetingCode,
        severity: "INFO",
        requestId,
        asyncDelivery: true,
        notifications: otherPartyId
            ? [
                {
                    recipientUserId: otherPartyId,
                    title: isCallerCancelling ? "Call Cancelled" : "Call Declined",
                    message: `${actorName}: ${reason}`,
                    severity: "INFO",
                    affectedRecord: updated.meetingCode
                }
            ]
            : []
    }).catch(() => {});

    return {
        call: serialized,
        reason
    };
}

/**
 * 7. End an Active Call or Conference Meeting
 */
async function endCallOrConference(idOrCode, payload = {}, actor, requestId = null) {
    const existing = await findCallOrMeetingOrThrow(idOrCode);
    const meta = parseCallMeta(existing);
    const uid = String(actor.id);

    if (isDirectCallRecord(existing)) {
        const isAllowed = meta?.callee?.userId === uid || meta?.caller?.userId === uid || existing.organizerId === uid;
        if (!isAllowed) {
            throw new AppError("You are not authorized to end this call.", 403, "FORBIDDEN");
        }
    }

    const endTime = new Date();
    const startTime = existing.startedAt || existing.scheduledStart || endTime;
    const durationSeconds = Math.max(0, Math.round((endTime.getTime() - new Date(startTime).getTime()) / 1000));
    const summaryText = payload.minutesSummary
        ? String(payload.minutesSummary).trim()
        : `Session ended cleanly after ${durationSeconds} seconds.`;

    const updated = await prisma.hospitalMeeting.update({
        where: { id: existing.id },
        data: {
            status: "COMPLETED",
            endedAt: endTime,
            minutesSummary: summaryText
        }
    });

    const activePeerIds = webrtcHub.closeRoom(updated.meetingCode);
    const notifyIds = new Set(activePeerIds);
    if (meta?.caller?.userId) notifyIds.add(String(meta.caller.userId));
    if (meta?.callee?.userId) notifyIds.add(String(meta.callee.userId));
    notifyIds.delete(uid);

    const serialized = serializeCallOrMeeting(updated, uid);

    if (notifyIds.size > 0) {
        rcce.events.emitUserEvent(Array.from(notifyIds), "call_event", {
            type: "CALL_ENDED",
            endedBy: { userId: uid, name: formatUserDisplayName(actor), role: actor.role },
            durationSeconds,
            call: serialized
        });
    }

    await prisma.auditLog.create({
        data: {
            userId: actor.id,
            role: actor.role,
            hospitalId: existing.hospitalId,
            action: isDirectCallRecord(existing) ? "DIRECT_CALL_ENDED" : "CONFERENCE_MEETING_ENDED",
            module: "COMMUNICATIONS",
            outcome: "SUCCESS",
            affectedRecord: updated.id,
            requestId,
            description: `[${updated.meetingCode}] Ended after ${durationSeconds}s`
        }
    }).catch(() => {});

    return {
        call: serialized,
        durationSeconds
    };
}

/**
 * 8. Create an Open Multi-Camera Video/Voice Conference Meeting (ALL authenticated users)
 */
async function createConferenceRoom(payload = {}, actor, requestId = null) {
    const title = String(payload.title || "").trim();
    if (!title) {
        throw new AppError("Please enter a title for your conference meeting.", 400, "MISSING_MEETING_TITLE");
    }

    const callMode = String(payload.callMode || "VIDEO").toUpperCase() === "VOICE" ? "VOICE" : "VIDEO";
    const meetingType = String(payload.meetingType || "FAMILY_CARE_CONFERENCE").toUpperCase();
    if (DIRECT_CALL_TYPES.has(meetingType)) {
        throw new AppError("Use direct calling for 1-on-1 calls.", 400, "INVALID_CONFERENCE_TYPE");
    }

    const actorUser = await prisma.user.findUnique({
        where: { id: actor.id },
        select: { id: true, firstName: true, lastName: true, email: true, role: { select: { name: true } } }
    });
    const actorRoleName = actorUser?.role?.name || actor.role || "STAFF";
    const organizerName = formatUserDisplayName(actorUser || actor);
    const roleMeta = getFriendlyRoleMeta(actorRoleName);
    const hospitalId = actor?.hospitalId || (await ensureDefaultHospitalId());
    const roomCode = await generateUniqueRoomCode("CONF");
    const roomToken = `GBS-CONF-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const startImmediately = payload.startImmediately !== false;
    const now = new Date();
    const startDt = payload.scheduledStart ? new Date(payload.scheduledStart) : now;
    const endDt = payload.scheduledEnd ? new Date(payload.scheduledEnd) : new Date(startDt.getTime() + 60 * 60 * 1000);

    const record = await prisma.$transaction(async (tx) => {
        const created = await tx.hospitalMeeting.create({
            data: {
                meetingCode: roomCode,
                hospitalId,
                title,
                meetingType,
                department: String(payload.department || roleMeta.dept).trim(),
                organizerId: actor.id,
                organizerName,
                roomToken,
                scheduledStart: startDt,
                scheduledEnd: endDt,
                startedAt: startImmediately ? now : null,
                status: startImmediately ? "LIVE" : "SCHEDULED",
                participants: [
                    { userId: String(actor.id), name: organizerName, role: actorRoleName, joinedAt: startImmediately ? now.toISOString() : null }
                ],
                screenShareEnabled: payload.screenShareEnabled !== false,
                agenda: payload.agenda ? String(payload.agenda).trim() : `${callMode === "VIDEO" ? "Live Camera" : "Voice"} conference hosted by ${organizerName}`
            }
        });

        await tx.auditLog.create({
            data: {
                userId: actor.id,
                role: actorRoleName,
                hospitalId,
                action: "CONFERENCE_ROOM_CREATED",
                module: "COMMUNICATIONS",
                outcome: "SUCCESS",
                affectedRecord: created.id,
                requestId,
                description: `[${roomCode}] Created conference meeting "${title}"`
            }
        });

        return created;
    });

    if (startImmediately) {
        webrtcHub.joinRoom(roomCode, {
            userId: actor.id,
            name: organizerName,
            role: actorRoleName,
            email: actorUser?.email || actor.email,
            callMode,
            audioEnabled: true,
            videoEnabled: callMode === "VIDEO"
        });
    }

    const serialized = serializeCallOrMeeting(record, actor.id);

    // Notify explicitly invited participants in real time
    const invitedIds = Array.isArray(payload.invitedUserIds)
        ? payload.invitedUserIds.map((id) => String(id)).filter((id) => id && id !== String(actor.id))
        : [];

    if (invitedIds.length > 0) {
        rcce.events.emitUserEvent(invitedIds, "call_event", {
            type: "CONFERENCE_INVITE",
            invitedBy: { userId: String(actor.id), name: organizerName, role: actor.role },
            call: serialized
        });

        await rcce.events.publish({
            eventCode: "CONFERENCE_JOINED",
            domain: "COMMUNICATIONS",
            actorUserId: actor.id,
            actorRole: actor.role,
            tenantId: actor.tenantId || null,
            affectedRecord: roomCode,
            severity: "INFO",
            requestId,
            asyncDelivery: true,
            notifications: invitedIds.map((uid) => ({
                recipientUserId: uid,
                title: `Conference Invite: ${title}`,
                message: `${organizerName} invited you to join live video meeting ${roomCode}.`,
                severity: "INFO",
                affectedRecord: roomCode
            }))
        }).catch(() => {});
    }

    return {
        conference: serialized,
        webrtcSession: {
            roomCode,
            roomToken,
            callMode,
            screenShareEnabled: record.screenShareEnabled,
            iceServers: buildIceServersConfig(),
            joinedAs: organizerName
        }
    };
}

/**
 * 9. Join Any Live Conference Meeting or Authorized Direct Call Room (Real-Time Multi-Camera Presence)
 */
async function joinRoomSession(roomCodeOrId, payload = {}, actor) {
    const existing = await findCallOrMeetingOrThrow(roomCodeOrId);
    const meta = parseCallMeta(existing);
    const uid = String(actor.id);

    if (existing.status === "CANCELLED") {
        throw new AppError("This meeting or call has been cancelled.", 409, "MEETING_CANCELLED");
    }
    if (isDirectCallRecord(existing)) {
        const isAllowed = meta?.caller?.userId === uid || meta?.callee?.userId === uid || existing.organizerId === uid;
        if (!isAllowed) {
            throw new AppError("Only the participants of this private call can join this room.", 403, "FORBIDDEN");
        }
    }

    const actorUser = await prisma.user.findUnique({
        where: { id: actor.id },
        select: { id: true, firstName: true, lastName: true, email: true, role: { select: { name: true } } }
    });
    const actorRoleName = actorUser?.role?.name || actor.role || "STAFF";
    const participantName = formatUserDisplayName(actorUser || actor);
    const callMode = payload.callMode
        ? (String(payload.callMode).toUpperCase() === "VOICE" ? "VOICE" : "VIDEO")
        : (meta?.callMode || (existing.meetingType === "DIRECT_VOICE_CALL" ? "VOICE" : "VIDEO"));

    const dbParticipants = Array.isArray(existing.participants) ? [...existing.participants] : [];
    if (!dbParticipants.some((p) => p && String(p.userId) === uid)) {
        dbParticipants.push({
            userId: uid,
            name: participantName,
            role: actorRoleName,
            joinedAt: new Date().toISOString()
        });
    }

    const updated = await prisma.hospitalMeeting.update({
        where: { id: existing.id },
        data: {
            status: existing.status === "COMPLETED" ? "COMPLETED" : "LIVE",
            startedAt: existing.startedAt || new Date(),
            participants: dbParticipants
        }
    });

    const activeParticipants = webrtcHub.joinRoom(updated.meetingCode, {
        userId: uid,
        name: participantName,
        role: actorRoleName,
        email: actorUser?.email || actor.email,
        callMode,
        audioEnabled: payload.audioEnabled !== false,
        videoEnabled: payload.videoEnabled !== undefined ? Boolean(payload.videoEnabled) : callMode === "VIDEO"
    });

    // Notify all other active participants in the room so WebRTC peer connections initiate immediately
    const otherPeerIds = activeParticipants.map((p) => p.userId).filter((id) => id !== uid);
    if (otherPeerIds.length > 0) {
        rcce.events.emitUserEvent(otherPeerIds, "room_presence", {
            type: "PARTICIPANT_JOINED",
            roomCode: updated.meetingCode,
            participant: activeParticipants.find((p) => p.userId === uid),
            participants: activeParticipants
        });
    }

    return {
        room: serializeCallOrMeeting(updated, uid),
        webrtcSession: {
            roomCode: updated.meetingCode,
            roomToken: updated.roomToken,
            callMode,
            screenShareEnabled: Boolean(updated.screenShareEnabled),
            iceServers: buildIceServersConfig(),
            joinedAs: participantName,
            selfUserId: uid,
            activeParticipants
        }
    };
}

/**
 * 10. Leave a Live Camera/Voice Room Without Ending Conference for Others
 */
async function leaveRoomSession(roomCodeOrId, actor) {
    const existing = await findCallOrMeetingOrThrow(roomCodeOrId);
    const uid = String(actor.id);
    const remaining = webrtcHub.leaveRoom(existing.meetingCode, uid);

    if (remaining.length > 0) {
        rcce.events.emitUserEvent(
            remaining.map((p) => p.userId),
            "room_presence",
            {
                type: "PARTICIPANT_LEFT",
                roomCode: existing.meetingCode,
                userId: uid,
                participants: remaining
            }
        );
    }

    return {
        roomCode: existing.meetingCode,
        remainingParticipantCount: remaining.length,
        participants: remaining
    };
}

/**
 * 11. Relay WebRTC SDP Offer, SDP Answer, ICE Candidate, or Live Media State
 */
async function relayWebRtcSignal(roomCodeOrId, payload = {}, actor) {
    const existing = await findCallOrMeetingOrThrow(roomCodeOrId);
    const meta = parseCallMeta(existing);
    const uid = String(actor.id);

    if (isDirectCallRecord(existing)) {
        const isAllowed = meta?.caller?.userId === uid || meta?.callee?.userId === uid || existing.organizerId === uid;
        if (!isAllowed) {
            throw new AppError("You are not authorized to signal in this private call.", 403, "FORBIDDEN");
        }
    }

    const type = String(payload.type || "").trim().toUpperCase();
    if (!VALID_SIGNAL_TYPES.has(type)) {
        throw new AppError(
            `Invalid WebRTC signal type. Allowed types: ${Array.from(VALID_SIGNAL_TYPES).join(", ")}.`,
            400,
            "INVALID_SIGNAL_TYPE"
        );
    }

    const fromName = formatUserDisplayName(actor);
    const signal = webrtcHub.pushSignal(existing.meetingCode, {
        fromUserId: uid,
        fromName,
        fromRole: actor.role,
        toUserId: payload.toUserId || null,
        type,
        payload: payload.payload || {}
    });

    if (type === "MEDIA_STATE" && payload.payload) {
        webrtcHub.heartbeatRoom(existing.meetingCode, uid, payload.payload);
    }

    const snapshot = webrtcHub.getRoomSnapshot(existing.meetingCode);
    const recipients = signal.toUserId
        ? [signal.toUserId]
        : snapshot.participants.map((p) => p.userId).filter((id) => id !== uid);

    if (recipients.length > 0) {
        rcce.events.emitUserEvent(recipients, "webrtc_signal", {
            roomCode: existing.meetingCode,
            signal
        });
    }

    return {
        signal,
        deliveredToCount: recipients.length,
        activeParticipantCount: snapshot.participantCount
    };
}

/**
 * 12. Poll Signals & Heartbeat Presence for a Live Room (Resilient Fallback + Sync)
 */
async function pollWebRtcSignals(roomCodeOrId, query = {}, actor) {
    const existing = await findCallOrMeetingOrThrow(roomCodeOrId);
    const meta = parseCallMeta(existing);
    const uid = String(actor.id);

    if (isDirectCallRecord(existing)) {
        const isAllowed = meta?.caller?.userId === uid || meta?.callee?.userId === uid || existing.organizerId === uid;
        if (!isAllowed) {
            throw new AppError("You are not authorized to access this private call room.", 403, "FORBIDDEN");
        }
    }

    const mediaHeartbeat = {};
    if (query.audioEnabled !== undefined) mediaHeartbeat.audioEnabled = query.audioEnabled === "true" || query.audioEnabled === true;
    if (query.videoEnabled !== undefined) mediaHeartbeat.videoEnabled = query.videoEnabled === "true" || query.videoEnabled === true;
    if (query.screenSharing !== undefined) mediaHeartbeat.screenSharing = query.screenSharing === "true" || query.screenSharing === true;

    webrtcHub.heartbeatRoom(existing.meetingCode, uid, mediaHeartbeat);
    const pulled = webrtcHub.pullSignals(existing.meetingCode, uid, query.afterSeq || 0);

    return {
        ...pulled,
        roomStatus: existing.status,
        title: existing.title,
        callMode: meta?.callMode || (existing.meetingType === "DIRECT_VOICE_CALL" ? "VOICE" : "VIDEO")
    };
}

module.exports = {
    getContactDirectory,
    initiateDirectCall,
    getIncomingCalls,
    listUserCallsAndConferences,
    acceptDirectCall,
    declineDirectCall,
    endCallOrConference,
    createConferenceRoom,
    joinRoomSession,
    leaveRoomSession,
    relayWebRtcSignal,
    pollWebRtcSignals
};
