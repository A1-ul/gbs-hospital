"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BIOMEDICAL ENGINEERING - SEQUENTIAL IDENTIFIER GENERATOR
Phase 15 Production Hardened - CommonJS Only
LOCATION: src/modules/biomedical/helpers/biomedical-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generates sequential Asset Tag: EQP-YYYY-XXXXXX
 * e.g. EQP-2026-000001
 */
async function generateAssetTag() {
    const year = new Date().getFullYear();
    const prefix = `EQP-${year}-`;

    const latest = await prisma.medicalEquipment.findFirst({
        where: { assetTag: { startsWith: prefix } },
        orderBy: { assetTag: "desc" },
        select: { assetTag: true }
    });

    let nextNumber = 1;
    if (latest && latest.assetTag) {
        const parts = latest.assetTag.split("-");
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
 * Generates sequential Work Order Number: WO-YYYY-XXXXXX
 * e.g. WO-2026-000001
 */
async function generateWorkOrderNumber() {
    const year = new Date().getFullYear();
    const prefix = `WO-${year}-`;

    const latest = await prisma.medicalWorkOrder.findFirst({
        where: { workOrderNumber: { startsWith: prefix } },
        orderBy: { workOrderNumber: "desc" },
        select: { workOrderNumber: true }
    });

    let nextNumber = 1;
    if (latest && latest.workOrderNumber) {
        const parts = latest.workOrderNumber.split("-");
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
 * Generates sequential Calibration Certificate Number: CAL-YYYY-XXXXXX
 * e.g. CAL-2026-000001
 */
async function generateCertificateNumber() {
    const year = new Date().getFullYear();
    const prefix = `CAL-${year}-`;

    const latest = await prisma.equipmentCalibration.findFirst({
        where: { certificateNumber: { startsWith: prefix } },
        orderBy: { certificateNumber: "desc" },
        select: { certificateNumber: true }
    });

    let nextNumber = 1;
    if (latest && latest.certificateNumber) {
        const parts = latest.certificateNumber.split("-");
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
    generateAssetTag,
    generateWorkOrderNumber,
    generateCertificateNumber
};
