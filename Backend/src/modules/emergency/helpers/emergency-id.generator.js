"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
EMERGENCY & AMBULANCE IDENTIFIER GENERATOR
Phase 12 Production Hardened - CommonJS Only
LOCATION: src/modules/emergency/helpers/emergency-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generates sequential Ambulance Dispatch callout number (e.g. DISP-2026-000001)
 */
async function generateDispatchNumber() {
    const year = new Date().getFullYear();
    const prefix = `DISP-${year}-`;

    const count = await prisma.ambulanceDispatch.count({
        where: {
            dispatchNumber: {
                startsWith: prefix
            }
        }
    });

    const sequence = String(count + 1).padStart(6, "0");
    return `${prefix}${sequence}`;
}

/**
 * Generates sequential Emergency Room Case number (e.g. EMG-2026-000001)
 */
async function generateEmergencyCaseNumber() {
    const year = new Date().getFullYear();
    const prefix = `EMG-${year}-`;

    const count = await prisma.emergencyCase.count({
        where: {
            caseNumber: {
                startsWith: prefix
            }
        }
    });

    const sequence = String(count + 1).padStart(6, "0");
    return `${prefix}${sequence}`;
}

/**
 * Generates sequential Ambulance fleet vehicle number (e.g. AMB-01)
 */
async function generateVehicleNumber() {
    const count = await prisma.ambulance.count();
    const sequence = String(count + 1).padStart(2, "0");
    return `AMB-${sequence}`;
}

module.exports = {
    generateDispatchNumber,
    generateEmergencyCaseNumber,
    generateVehicleNumber
};
