"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
LABORATORY & PATHOLOGY IDENTIFIER GENERATOR
Sequential Codes for Lab Requests & Specimen Barcodes
LOCATION: src/modules/laboratory/helpers/lab-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generate sequential laboratory investigation request number: LAB-YYYY-XXXXXX
 * Example: LAB-2026-000001
 * 
 * @returns {Promise<string>}
 */
async function generateLabRequestNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.laboratoryRequest.count();
    const sequence = String(count + 1).padStart(6, "0");
    return `LAB-${year}-${sequence}`;
}

/**
 * Generate sequential specimen sample barcode: SMP-YYYY-XXXXXX
 * Example: SMP-2026-000001
 * 
 * @returns {Promise<string>}
 */
async function generateSampleBarcode() {
    const year = new Date().getFullYear();
    const count = await prisma.laboratorySample.count();
    const sequence = String(count + 1).padStart(6, "0");
    return `SMP-${year}-${sequence}`;
}

module.exports = {
    generateLabRequestNumber,
    generateSampleBarcode
};
