"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PATIENT IDENTIFIER & PHYSICAL SHELF INDEX GENERATOR
Authoritative MRN & Physical Archive Location Algorithm
LOCATION: src/modules/patients/helpers/patient-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generate sequential Medical Record Number (MRN)
 * Format: MRN-YYYY-XXXXXX (e.g., MRN-2026-000001)
 */
async function generatePatientMRN() {
    const year = new Date().getFullYear();
    const count = await prisma.patient.count();
    const nextSeq = count + 1;
    const padded = String(nextSeq).padStart(6, "0");
    let mrn = `MRN-${year}-${padded}`;

    // Verify uniqueness
    let exists = await prisma.patient.findUnique({ where: { patientNumber: mrn } });
    let increment = 1;
    while (exists) {
        const altSeq = nextSeq + increment;
        mrn = `MRN-${year}-${String(altSeq).padStart(6, "0")}`;
        exists = await prisma.patient.findUnique({ where: { patientNumber: mrn } });
        increment++;
    }

    return mrn;
}

/**
 * Generate sequential Folder Code and Barcode
 * Format: FLD-YYYY-XXXXXX (e.g., FLD-2026-000001)
 * Barcode: BAR-YYYY-XXXXXX
 */
async function generateFolderIdentifiers() {
    const year = new Date().getFullYear();
    const count = await prisma.medicalFolder.count();
    const nextSeq = count + 1;
    const padded = String(nextSeq).padStart(6, "0");
    let folderNumber = `FLD-${year}-${padded}`;
    let barcode = `BAR-${year}-${padded}`;

    let exists = await prisma.medicalFolder.findUnique({ where: { folderNumber } });
    let increment = 1;
    while (exists) {
        const altSeq = nextSeq + increment;
        const altPadded = String(altSeq).padStart(6, "0");
        folderNumber = `FLD-${year}-${altPadded}`;
        barcode = `BAR-${year}-${altPadded}`;
        exists = await prisma.medicalFolder.findUnique({ where: { folderNumber } });
        increment++;
    }

    return { folderNumber, barcode };
}

/**
 * Physical Shelf Allocation Engine
 * Places physical folder by patient surname initial, year, and deterministic slot.
 * Format: SHELF-{INITIAL}{1-9}-BAY{01-20}-RACK{01-10}
 * Example: Surname "Mensah" -> SHELF-M1-BAY04-RACK02
 */
function calculatePhysicalShelfLocation(lastName, seqNumber = 1, archiveZone = "MAIN_ARCHIVE") {
    const initial = (lastName && lastName.trim().length > 0)
        ? lastName.trim().charAt(0).toUpperCase()
        : "A";

    const validChar = /[A-Z]/.test(initial) ? initial : "G";
    const bayNum = String(((seqNumber * 7) % 20) + 1).padStart(2, "0");
    const rackNum = String(((seqNumber * 3) % 10) + 1).padStart(2, "0");
    const aisleNum = ((seqNumber % 4) + 1);

    return `SHELF-${validChar}${aisleNum}-BAY${bayNum}-RACK${rackNum}`;
}

module.exports = {
    generatePatientMRN,
    generateFolderIdentifiers,
    calculatePhysicalShelfLocation
};
