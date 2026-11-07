"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
HUMAN RESOURCES & STAFF CREDENTIALING - ID GENERATOR
Phase 17 Production Hardened - CommonJS Only
LOCATION: src/modules/hr/helpers/hr-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generates sequential Credential Number: CRD-YYYY-XXXXXX
 * e.g. CRD-2026-000001
 */
async function generateCredentialNumber() {
    const year = new Date().getFullYear();
    const prefix = `CRD-${year}-`;

    const latest = await prisma.staffCredential.findFirst({
        where: { credentialNumber: { startsWith: prefix } },
        orderBy: { credentialNumber: "desc" },
        select: { credentialNumber: true }
    });

    let nextNumber = 1;
    if (latest && latest.credentialNumber) {
        const parts = latest.credentialNumber.split("-");
        if (parts.length === 3) {
            const parsed = parseInt(parts[2], 10);
            if (!isNaN(parsed)) {
                nextNumber = parsed + 1;
            }
        }
    }

    const paddedNumber = String(nextNumber).padStart(6, "0");
    return `${prefix}${paddedNumber}`;
}

/**
 * Generates sequential Roster Assignment Number: RST-YYYY-XXXXXX
 * e.g. RST-2026-000001
 */
async function generateRosterNumber() {
    const year = new Date().getFullYear();
    const prefix = `RST-${year}-`;

    const latest = await prisma.dutyShiftRoster.findFirst({
        where: { rosterNumber: { startsWith: prefix } },
        orderBy: { rosterNumber: "desc" },
        select: { rosterNumber: true }
    });

    let nextNumber = 1;
    if (latest && latest.rosterNumber) {
        const parts = latest.rosterNumber.split("-");
        if (parts.length === 3) {
            const parsed = parseInt(parts[2], 10);
            if (!isNaN(parsed)) {
                nextNumber = parsed + 1;
            }
        }
    }

    const paddedNumber = String(nextNumber).padStart(6, "0");
    return `${prefix}${paddedNumber}`;
}

/**
 * Generates sequential Shift Handover Number: HND-YYYY-XXXXXX
 * e.g. HND-2026-000001
 */
async function generateHandoverNumber() {
    const year = new Date().getFullYear();
    const prefix = `HND-${year}-`;

    const latest = await prisma.shiftHandover.findFirst({
        where: { handoverNumber: { startsWith: prefix } },
        orderBy: { handoverNumber: "desc" },
        select: { handoverNumber: true }
    });

    let nextNumber = 1;
    if (latest && latest.handoverNumber) {
        const parts = latest.handoverNumber.split("-");
        if (parts.length === 3) {
            const parsed = parseInt(parts[2], 10);
            if (!isNaN(parsed)) {
                nextNumber = parsed + 1;
            }
        }
    }

    const paddedNumber = String(nextNumber).padStart(6, "0");
    return `${prefix}${paddedNumber}`;
}

/**
 * Generates sequential Attendance Clock-in Number: ATT-YYYY-XXXXXX
 * e.g. ATT-2026-000001
 */
async function generateAttendanceNumber() {
    const year = new Date().getFullYear();
    const prefix = `ATT-${year}-`;

    const latest = await prisma.staffAttendance.findFirst({
        where: { attendanceNumber: { startsWith: prefix } },
        orderBy: { attendanceNumber: "desc" },
        select: { attendanceNumber: true }
    });

    let nextNumber = 1;
    if (latest && latest.attendanceNumber) {
        const parts = latest.attendanceNumber.split("-");
        if (parts.length === 3) {
            const parsed = parseInt(parts[2], 10);
            if (!isNaN(parsed)) {
                nextNumber = parsed + 1;
            }
        }
    }

    const paddedNumber = String(nextNumber).padStart(6, "0");
    return `${prefix}${paddedNumber}`;
}

/**
 * Generates sequential Leave Request Number: LEV-YYYY-XXXXXX
 * e.g. LEV-2026-000001
 */
async function generateLeaveNumber() {
    const year = new Date().getFullYear();
    const prefix = `LEV-${year}-`;

    const latest = await prisma.staffLeaveRequest.findFirst({
        where: { leaveNumber: { startsWith: prefix } },
        orderBy: { leaveNumber: "desc" },
        select: { leaveNumber: true }
    });

    let nextNumber = 1;
    if (latest && latest.leaveNumber) {
        const parts = latest.leaveNumber.split("-");
        if (parts.length === 3) {
            const parsed = parseInt(parts[2], 10);
            if (!isNaN(parsed)) {
                nextNumber = parsed + 1;
            }
        }
    }

    const paddedNumber = String(nextNumber).padStart(6, "0");
    return `${prefix}${paddedNumber}`;
}

module.exports = {
    generateCredentialNumber,
    generateRosterNumber,
    generateHandoverNumber,
    generateAttendanceNumber,
    generateLeaveNumber
};
