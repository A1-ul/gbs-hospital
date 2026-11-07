"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
OPERATING THEATRE & SURGERY IDENTIFIER GENERATOR
Sequential Case Numbers & Theatre Identifiers
LOCATION: src/modules/surgery/helpers/surgery-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generate sequential surgical case number: SURG-YYYY-XXXXXX
 * Example: SURG-2026-000001
 * 
 * @returns {Promise<string>}
 */
async function generateCaseNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.surgicalCase.count();
    const sequence = String(count + 1).padStart(6, "0");
    return `SURG-${year}-${sequence}`;
}

/**
 * Generate sequential theatre code: OT-XX
 * Example: OT-01
 * 
 * @returns {Promise<string>}
 */
async function generateTheatreCode() {
    const count = await prisma.operatingTheatre.count();
    const sequence = String(count + 1).padStart(2, "0");
    return `OT-${sequence}`;
}

module.exports = {
    generateCaseNumber,
    generateTheatreCode
};
