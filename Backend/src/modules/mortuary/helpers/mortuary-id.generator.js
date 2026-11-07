"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MORTUARY & DECEASED PATIENT SERVICES - IDENTIFIER GENERATOR
Phase 14 Production Hardened - CommonJS Only
LOCATION: src/modules/mortuary/helpers/mortuary-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generates sequential Corpse tracking tag number (e.g. CRP-2026-000001)
 */
async function generateCorpseNumber() {
    const year = new Date().getFullYear();
    const prefix = `CRP-${year}-`;

    const count = await prisma.corpseRecord.count({
        where: {
            corpseNumber: {
                startsWith: prefix
            }
        }
    });

    const sequence = String(count + 1).padStart(6, "0");
    return `${prefix}${sequence}`;
}

/**
 * Generates sequential Medical Death Certificate number (e.g. DC-2026-000001)
 */
async function generateDeathCertificateNumber() {
    const year = new Date().getFullYear();
    const prefix = `DC-${year}-`;

    const count = await prisma.corpseRecord.count({
        where: {
            deathCertificateNumber: {
                startsWith: prefix
            }
        }
    });

    const sequence = String(count + 1).padStart(6, "0");
    return `${prefix}${sequence}`;
}

/**
 * Generates sequential Autopsy / Post-Mortem case number (e.g. AUT-2026-000001)
 */
async function generateAutopsyNumber() {
    const year = new Date().getFullYear();
    const prefix = `AUT-${year}-`;

    const count = await prisma.autopsyCase.count({
        where: {
            autopsyNumber: {
                startsWith: prefix
            }
        }
    });

    const sequence = String(count + 1).padStart(6, "0");
    return `${prefix}${sequence}`;
}

/**
 * Generates sequential Deceased Family Release clearance number (e.g. REL-2026-000001)
 */
async function generateReleaseNumber() {
    const year = new Date().getFullYear();
    const prefix = `REL-${year}-`;

    const count = await prisma.corpseRelease.count({
        where: {
            releaseNumber: {
                startsWith: prefix
            }
        }
    });

    const sequence = String(count + 1).padStart(6, "0");
    return `${prefix}${sequence}`;
}

/**
 * Generates sequential Chamber / Vault Code (e.g. VLT-01)
 */
async function generateChamberCode() {
    const count = await prisma.mortuaryChamber.count();
    const sequence = String(count + 1).padStart(2, "0");
    return `VLT-${sequence}`;
}

module.exports = {
    generateCorpseNumber,
    generateDeathCertificateNumber,
    generateAutopsyNumber,
    generateReleaseNumber,
    generateChamberCode
};
