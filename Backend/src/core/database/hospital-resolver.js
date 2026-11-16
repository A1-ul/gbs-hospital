"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
SHARED DEFAULT HOSPITAL RESOLVER
LOCATION: src/core/database/hospital-resolver.js
====================================================
*/

const prisma = require("./prisma.client");
const AppError = require("../errors/app.error");

const DEFAULT_HOSPITAL_DATA = {
    code: "GBS-MAIN",
    name: "GBS Premier Specialist Teaching Hospital",
    country: "Ghana",
    city: "Accra",
    active: true
};

/**
 * Resolve an explicit hospital ID (verifying it exists) or return/auto-provision
 * the system's active primary Hospital record so multi-module and Developer calls
 * never fail on empty-hospital or null req.user.hospitalId states.
 *
 * @param {string|null|undefined} explicitHospitalId
 * @returns {Promise<import("@prisma/client").Hospital>}
 */
async function ensureDefaultHospital(explicitHospitalId) {
    if (explicitHospitalId) {
        const existing = await prisma.hospital.findUnique({
            where: { id: explicitHospitalId }
        });
        if (!existing) {
            throw new AppError("Hospital not found", 404, "HOSPITAL_NOT_FOUND");
        }
        return existing;
    }

    let hospital = await prisma.hospital.findFirst({
        where: { active: true, deletedAt: null },
        orderBy: { createdAt: "asc" }
    });

    if (!hospital) {
        hospital = await prisma.hospital.findFirst({
            orderBy: { createdAt: "asc" }
        });
    }

    if (!hospital) {
        hospital = await prisma.hospital.upsert({
            where: { code: DEFAULT_HOSPITAL_DATA.code },
            update: { active: true, deletedAt: null },
            create: DEFAULT_HOSPITAL_DATA
        });
    }

    return hospital;
}

/**
 * Convenience wrapper returning only the resolved hospital UUID.
 *
 * @param {string|null|undefined} explicitHospitalId
 * @returns {Promise<string>}
 */
async function ensureDefaultHospitalId(explicitHospitalId) {
    const hospital = await ensureDefaultHospital(explicitHospitalId);
    return hospital.id;
}

module.exports = {
    ensureDefaultHospital,
    ensureDefaultHospitalId
};

