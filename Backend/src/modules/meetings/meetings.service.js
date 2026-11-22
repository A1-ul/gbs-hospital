"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ONLINE MEETINGS & CLINICAL BOARD COLLABORATION SERVICE
Schedule Meeting, Join Meeting, Meeting History, Share Screen
LOCATION: Backend/src/modules/meetings/meetings.service.js
====================================================
*/

const crypto = require("crypto");
const prisma = require("../../core/database/prisma.client");
const { ensureDefaultHospitalId } = require("../../core/database/hospital-resolver");
const AppError = require("../../core/errors/app.error");

async function generateMeetingCode() {
    const year = new Date().getFullYear();
    const count = await prisma.hospitalMeeting.count();
    return `MTG-${year}-${String(count + 1).padStart(6, "0")}`;
}

async function getMeetingTelemetry() {
    const [total, scheduled, live, completed] = await Promise.all([
        prisma.hospitalMeeting.count(),
        prisma.hospitalMeeting.count({ where: { status: "SCHEDULED" } }),
        prisma.hospitalMeeting.count({ where: { status: "LIVE" } }),
        prisma.hospitalMeeting.count({ where: { status: "COMPLETED" } })
    ]);
    return { total, scheduled, live, completed };
}

async function listMeetings({ status, department, limit = 50 } = {}) {
    const where = {};
    if (status) where.status = String(status).toUpperCase();
    if (department) where.department = { contains: String(department), mode: "insensitive" };

    const meetings = await prisma.hospitalMeeting.findMany({
        where,
        orderBy: { scheduledStart: "desc" },
        take: Math.min(Number(limit) || 50, 100)
    });
    return { total: meetings.length, meetings };
}

async function scheduleMeeting(payload = {}, actor) {
    const {
        title,
        meetingType = "CLINICAL_BOARD",
        department = "Medical Administration",
        scheduledStart,
        scheduledEnd,
        participants = [],
        screenShareEnabled = true,
        agenda
    } = payload;

    if (!title || !String(title).trim()) {
        throw new AppError("Meeting title is required", 400, "MISSING_MEETING_TITLE");
    }

    const startDt = scheduledStart ? new Date(scheduledStart) : new Date();
    const endDt = scheduledEnd ? new Date(scheduledEnd) : new Date(startDt.getTime() + 60 * 60 * 1000);
    const hospitalId = await ensureDefaultHospitalId();
    const meetingCode = await generateMeetingCode();
    const roomToken = `GBS-MEET-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const organizerName = actor ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() || actor.email : "Hospital Staff";

    const meeting = await prisma.$transaction(async (tx) => {
        const created = await tx.hospitalMeeting.create({
            data: {
                meetingCode,
                hospitalId,
                title: String(title).trim(),
                meetingType: String(meetingType).toUpperCase(),
                department: String(department).trim(),
                organizerId: actor?.id || null,
                organizerName,
                roomToken,
                scheduledStart: startDt,
                scheduledEnd: endDt,
                status: "SCHEDULED",
                participants: Array.isArray(participants)
                    ? participants
                    : [{ name: organizerName, role: actor?.role || "STAFF", joinedAt: null }],
                screenShareEnabled: Boolean(screenShareEnabled),
                agenda: agenda ? String(agenda).trim() : null
            }
        });

        await tx.auditLog.create({
            data: {
                userId: actor?.id || null,
                role: actor?.role || null,
                hospitalId,
                action: "ONLINE_MEETING_SCHEDULED",
                module: "ONLINE_MEETINGS",
                outcome: "SUCCESS",
                affectedRecord: created.id,
                description: `[${meetingCode}] Scheduled online meeting "${created.title}" (${created.department})`
            }
        });

        return created;
    });

    return meeting;
}

async function joinMeeting(id, actor) {
    const existing = await prisma.hospitalMeeting.findFirst({
        where: { OR: [{ id }, { meetingCode: id }] }
    });
    if (!existing) {
        throw new AppError("Meeting not found", 404, "MEETING_NOT_FOUND");
    }
    if (existing.status === "CANCELLED") {
        throw new AppError("This meeting has been cancelled", 409, "MEETING_CANCELLED");
    }

    const participantName = actor ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() || actor.email : "Participant";
    const currentParticipants = Array.isArray(existing.participants) ? [...existing.participants] : [];
    if (!currentParticipants.some((p) => p && p.userId === actor?.id && actor?.id)) {
        currentParticipants.push({
            userId: actor?.id || null,
            name: participantName,
            role: actor?.role || "STAFF",
            joinedAt: new Date().toISOString()
        });
    }

    const updated = await prisma.hospitalMeeting.update({
        where: { id: existing.id },
        data: {
            status: existing.status === "COMPLETED" ? "COMPLETED" : "LIVE",
            startedAt: existing.startedAt || new Date(),
            participants: currentParticipants
        }
    });

    return {
        meeting: updated,
        webrtcSession: {
            roomCode: updated.meetingCode,
            roomToken: updated.roomToken,
            screenShareEnabled: updated.screenShareEnabled,
            joinedAs: participantName
        }
    };
}

async function endMeeting(id, payload = {}, actor) {
    const existing = await prisma.hospitalMeeting.findFirst({
        where: { OR: [{ id }, { meetingCode: id }] }
    });
    if (!existing) {
        throw new AppError("Meeting not found", 404, "MEETING_NOT_FOUND");
    }

    const updated = await prisma.hospitalMeeting.update({
        where: { id: existing.id },
        data: {
            status: "COMPLETED",
            endedAt: new Date(),
            minutesSummary: payload.minutesSummary ? String(payload.minutesSummary).trim() : existing.minutesSummary
        }
    });

    await prisma.auditLog.create({
        data: {
            userId: actor?.id || null,
            role: actor?.role || null,
            hospitalId: existing.hospitalId,
            action: "ONLINE_MEETING_COMPLETED",
            module: "ONLINE_MEETINGS",
            outcome: "SUCCESS",
            affectedRecord: updated.id,
            description: `[${existing.meetingCode}] Concluded online meeting "${existing.title}"`
        }
    });

    return updated;
}

async function cancelMeeting(id, actor) {
    const existing = await prisma.hospitalMeeting.findFirst({
        where: { OR: [{ id }, { meetingCode: id }] }
    });
    if (!existing) {
        throw new AppError("Meeting not found", 404, "MEETING_NOT_FOUND");
    }
    return await prisma.hospitalMeeting.update({
        where: { id: existing.id },
        data: { status: "CANCELLED" }
    });
}

module.exports = {
    getMeetingTelemetry,
    listMeetings,
    scheduleMeeting,
    joinMeeting,
    endMeeting,
    cancelMeeting
};
