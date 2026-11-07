"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
WEBRTC VIDEO TELEMEDICINE SUBSYSTEM - SERVICE
Phase 21 Production Hardened - CommonJS Only
LOCATION: src/modules/telemedicine/services/telemedicine.service.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");
const AppError = require("../../../core/errors/app.error");
const logger = require("../../../core/utils/logger");
const { generateSessionCode, generateRoomToken } = require("../helpers/telemedicine-id.generator");

/**
 * 1. Schedule a Telemedicine Video Consultation
 */
async function scheduleConsultation({
    patientId,
    patientName,
    patientPhone,
    doctorId,
    doctorName,
    specialty = "GENERAL_MEDICINE",
    scheduledAt,
    clinicalReason,
    hospitalId
}) {
    if (!patientId || !patientName) {
        throw new AppError("Patient ID and Patient Name are required", 400, "MISSING_PATIENT_INFO");
    }
    if (!doctorId || !doctorName) {
        throw new AppError("Doctor ID and Doctor Name are required", 400, "MISSING_DOCTOR_INFO");
    }
    if (!scheduledAt) {
        throw new AppError("Scheduled date and time are required", 400, "MISSING_SCHEDULED_TIME");
    }

    const schedDate = new Date(scheduledAt);
    if (isNaN(schedDate.getTime())) {
        throw new AppError("Invalid date format for scheduledAt", 400, "INVALID_DATE");
    }

    const sessionCode = await generateSessionCode();
    const roomToken = generateRoomToken();
    const channelName = `call_${sessionCode.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

    const consultation = await prisma.telemedicineConsultation.create({
        data: {
            sessionCode,
            hospitalId: hospitalId || null,
            patientId,
            patientName: patientName.trim(),
            patientPhone: patientPhone || null,
            doctorId,
            doctorName: doctorName.trim(),
            specialty,
            scheduledAt: schedDate,
            clinicalReason: clinicalReason || null,
            roomToken,
            channelName,
            status: "SCHEDULED"
        }
    });

    logger.info(`Telemedicine session ${consultation.sessionCode} scheduled between Dr. ${doctorName} and ${patientName}.`);
    return consultation;
}

/**
 * 2. Get Consultations with Filters & Pagination
 */
async function getConsultations({ doctorId, patientId, status, date, page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (doctorId) where.doctorId = doctorId;
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    if (date) {
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
            const nextDay = new Date(d);
            nextDay.setDate(nextDay.getDate() + 1);
            where.scheduledAt = { gte: d, lt: nextDay };
        }
    }

    const [total, consultations] = await Promise.all([
        prisma.telemedicineConsultation.count({ where }),
        prisma.telemedicineConsultation.findMany({
            where,
            skip,
            take: limitNum,
            orderBy: { scheduledAt: "asc" }
        })
    ]);

    return {
        consultations,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
        }
    };
}

/**
 * 3. Get Consultation Details by ID or Session Code
 */
async function getConsultationById(idOrCode) {
    if (!idOrCode) throw new AppError("Session ID or Code is required", 400, "MISSING_IDENTIFIER");

    const consultation = await prisma.telemedicineConsultation.findFirst({
        where: {
            OR: [
                { id: idOrCode },
                { sessionCode: idOrCode }
            ]
        }
    });

    if (!consultation) {
        throw new AppError(`Telemedicine consultation '${idOrCode}' not found`, 404, "NOT_FOUND");
    }

    return {
        ...consultation,
        signalingState: consultation.signalingState ? JSON.parse(consultation.signalingState) : null
    };
}

/**
 * 4. Patient Checks Into Virtual Waiting Room
 */
async function joinWaitingRoom(sessionCode, { patientPhone } = {}) {
    if (!sessionCode) throw new AppError("Session code is required", 400, "MISSING_SESSION_CODE");

    const session = await prisma.telemedicineConsultation.findUnique({
        where: { sessionCode }
    });

    if (!session) throw new AppError(`Telemedicine session '${sessionCode}' not found`, 404, "NOT_FOUND");
    if (["COMPLETED", "CANCELLED"].includes(session.status)) {
        throw new AppError(`Session is already ${session.status}`, 400, "INVALID_SESSION_STATE");
    }

    const updated = await prisma.telemedicineConsultation.update({
        where: { sessionCode },
        data: {
            status: "WAITING_ROOM",
            ...(patientPhone ? { patientPhone } : {})
        }
    });

    logger.info(`Patient ${session.patientName} joined waiting room for session ${sessionCode}.`);
    return updated;
}

/**
 * 5. Doctor Starts the WebRTC Video Call
 */
async function startVideoCall(sessionCode, { doctorId } = {}) {
    if (!sessionCode) throw new AppError("Session code is required", 400, "MISSING_SESSION_CODE");

    const session = await prisma.telemedicineConsultation.findUnique({
        where: { sessionCode }
    });

    if (!session) throw new AppError(`Telemedicine session '${sessionCode}' not found`, 404, "NOT_FOUND");
    if (session.status === "COMPLETED") {
        throw new AppError("Cannot start an already completed consultation", 400, "ALREADY_COMPLETED");
    }

    const updated = await prisma.telemedicineConsultation.update({
        where: { sessionCode },
        data: {
            status: "IN_CALL",
            startedAt: session.startedAt || new Date()
        }
    });

    logger.info(`Dr. ${session.doctorName} initiated active video call for session ${sessionCode}.`);
    return updated;
}

/**
 * 6. WebRTC Signaling State Exchange (SDP Offer / Answer & ICE Candidates)
 */
async function updateSignalingState(sessionCode, { sdpOffer, sdpAnswer, iceCandidate, senderRole }) {
    if (!sessionCode) throw new AppError("Session code is required", 400, "MISSING_SESSION_CODE");

    const session = await prisma.telemedicineConsultation.findUnique({
        where: { sessionCode }
    });
    if (!session) throw new AppError(`Session ${sessionCode} not found`, 404, "NOT_FOUND");

    let currentState = {};
    try {
        currentState = session.signalingState ? JSON.parse(session.signalingState) : {};
    } catch (e) {
        currentState = {};
    }

    if (sdpOffer) {
        currentState.sdpOffer = sdpOffer;
        currentState.offerFrom = senderRole || "DOCTOR";
        currentState.offeredAt = new Date();
    }
    if (sdpAnswer) {
        currentState.sdpAnswer = sdpAnswer;
        currentState.answerFrom = senderRole || "PATIENT";
        currentState.answeredAt = new Date();
    }
    if (iceCandidate) {
        if (!Array.isArray(currentState.iceCandidates)) {
            currentState.iceCandidates = [];
        }
        currentState.iceCandidates.push({
            candidate: iceCandidate,
            from: senderRole || "PEER",
            receivedAt: new Date()
        });
        if (currentState.iceCandidates.length > 50) {
            currentState.iceCandidates = currentState.iceCandidates.slice(-50);
        }
    }

    const updated = await prisma.telemedicineConsultation.update({
        where: { sessionCode },
        data: {
            signalingState: JSON.stringify(currentState)
        }
    });

    return {
        sessionCode,
        status: updated.status,
        signalingState: currentState
    };
}

/**
 * 7. End Video Call and Record Clinical Outcome
 */
async function endConsultation(sessionCode, {
    clinicalNotes,
    diagnosisCode,
    prescriptionSummary,
    followUpDate,
    callQualityRating = 5
}) {
    if (!sessionCode) throw new AppError("Session code is required", 400, "MISSING_SESSION_CODE");

    const session = await prisma.telemedicineConsultation.findUnique({
        where: { sessionCode }
    });
    if (!session) throw new AppError(`Session ${sessionCode} not found`, 404, "NOT_FOUND");

    const endTime = new Date();
    const startTime = session.startedAt || endTime;
    const durationSeconds = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 1000));

    const updated = await prisma.telemedicineConsultation.update({
        where: { sessionCode },
        data: {
            status: "COMPLETED",
            endedAt: endTime,
            durationSeconds,
            clinicalNotes: clinicalNotes || session.clinicalNotes,
            diagnosisCode: diagnosisCode || session.diagnosisCode,
            prescriptionSummary: prescriptionSummary || session.prescriptionSummary,
            followUpDate: followUpDate ? new Date(followUpDate) : null,
            callQualityRating: callQualityRating ? parseInt(callQualityRating, 10) : 5
        }
    });

    // Record Audit Log
    try {
        await prisma.auditLog.create({
            data: {
                module: "TELEMEDICINE",
                action: "VIDEO_CONSULTATION_COMPLETED",
                description: `Telemedicine session ${sessionCode} completed. Duration: ${Math.round(durationSeconds / 60)} min. Attending: Dr. ${session.doctorName}.`
            }
        });
    } catch (e) {
        logger.warn(`Failed to write telemedicine audit log: ${e.message}`);
    }

    logger.info(`Telemedicine session ${sessionCode} concluded successfully (${durationSeconds}s).`);
    return updated;
}

/**
 * 8. Cancel Consultation
 */
async function cancelConsultation(sessionCode, { reason } = {}) {
    if (!sessionCode) throw new AppError("Session code is required", 400, "MISSING_SESSION_CODE");

    const updated = await prisma.telemedicineConsultation.update({
        where: { sessionCode },
        data: {
            status: "CANCELLED",
            clinicalNotes: reason ? `Cancelled: ${reason}` : "Cancelled by user."
        }
    });

    return updated;
}

/**
 * 9. Telemedicine Telemetry & Virtual Clinic Command Center
 */
async function getTelemedicineTelemetry() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
        totalConsultations,
        activeInCall,
        waitingRoom,
        scheduledToday,
        completedToday,
        avgDurationAgg,
        avgQualityAgg,
        upcomingSessions
    ] = await Promise.all([
        prisma.telemedicineConsultation.count(),
        prisma.telemedicineConsultation.count({ where: { status: "IN_CALL" } }),
        prisma.telemedicineConsultation.count({ where: { status: "WAITING_ROOM" } }),
        prisma.telemedicineConsultation.count({
            where: {
                scheduledAt: { gte: todayStart },
                status: "SCHEDULED"
            }
        }),
        prisma.telemedicineConsultation.count({
            where: {
                endedAt: { gte: todayStart },
                status: "COMPLETED"
            }
        }),
        prisma.telemedicineConsultation.aggregate({
            _avg: { durationSeconds: true },
            where: { status: "COMPLETED" }
        }),
        prisma.telemedicineConsultation.aggregate({
            _avg: { callQualityRating: true },
            where: { status: "COMPLETED" }
        }),
        prisma.telemedicineConsultation.findMany({
            where: { status: { in: ["SCHEDULED", "WAITING_ROOM", "IN_CALL"] } },
            take: 5,
            orderBy: { scheduledAt: "asc" }
        })
    ]);

    const avgSeconds = avgDurationAgg._avg.durationSeconds || 0;
    const avgDurationMinutes = Math.round((avgSeconds / 60) * 10) / 10;
    const avgRating = avgQualityAgg._avg.callQualityRating ? Math.round(avgQualityAgg._avg.callQualityRating * 10) / 10 : 5.0;

    return {
        totalConsultations,
        activeInCall,
        waitingRoom,
        scheduledToday,
        completedToday,
        avgDurationMinutes,
        avgQualityRating: avgRating,
        upcomingSessions
    };
}

module.exports = {
    scheduleConsultation,
    getConsultations,
    getConsultationById,
    joinWaitingRoom,
    startVideoCall,
    updateSignalingState,
    endConsultation,
    cancelConsultation,
    getTelemedicineTelemetry
};
