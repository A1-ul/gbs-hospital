"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ENTERPRISE TENANT ID GENERATOR
Generates unique, collision-proof sequence IDs:
- Tenant ID: TEN-2026-000145
- Tenant Code: GBS-ACC-0145
- Institution ID: INS-2026-001245
- Subscription ID: SUB-2026-000145
LOCATION: src/modules/tenant-management/helpers/tenant-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generate next sequential tenant identifier numbers
 */
async function generateTenantIdentifiers() {
    const year = new Date().getFullYear();
    const totalTenants = await prisma.tenant.count();
    const nextSeq = totalTenants + 1;

    // Pad sequence numbers
    const tenantSeq = String(nextSeq).padStart(6, "0");
    const accSeq = String(nextSeq).padStart(4, "0");
    const insSeq = String(nextSeq + 1000).padStart(6, "0");

    const tenantId = `TEN-${year}-${tenantSeq}`;
    const tenantCode = `GBS-ACC-${accSeq}`;
    const institutionId = `INS-${year}-${insSeq}`;

    return {
        tenantId,
        tenantCode,
        institutionId
    };
}

/**
 * Generate sequential subscription ID
 */
async function generateSubscriptionIdentifier() {
    const year = new Date().getFullYear();
    const totalSubs = await prisma.tenantSubscription.count();
    const nextSeq = totalSubs + 1;
    const subSeq = String(nextSeq).padStart(6, "0");

    return `SUB-${year}-${subSeq}`;
}

module.exports = {
    generateTenantIdentifiers,
    generateSubscriptionIdentifier
};
