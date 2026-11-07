"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BILLING, INVOICE & RECEIPT IDENTIFIER GENERATOR
Sequential Numbers for Invoices, Receipts & Insurance Claims
LOCATION: src/modules/billing/helpers/billing-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generate sequential invoice / bill number: INV-YYYY-XXXXXX
 * Example: INV-2026-000001
 * 
 * @returns {Promise<string>}
 */
async function generateBillNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.patientBill.count();
    const sequence = String(count + 1).padStart(6, "0");
    return `INV-${year}-${sequence}`;
}

/**
 * Generate sequential payment receipt number: REC-YYYY-XXXXXX
 * Example: REC-2026-000001
 * 
 * @returns {Promise<string>}
 */
async function generateReceiptNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.patientPayment.count();
    const sequence = String(count + 1).padStart(6, "0");
    return `REC-${year}-${sequence}`;
}

/**
 * Generate sequential insurance / NHIS claim number: CLM-YYYY-XXXXXX
 * Example: CLM-2026-000001
 * 
 * @returns {Promise<string>}
 */
async function generateClaimNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.insuranceClaim.count();
    const sequence = String(count + 1).padStart(6, "0");
    return `CLM-${year}-${sequence}`;
}

module.exports = {
    generateBillNumber,
    generateReceiptNumber,
    generateClaimNumber
};
