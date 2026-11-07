"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
GIS & FACILITY MAPS - SEQUENTIAL ID GENERATOR
Phase 21 Production Hardened - CommonJS Only
LOCATION: src/modules/facility-maps/helpers/facility-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generates sequential Geofence Code: GEO-YYYY-XXXXXX
 */
async function generateGeofenceCode() {
    const year = new Date().getFullYear();
    const prefix = `GEO-${year}-`;

    const count = await prisma.facilityGeofence.count({
        where: {
            code: {
                startsWith: prefix
            }
        }
    });

    const nextSeq = String(count + 1).padStart(6, "0");
    return `${prefix}${nextSeq}`;
}

/**
 * Generates sequential Floor Plan Code: FLR-YYYY-XXXXXX
 */
async function generateFloorPlanCode() {
    const year = new Date().getFullYear();
    const prefix = `FLR-${year}-`;

    const count = await prisma.facilityFloorPlan.count({
        where: {
            code: {
                startsWith: prefix
            }
        }
    });

    const nextSeq = String(count + 1).padStart(6, "0");
    return `${prefix}${nextSeq}`;
}

module.exports = {
    generateGeofenceCode,
    generateFloorPlanCode
};
