"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
NHIA / NHIS SEQUENTIAL IDENTIFIER GENERATOR
Phase 19 Production Hardened - CommonJS Only
LOCATION: src/modules/insurance-claims/helpers/nhia-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generates sequential Batch Number: NHIA-YYYYMM-XXXXXX
 */
async function generateBatchNumber(year, month) {
    const yr = year || new Date().getFullYear();
    const mo = String(month || (new Date().getMonth() + 1)).padStart(2, "0");
    const prefix = `NHIA-${yr}${mo}-`;

    const count = await prisma.nhiaClaimBatch.count({
        where: {
            batchNumber: {
                startsWith: prefix
            }
        }
    });

    const nextSeq = String(count + 1).padStart(6, "0");
    return `${prefix}${nextSeq}`;
}

/**
 * Generates sequential Claim Number: CLM-YYYY-XXXXXX
 */
async function generateClaimNumber() {
    const year = new Date().getFullYear();
    const prefix = `CLM-${year}-`;

    const count = await prisma.nhiaClaimItem.count({
        where: {
            claimNumber: {
                startsWith: prefix
            }
        }
    });

    const nextSeq = String(count + 1).padStart(6, "0");
    return `${prefix}${nextSeq}`;
}

/**
 * Generates sequential Reconciliation Voucher Number: VOUCH-YYYY-XXXXXX
 */
async function generateVoucherNumber() {
    const year = new Date().getFullYear();
    const prefix = `VOUCH-${year}-`;

    const count = await prisma.nhiaReconciliationVoucher.count({
        where: {
            voucherNumber: {
                startsWith: prefix
            }
        }
    });

    const nextSeq = String(count + 1).padStart(6, "0");
    return `${prefix}${nextSeq}`;
}

/**
 * Generates sequential NHIA Electronic Submission Receipt: RCPT-NHIA-XXXXXX
 */
async function generateReceiptNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `RCPT-NHIA-${timestamp}${random}`;
}

module.exports = {
    generateBatchNumber,
    generateClaimNumber,
    generateVoucherNumber,
    generateReceiptNumber
};
