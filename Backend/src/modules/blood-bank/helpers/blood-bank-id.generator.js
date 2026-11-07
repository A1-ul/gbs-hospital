"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BLOOD BANK & TRANSFUSION SERVICES IDENTIFIER GENERATOR
Phase 13 Production Hardened - CommonJS Only
LOCATION: src/modules/blood-bank/helpers/blood-bank-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generates sequential Donor registration number (e.g. DNR-2026-000001)
 */
async function generateDonorNumber() {
    const year = new Date().getFullYear();
    const prefix = `DNR-${year}-`;

    const count = await prisma.bloodDonor.count({
        where: {
            donorNumber: {
                startsWith: prefix
            }
        }
    });

    const sequence = String(count + 1).padStart(6, "0");
    return `${prefix}${sequence}`;
}

/**
 * Generates sequential Blood Bag barcode (e.g. BLD-2026-000001)
 */
async function generateUnitBarcode() {
    const year = new Date().getFullYear();
    const prefix = `BLD-${year}-`;

    const count = await prisma.bloodUnit.count({
        where: {
            unitBarcode: {
                startsWith: prefix
            }
        }
    });

    const sequence = String(count + 1).padStart(6, "0");
    return `${prefix}${sequence}`;
}

/**
 * Generates sequential Transfusion Request number (e.g. TRF-2026-000001)
 */
async function generateTransfusionRequestNumber() {
    const year = new Date().getFullYear();
    const prefix = `TRF-${year}-`;

    const count = await prisma.bloodTransfusionRequest.count({
        where: {
            requestNumber: {
                startsWith: prefix
            }
        }
    });

    const sequence = String(count + 1).padStart(6, "0");
    return `${prefix}${sequence}`;
}

/**
 * Generates sequential Cross-Match Test number (e.g. XM-2026-000001)
 */
async function generateCrossMatchNumber() {
    const year = new Date().getFullYear();
    const prefix = `XM-${year}-`;

    const count = await prisma.bloodCrossMatch.count({
        where: {
            crossMatchNumber: {
                startsWith: prefix
            }
        }
    });

    const sequence = String(count + 1).padStart(6, "0");
    return `${prefix}${sequence}`;
}

/**
 * Generates sequential Transfusion Administration record number (e.g. TXN-2026-000001)
 */
async function generateTransfusionNumber() {
    const year = new Date().getFullYear();
    const prefix = `TXN-${year}-`;

    const count = await prisma.bloodTransfusionRecord.count({
        where: {
            transfusionNumber: {
                startsWith: prefix
            }
        }
    });

    const sequence = String(count + 1).padStart(6, "0");
    return `${prefix}${sequence}`;
}

module.exports = {
    generateDonorNumber,
    generateUnitBarcode,
    generateTransfusionRequestNumber,
    generateCrossMatchNumber,
    generateTransfusionNumber
};
