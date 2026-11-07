"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MIGRATION SERVICE MODULE - SEQUENTIAL ID GENERATOR
Phase 20 Production Hardened - CommonJS Only
LOCATION: src/modules/migration/helpers/migration-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generates sequential Migration Job Code: MIG-YYYY-XXXXXX
 */
async function generateJobCode() {
    const year = new Date().getFullYear();
    const prefix = `MIG-${year}-`;

    const count = await prisma.migrationJob.count({
        where: {
            jobCode: {
                startsWith: prefix
            }
        }
    });

    const nextSeq = String(count + 1).padStart(6, "0");
    return `${prefix}${nextSeq}`;
}

/**
 * Generates sequential Template Code: TMPL-YYYY-XXXXXX
 */
async function generateTemplateCode() {
    const year = new Date().getFullYear();
    const prefix = `TMPL-${year}-`;

    const count = await prisma.migrationTemplate.count({
        where: {
            name: {
                startsWith: prefix
            }
        }
    });

    const nextSeq = String(count + 1).padStart(6, "0");
    return `${prefix}${nextSeq}`;
}

module.exports = {
    generateJobCode,
    generateTemplateCode
};
