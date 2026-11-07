"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHARMACY ENTERPRISE IDENTIFIER GENERATOR
Sequential Codes for Medication Items, Batches & Dispenses
LOCATION: src/modules/pharmacy/helpers/pharmacy-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generate sequential medication item code: MED-YYYY-XXXXXX
 * Example: MED-2026-000001
 * 
 * @returns {Promise<string>}
 */
async function generateItemCode() {
    const year = new Date().getFullYear();
    const count = await prisma.pharmacyItem.count();
    const sequence = String(count + 1).padStart(6, "0");
    return `MED-${year}-${sequence}`;
}

/**
 * Generate sequential batch number: BAT-YYYY-XXXXXX
 * Example: BAT-2026-000001
 * 
 * @returns {Promise<string>}
 */
async function generateBatchNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.pharmacyBatch.count();
    const sequence = String(count + 1).padStart(6, "0");
    return `BAT-${year}-${sequence}`;
}

/**
 * Generate sequential prescription dispense number: DSP-YYYY-XXXXXX
 * Example: DSP-2026-000001
 * 
 * @returns {Promise<string>}
 */
async function generateDispenseNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.prescriptionDispense.count();
    const sequence = String(count + 1).padStart(6, "0");
    return `DSP-${year}-${sequence}`;
}

module.exports = {
    generateItemCode,
    generateBatchNumber,
    generateDispenseNumber
};
