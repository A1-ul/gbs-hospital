"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
INPATIENT ADMISSION & BED IDENTIFIER GENERATOR
LOCATION: src/modules/admissions/helpers/admission-id.generator.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");

/**
 * Generate sequential Inpatient Admission Number
 * Format: ADM-YYYY-XXXXXX (e.g., ADM-2026-000001)
 */
async function generateAdmissionNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.hospitalAdmission.count();
    const nextSeq = count + 1;
    let admissionNumber = `ADM-${year}-${String(nextSeq).padStart(6, "0")}`;

    let exists = await prisma.hospitalAdmission.findUnique({
        where: { admissionNumber }
    });

    let increment = 1;
    while (exists) {
        const altSeq = nextSeq + increment;
        admissionNumber = `ADM-${year}-${String(altSeq).padStart(6, "0")}`;
        exists = await prisma.hospitalAdmission.findUnique({
            where: { admissionNumber }
        });
        increment++;
    }

    return admissionNumber;
}

/**
 * Generate Ward Code from Ward Name
 * e.g., "Male Medical Ward" -> "WARD-MMW-01"
 */
function generateWardCode(name, index = 1) {
    const initials = name
        .replace(/[^a-zA-Z\s]/g, "")
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase())
        .join("")
        .slice(0, 4) || "GEN";
    const paddedIndex = String(index).padStart(2, "0");
    return `WRD-${initials}-${paddedIndex}`;
}

/**
 * Generate Bed Code from Room Code and Bed Number
 * e.g., roomCode "RM-101", bedNumber "01" -> "BED-RM-101-01"
 */
function generateBedCode(roomCode, bedNumber) {
    return `BED-${roomCode}-${String(bedNumber).padStart(2, "0")}`;
}

module.exports = {
    generateAdmissionNumber,
    generateWardCode,
    generateBedCode
};
