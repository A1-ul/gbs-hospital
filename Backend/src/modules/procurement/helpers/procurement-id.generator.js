"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PROCUREMENT & SUPPLY CHAIN - SEQUENTIAL IDENTIFIER GENERATOR
Phase 16 Production Hardened - CommonJS Only
LOCATION: src/modules/procurement/helpers/procurement-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generates sequential Vendor Code: VND-YYYY-XXXXXX
 * e.g. VND-2026-000001
 */
async function generateVendorCode() {
    const year = new Date().getFullYear();
    const prefix = `VND-${year}-`;

    const latest = await prisma.procurementVendor.findFirst({
        where: { vendorCode: { startsWith: prefix } },
        orderBy: { vendorCode: "desc" },
        select: { vendorCode: true }
    });

    let nextNumber = 1;
    if (latest && latest.vendorCode) {
        const parts = latest.vendorCode.split("-");
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
 * Generates sequential Contract Number: CON-YYYY-XXXXXX
 * e.g. CON-2026-000001
 */
async function generateContractNumber() {
    const year = new Date().getFullYear();
    const prefix = `CON-${year}-`;

    const latest = await prisma.vendorContract.findFirst({
        where: { contractNumber: { startsWith: prefix } },
        orderBy: { contractNumber: "desc" },
        select: { contractNumber: true }
    });

    let nextNumber = 1;
    if (latest && latest.contractNumber) {
        const parts = latest.contractNumber.split("-");
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
 * Generates sequential Purchase Order Number: PO-YYYY-XXXXXX
 * e.g. PO-2026-000001
 */
async function generatePurchaseOrderNumber() {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;

    const latest = await prisma.purchaseOrder.findFirst({
        where: { poNumber: { startsWith: prefix } },
        orderBy: { poNumber: "desc" },
        select: { poNumber: true }
    });

    let nextNumber = 1;
    if (latest && latest.poNumber) {
        const parts = latest.poNumber.split("-");
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
 * Generates sequential Goods Receipt Note (GRN): GRN-YYYY-XXXXXX
 * e.g. GRN-2026-000001
 */
async function generateGrnNumber() {
    const year = new Date().getFullYear();
    const prefix = `GRN-${year}-`;

    const latest = await prisma.goodsReceiptNote.findFirst({
        where: { grnNumber: { startsWith: prefix } },
        orderBy: { grnNumber: "desc" },
        select: { grnNumber: true }
    });

    let nextNumber = 1;
    if (latest && latest.grnNumber) {
        const parts = latest.grnNumber.split("-");
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
    generateVendorCode,
    generateContractNumber,
    generatePurchaseOrderNumber,
    generateGrnNumber
};
