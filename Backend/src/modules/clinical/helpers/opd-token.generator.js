"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
OPD QUEUE TOKEN & ENCOUNTER NUMBER GENERATOR
Authoritative Daily Sequential Queue Identifiers
LOCATION: src/modules/clinical/helpers/opd-token.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generate sequential daily OPD Queue Token
 * Formats:
 * - Routine: OPD-001, OPD-002
 * - Emergency: EMG-001, EMG-002
 * - Priority (Pediatric, Elderly, Antenatal): PRI-001
 */
async function generateOpdToken(hospitalId, department = "GENERAL_OPD", priority = "ROUTINE") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const prefixMap = {
        EMERGENCY: "EMG",
        PRIORITY: "PRI",
        ROUTINE: "OPD"
    };

    const prefix = prefixMap[priority.toUpperCase()] || "OPD";

    const count = await prisma.opdQueueTicket.count({
        where: {
            hospitalId,
            createdAt: { gte: today }
        }
    });

    const nextSeq = count + 1;
    const padded = String(nextSeq).padStart(3, "0");
    return `${prefix}-${padded}`;
}

/**
 * Generate sequential clinical encounter number
 * Format: ENC-YYYY-XXXXXX (e.g., ENC-2026-000001)
 */
async function generateEncounterNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.patientEncounter.count();
    const nextSeq = count + 1;
    let encNumber = `ENC-${year}-${String(nextSeq).padStart(6, "0")}`;

    let exists = await prisma.patientEncounter.findUnique({
        where: { encounterNumber: encNumber }
    });

    let increment = 1;
    while (exists) {
        const altSeq = nextSeq + increment;
        encNumber = `ENC-${year}-${String(altSeq).padStart(6, "0")}`;
        exists = await prisma.patientEncounter.findUnique({
            where: { encounterNumber: encNumber }
        });
        increment++;
    }

    return encNumber;
}

module.exports = {
    generateOpdToken,
    generateEncounterNumber
};
