"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
QUALITY ASSURANCE & PATIENT SAFETY - ID GENERATOR
Phase 18 Production Hardened - CommonJS Only
LOCATION: src/modules/quality/helpers/quality-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generates sequential Incident Number: INC-YYYY-XXXXXX
 */
async function generateIncidentNumber() {
    const year = new Date().getFullYear();
    const prefix = `INC-${year}-`;

    const count = await prisma.clinicalIncident.count({
        where: {
            incidentNumber: {
                startsWith: prefix
            }
        }
    });

    const nextSeq = String(count + 1).padStart(6, "0");
    return `${prefix}${nextSeq}`;
}

/**
 * Generates sequential Infection Control Case Number: IPC-YYYY-XXXXXX
 */
async function generateIpcCaseNumber() {
    const year = new Date().getFullYear();
    const prefix = `IPC-${year}-`;

    const count = await prisma.infectionControlCase.count({
        where: {
            caseNumber: {
                startsWith: prefix
            }
        }
    });

    const nextSeq = String(count + 1).padStart(6, "0");
    return `${prefix}${nextSeq}`;
}

/**
 * Generates sequential Clinical Audit Number: AUD-YYYY-XXXXXX
 */
async function generateAuditNumber() {
    const year = new Date().getFullYear();
    const prefix = `AUD-${year}-`;

    const count = await prisma.clinicalAudit.count({
        where: {
            auditNumber: {
                startsWith: prefix
            }
        }
    });

    const nextSeq = String(count + 1).padStart(6, "0");
    return `${prefix}${nextSeq}`;
}

/**
 * Generates sequential Corrective Action Plan Number: CAPA-YYYY-XXXXXX
 */
async function generateCapaNumber() {
    const year = new Date().getFullYear();
    const prefix = `CAPA-${year}-`;

    const count = await prisma.correctiveActionPlan.count({
        where: {
            capaNumber: {
                startsWith: prefix
            }
        }
    });

    const nextSeq = String(count + 1).padStart(6, "0");
    return `${prefix}${nextSeq}`;
}

/**
 * Generates sequential Patient Safety Alert Code: PSA-YYYY-XXXXXX
 */
async function generateAlertCode() {
    const year = new Date().getFullYear();
    const prefix = `PSA-${year}-`;

    const count = await prisma.patientSafetyAlert.count({
        where: {
            alertCode: {
                startsWith: prefix
            }
        }
    });

    const nextSeq = String(count + 1).padStart(6, "0");
    return `${prefix}${nextSeq}`;
}

module.exports = {
    generateIncidentNumber,
    generateIpcCaseNumber,
    generateAuditNumber,
    generateCapaNumber,
    generateAlertCode
};
