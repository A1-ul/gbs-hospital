"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
HUMAN RESOURCES & STAFF CREDENTIALING CORE SERVICE
Phase 17 Production Hardened - CommonJS Only
LOCATION: src/modules/hr/hr.service.js
====================================================
*/

const prisma = require("../../core/database/prisma.client");
const AppError = require("../../core/errors/app.error");
const logger = require("../../core/utils/logger");
const {
    generateCredentialNumber,
    generateRosterNumber,
    generateHandoverNumber,
    generateAttendanceNumber,
    generateLeaveNumber
} = require("./helpers/hr-id.generator");
const {
    REGULATORY_BODIES,
    PROFESSIONAL_CADRES,
    SHIFT_TYPES,
    LEAVE_TYPES,
    CREDENTIAL_STATUSES,
    evaluateCredentialStatus
} = require("./helpers/hr-catalogs");

/**
 * Returns standard HR reference catalogs and cadres
 */
async function getHrCatalogs() {
    return {
        regulatoryBodies: Object.values(REGULATORY_BODIES),
        professionalCadres: PROFESSIONAL_CADRES,
        shiftTypes: Object.values(SHIFT_TYPES),
        leaveTypes: LEAVE_TYPES,
        credentialStatuses: CREDENTIAL_STATUSES
    };
}

/**
 * Aggregates live PostgreSQL Command Center telemetry for HR, Rostering & Credentialing
 */
async function getHrStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
        totalStaff,
        activeCredentials,
        expiringSoonCount,
        expiredCount,
        shiftsScheduledToday,
        pendingHandovers,
        activeClockedInToday,
        pendingLeaves
    ] = await Promise.all([
        prisma.hospitalStaff.count(),
        prisma.staffCredential.count({ where: { credentialStatus: "ACTIVE_VERIFIED" } }),
        prisma.staffCredential.count({
            where: {
                expiryDate: {
                    gte: today,
                    lte: thirtyDaysFromNow
                }
            }
        }),
        prisma.staffCredential.count({
            where: {
                expiryDate: { lt: today }
            }
        }),
        prisma.dutyShiftRoster.count({
            where: {
                shiftDate: {
                    gte: today,
                    lt: tomorrow
                }
            }
        }),
        prisma.shiftHandover.count({ where: { status: "PENDING_COSIGNATURE" } }),
        prisma.staffAttendance.count({
            where: {
                clockInDate: { gte: today, lt: tomorrow },
                clockOutTime: null
            }
        }),
        prisma.staffLeaveRequest.count({ where: { status: "PENDING_APPROVAL" } })
    ]);

    return {
        totalStaffCount: totalStaff,
        activeCredentialedStaff: activeCredentials,
        expiringCredentials30Days: expiringSoonCount,
        expiredCredentials: expiredCount,
        shiftsScheduledToday,
        pendingShiftHandovers: pendingHandovers,
        activeOnDutyStaffToday: activeClockedInToday,
        pendingLeaveRequests: pendingLeaves,
        credentialComplianceRate: (activeCredentials + expiredCount) > 0
            ? Math.round((activeCredentials / (activeCredentials + expiredCount)) * 100)
            : 100
    };
}

/**
 * Registers professional license and council credentials with CRD-YYYY-XXXXXX
 */
async function registerStaffCredential(data) {
    if (!data.staffId || !data.staffName || !data.regulatoryBody || !data.licenseNumber || !data.cadre || !data.issuedDate || !data.expiryDate) {
        throw new AppError("staffId, staffName, regulatoryBody, licenseNumber, cadre, issuedDate, and expiryDate are required.", 400);
    }

    const existingLicense = await prisma.staffCredential.findUnique({
        where: { licenseNumber: data.licenseNumber.trim() }
    });

    if (existingLicense) {
        throw new AppError(`License number ${data.licenseNumber} is already registered in the system.`, 409);
    }

    const evaluation = evaluateCredentialStatus(data.expiryDate);
    const credentialNumber = await generateCredentialNumber();

    const credential = await prisma.staffCredential.create({
        data: {
            credentialNumber,
            staffId: data.staffId.trim(),
            staffName: data.staffName.trim(),
            regulatoryBody: data.regulatoryBody,
            licenseNumber: data.licenseNumber.trim(),
            cadre: data.cadre,
            specialty: data.specialty ? data.specialty.trim() : null,
            issuedDate: new Date(data.issuedDate),
            expiryDate: new Date(data.expiryDate),
            credentialStatus: evaluation.status,
            verifiedBy: data.verifiedBy ? data.verifiedBy.trim() : null,
            verifiedAt: data.verifiedBy ? new Date() : null,
            verificationNotes: data.verificationNotes || evaluation.alertNotice,
            emergencyPracticePermitted: true // Clinical safety guardrail: patient care never blocked
        }
    });

    logger.info(`Registered staff credential ${credential.credentialNumber} for ${credential.staffName} (${credential.licenseNumber}) - Status: ${credential.credentialStatus}`);
    return credential;
}

/**
 * Retrieves staff credentials with filtering and dynamic expiration re-evaluation
 */
async function getStaffCredentials(filters = {}) {
    const where = {};
    if (filters.staffId) where.staffId = filters.staffId;
    if (filters.regulatoryBody) where.regulatoryBody = filters.regulatoryBody;
    if (filters.cadre) where.cadre = filters.cadre;
    if (filters.credentialStatus) where.credentialStatus = filters.credentialStatus;
    if (filters.search) {
        const s = filters.search.trim();
        where.OR = [
            { staffName: { contains: s, mode: "insensitive" } },
            { licenseNumber: { contains: s, mode: "insensitive" } },
            { credentialNumber: { contains: s, mode: "insensitive" } }
        ];
    }

    const list = await prisma.staffCredential.findMany({
        where,
        orderBy: { expiryDate: "asc" }
    });

    return list.map(c => {
        const evalResult = evaluateCredentialStatus(c.expiryDate);
        return {
            ...c,
            dynamicStatus: evalResult.status,
            daysRemaining: evalResult.daysRemaining,
            alertNotice: evalResult.alertNotice
        };
    });
}

/**
 * Formally verifies a staff credential (e.g. Medical Director / HR Officer verification)
 */
async function verifyCredential(id, { verifiedBy, verificationNotes }) {
    const existing = await prisma.staffCredential.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Staff credential record not found.", 404);
    }

    if (!verifiedBy) {
        throw new AppError("Name of verifying official (verifiedBy) is required.", 400);
    }

    const updated = await prisma.staffCredential.update({
        where: { id },
        data: {
            verifiedBy: verifiedBy.trim(),
            verifiedAt: new Date(),
            verificationNotes: verificationNotes || "Verified with official professional council registry.",
            credentialStatus: "ACTIVE_VERIFIED"
        }
    });

    logger.info(`Staff credential ${updated.credentialNumber} verified by ${verifiedBy}`);
    return updated;
}

/**
 * Schedules a staff duty shift roster with conflict detection and RST-YYYY-XXXXXX
 */
async function scheduleShift(data) {
    if (!data.staffId || !data.staffName || !data.department || !data.shiftType || !data.shiftDate) {
        throw new AppError("staffId, staffName, department, shiftType, and shiftDate are required.", 400);
    }

    const shiftDate = new Date(data.shiftDate);
    shiftDate.setHours(0, 0, 0, 0);

    const shiftConfig = SHIFT_TYPES[data.shiftType];
    const startTime = data.startTime || (shiftConfig ? shiftConfig.startTime : "07:00");
    const endTime = data.endTime || (shiftConfig ? shiftConfig.endTime : "15:00");

    // Conflict Check: Prevent same staff scheduled for overlapping shift on the same date
    const existingShift = await prisma.dutyShiftRoster.findFirst({
        where: {
            staffId: data.staffId,
            shiftDate,
            shiftType: data.shiftType,
            status: { notIn: ["SWAPPED", "ABSENT"] }
        }
    });

    if (existingShift) {
        throw new AppError(`Shift conflict detected: ${data.staffName} is already scheduled for ${data.shiftType} on this date.`, 409);
    }

    const rosterNumber = await generateRosterNumber();

    const roster = await prisma.dutyShiftRoster.create({
        data: {
            rosterNumber,
            staffId: data.staffId.trim(),
            staffName: data.staffName.trim(),
            department: data.department.trim(),
            wardOrUnit: data.wardOrUnit ? data.wardOrUnit.trim() : null,
            shiftType: data.shiftType,
            shiftDate,
            startTime,
            endTime,
            status: data.status || "SCHEDULED",
            notes: data.notes || null
        }
    });

    logger.info(`Scheduled shift ${roster.rosterNumber} for ${roster.staffName} (${roster.department} - ${roster.shiftType})`);
    return roster;
}

/**
 * Retrieves duty rosters with optional filters
 */
async function getDutyRosters(filters = {}) {
    const where = {};
    if (filters.staffId) where.staffId = filters.staffId;
    if (filters.department) where.department = filters.department;
    if (filters.shiftType) where.shiftType = filters.shiftType;
    if (filters.status) where.status = filters.status;
    if (filters.shiftDate) {
        const d = new Date(filters.shiftDate);
        d.setHours(0, 0, 0, 0);
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        where.shiftDate = { gte: d, lt: nextDay };
    }

    return prisma.dutyShiftRoster.findMany({
        where,
        include: { handovers: true },
        orderBy: [{ shiftDate: "desc" }, { startTime: "asc" }]
    });
}

/**
 * Updates status of a scheduled duty shift
 */
async function updateRosterStatus(id, { status, notes }) {
    const existing = await prisma.dutyShiftRoster.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Duty roster entry not found.", 404);
    }

    return prisma.dutyShiftRoster.update({
        where: { id },
        data: {
            status,
            notes: notes !== undefined ? notes : existing.notes
        }
    });
}

/**
 * Records a clinical Shift Handover (SBAR: Situation, Background, Assessment, Recommendation)
 */
async function recordShiftHandover(data) {
    if (!data.department || !data.outgoingStaffName || !data.incomingStaffName || !data.situation || !data.background || !data.assessment || !data.recommendation) {
        throw new AppError("department, outgoingStaffName, incomingStaffName, and complete SBAR sections (situation, background, assessment, recommendation) are required.", 400);
    }

    const handoverNumber = await generateHandoverNumber();

    const handover = await prisma.shiftHandover.create({
        data: {
            handoverNumber,
            rosterId: data.rosterId || null,
            department: data.department.trim(),
            wardOrUnit: data.wardOrUnit ? data.wardOrUnit.trim() : null,
            outgoingStaffName: data.outgoingStaffName.trim(),
            incomingStaffName: data.incomingStaffName.trim(),
            handoverDate: data.handoverDate ? new Date(data.handoverDate) : new Date(),
            shiftFrom: data.shiftFrom || "MORNING_SHIFT",
            shiftTo: data.shiftTo || "AFTERNOON_SHIFT",
            censusTotalPatients: typeof data.censusTotalPatients === "number" ? data.censusTotalPatients : 0,
            criticalPatientCount: typeof data.criticalPatientCount === "number" ? data.criticalPatientCount : 0,
            situation: data.situation.trim(),
            background: data.background.trim(),
            assessment: data.assessment.trim(),
            recommendation: data.recommendation.trim(),
            controlledDrugsCountOk: typeof data.controlledDrugsCountOk === "boolean" ? data.controlledDrugsCountOk : true,
            outgoingSignedAt: new Date(),
            status: "PENDING_COSIGNATURE"
        }
    });

    logger.info(`Recorded shift handover ${handover.handoverNumber} in ${handover.department} from ${handover.outgoingStaffName} to ${handover.incomingStaffName}`);
    return handover;
}

/**
 * Co-signs and completes clinical shift handover by incoming clinical staff
 */
async function coSignShiftHandover(id, { incomingStaffName, notes }) {
    const existing = await prisma.shiftHandover.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Shift handover record not found.", 404);
    }

    const updated = await prisma.shiftHandover.update({
        where: { id },
        data: {
            incomingStaffName: incomingStaffName ? incomingStaffName.trim() : existing.incomingStaffName,
            incomingCoSignedAt: new Date(),
            status: "COMPLETED_VERIFIED",
            recommendation: notes ? `${existing.recommendation}\n[Co-Signature Note]: ${notes}` : existing.recommendation
        }
    });

    logger.info(`Shift handover ${updated.handoverNumber} co-signed and verified by ${updated.incomingStaffName}`);
    return updated;
}

/**
 * Retrieves shift handovers
 */
async function getShiftHandovers(filters = {}) {
    const where = {};
    if (filters.department) where.department = filters.department;
    if (filters.status) where.status = filters.status;
    if (filters.handoverDate) {
        const d = new Date(filters.handoverDate);
        d.setHours(0, 0, 0, 0);
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        where.handoverDate = { gte: d, lt: nextDay };
    }

    return prisma.shiftHandover.findMany({
        where,
        orderBy: { handoverDate: "desc" }
    });
}

/**
 * Biometric / Electronic Clock-in for Staff Attendance
 */
async function clockInStaff(data) {
    if (!data.staffId || !data.staffName || !data.department) {
        throw new AppError("staffId, staffName, and department are required for attendance clock-in.", 400);
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if already clocked in today without clocking out
    const activeAttendance = await prisma.staffAttendance.findFirst({
        where: {
            staffId: data.staffId,
            clockInDate: { gte: today, lt: tomorrow },
            clockOutTime: null
        }
    });

    if (activeAttendance) {
        return activeAttendance;
    }

    const clockInTime = data.clockInTime || `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const attendanceNumber = await generateAttendanceNumber();

    const record = await prisma.staffAttendance.create({
        data: {
            attendanceNumber,
            staffId: data.staffId.trim(),
            staffName: data.staffName.trim(),
            department: data.department.trim(),
            clockInDate: now,
            clockInTime,
            workstationOrTerminal: data.workstationOrTerminal || "BIOMETRIC_TERMINAL_MAIN",
            status: data.status || "PRESENT_ON_TIME",
            verifiedBy: data.verifiedBy || "AUTO_BIOMETRIC_READER"
        }
    });

    logger.info(`Staff ${record.staffName} clocked in at ${record.clockInTime} (Attendance: ${record.attendanceNumber})`);
    return record;
}

/**
 * Clock-out for Staff Attendance with calculation of hours worked
 */
async function clockOutStaff(id, { clockOutTime }) {
    const record = await prisma.staffAttendance.findUnique({ where: { id } });
    if (!record) {
        throw new AppError("Attendance record not found.", 404);
    }

    const now = new Date();
    const finalClockOut = clockOutTime || `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // Calculate hours worked
    let hours = 8.0; // Default floor
    if (record.clockInTime && finalClockOut) {
        const [inH, inM] = record.clockInTime.split(":").map(Number);
        const [outH, outM] = finalClockOut.split(":").map(Number);
        if (!isNaN(inH) && !isNaN(outH)) {
            let diffMins = (outH * 60 + outM) - (inH * 60 + inM);
            if (diffMins < 0) diffMins += 24 * 60; // Overnight shift
            hours = Math.round((diffMins / 60) * 10) / 10;
        }
    }

    const updated = await prisma.staffAttendance.update({
        where: { id },
        data: {
            clockOutTime: finalClockOut,
            hoursWorked: hours
        }
    });

    logger.info(`Staff ${updated.staffName} clocked out at ${updated.clockOutTime} (Hours worked: ${hours})`);
    return updated;
}

/**
 * Retrieves staff attendance records
 */
async function getStaffAttendance(filters = {}) {
    const where = {};
    if (filters.staffId) where.staffId = filters.staffId;
    if (filters.department) where.department = filters.department;
    if (filters.status) where.status = filters.status;

    return prisma.staffAttendance.findMany({
        where,
        orderBy: { clockInDate: "desc" }
    });
}

/**
 * Submits a Staff Leave Request with LEV-YYYY-XXXXXX
 */
async function requestStaffLeave(data) {
    if (!data.staffId || !data.staffName || !data.department || !data.leaveType || !data.startDate || !data.endDate || !data.relievingStaffName || !data.reason) {
        throw new AppError("staffId, staffName, department, leaveType, startDate, endDate, relievingStaffName, and reason are required.", 400);
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays <= 0) {
        throw new AppError("End date must be on or after start date.", 400);
    }

    const leaveNumber = await generateLeaveNumber();

    const leave = await prisma.staffLeaveRequest.create({
        data: {
            leaveNumber,
            staffId: data.staffId.trim(),
            staffName: data.staffName.trim(),
            department: data.department.trim(),
            leaveType: data.leaveType,
            startDate: start,
            endDate: end,
            daysRequested: data.daysRequested || diffDays,
            relievingStaffName: data.relievingStaffName.trim(),
            reason: data.reason.trim(),
            status: "PENDING_APPROVAL"
        }
    });

    logger.info(`Leave request ${leave.leaveNumber} submitted by ${leave.staffName} (${leave.daysRequested} days)`);
    return leave;
}

/**
 * Adjudicates (approves/rejects) a Staff Leave Request
 */
async function adjudicateLeaveRequest(id, { status, approvedBy, comments }) {
    const existing = await prisma.staffLeaveRequest.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Leave request not found.", 404);
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
        throw new AppError("Status must be either APPROVED or REJECTED.", 400);
    }

    if (!approvedBy) {
        throw new AppError("Approving official name (approvedBy) is required.", 400);
    }

    const updated = await prisma.staffLeaveRequest.update({
        where: { id },
        data: {
            status,
            approvedBy: approvedBy.trim(),
            approvedAt: new Date(),
            comments: comments || null
        }
    });

    logger.info(`Leave request ${updated.leaveNumber} for ${updated.staffName} ${status} by ${approvedBy}`);
    return updated;
}

/**
 * Retrieves leave requests
 */
async function getLeaveRequests(filters = {}) {
    const where = {};
    if (filters.staffId) where.staffId = filters.staffId;
    if (filters.department) where.department = filters.department;
    if (filters.status) where.status = filters.status;
    if (filters.leaveType) where.leaveType = filters.leaveType;

    return prisma.staffLeaveRequest.findMany({
        where,
        orderBy: { createdAt: "desc" }
    });
}

module.exports = {
    getHrCatalogs,
    getHrStats,
    registerStaffCredential,
    getStaffCredentials,
    verifyCredential,
    scheduleShift,
    getDutyRosters,
    updateRosterStatus,
    recordShiftHandover,
    coSignShiftHandover,
    getShiftHandovers,
    clockInStaff,
    clockOutStaff,
    getStaffAttendance,
    requestStaffLeave,
    adjudicateLeaveRequest,
    getLeaveRequests
};
