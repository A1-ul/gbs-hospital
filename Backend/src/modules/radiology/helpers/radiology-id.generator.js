"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
RADIOLOGY & PACS IDENTIFIER GENERATOR
Sequential Accession Numbers, Report Numbers & DICOM UIDs
LOCATION: src/modules/radiology/helpers/radiology-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generate sequential radiology accession number: RAD-YYYY-XXXXXX
 * Example: RAD-2026-000001
 * 
 * @returns {Promise<string>}
 */
async function generateAccessionNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.radiologyOrder.count();
    const sequence = String(count + 1).padStart(6, "0");
    return `RAD-${year}-${sequence}`;
}

/**
 * Generate sequential diagnostic report number: REP-YYYY-XXXXXX
 * Example: REP-2026-000001
 * 
 * @returns {Promise<string>}
 */
async function generateReportNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.radiologyReport.count();
    const sequence = String(count + 1).padStart(6, "0");
    return `REP-${year}-${sequence}`;
}

/**
 * Generate standard compliant DICOM Study Instance UID
 * Root: 1.2.840.10008.5.1.4.1.1 (Standard Storage) + timestamp + random
 * 
 * @returns {string}
 */
function generateStudyInstanceUid() {
    const timestamp = Date.now();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `1.2.840.10008.5.1.4.1.1.${timestamp}.${random}`;
}

/**
 * Generate standard compliant DICOM Series Instance UID
 * 
 * @param {string} [studyUid] 
 * @param {number} [seriesIndex=1] 
 * @returns {string}
 */
function generateSeriesInstanceUid(studyUid, seriesIndex = 1) {
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `1.2.840.10008.5.1.4.1.2.${timestamp}.${seriesIndex}.${random}`;
}

module.exports = {
    generateAccessionNumber,
    generateReportNumber,
    generateStudyInstanceUid,
    generateSeriesInstanceUid
};
