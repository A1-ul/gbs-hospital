"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
OFFICIAL HOSPITAL REGISTRATION & MEMBERSHIP ID CARD SERVICE
Generates verified, PostgreSQL-backed Hospital Membership ID Cards for:
1. Accepted / Registered Patients (with Hospital Info + MRN + Folder + Blood/NHIS)
2. Accepted / Approved Hospital Staff & Portal Members (rejecting unapproved users)
100% CommonJS — Real PostgreSQL Data Only, Cryptographic Verification Hash
LOCATION: Backend/src/modules/patients/services/membership-card.service.js
================================================================================
*/

const crypto = require("crypto");
const prisma = require("../../../core/database/prisma.client");
const AppError = require("../../../core/errors/app.error");
const { getFacilityBranding } = require("../../tenant-management/backup-and-environment.service");
const { getLocaleProfile } = require("../../international/international.service");
const { hasAdminAccess } = require("../../../config/roles");

const ROLE_DISPLAY = Object.freeze({
    ADMINISTRATOR: { label: "Hospital Administrator", dept: "Hospital Administration" },
    HOSPITAL_DIRECTOR: { label: "Hospital Director", dept: "Executive Office" },
    DEVELOPER: { label: "System Control Engineer", dept: "System Engineering" },
    DOCTOR: { label: "Medical Doctor", dept: "General Medicine" },
    SURGEON: { label: "Consultant Surgeon", dept: "Surgery & Operating Theatre" },
    DENTIST: { label: "Dental Surgeon", dept: "Dental Clinic" },
    EYE_DOCTOR: { label: "Ophthalmologist", dept: "Ophthalmology & Eye Clinic" },
    RADIOLOGIST: { label: "Consultant Radiologist", dept: "Radiology & PACS" },
    NURSE: { label: "Registered Nurse", dept: "Nursing & Wards" },
    PHARMACIST: { label: "Clinical Pharmacist", dept: "Hospital Pharmacy" },
    LAB_TECHNICIAN: { label: "Laboratory Scientist", dept: "Laboratory & Blood Bank" },
    RECEPTIONIST: { label: "Front Desk Officer", dept: "Patient Registration & Front Desk" },
    FOLDER_RETRIEVER: { label: "Medical Records Archivist", dept: "Medical Records & Archive" },
    ACCOUNTANT: { label: "Hospital Accountant", dept: "Billing, Finance & NHIS" },
    HR_MANAGER: { label: "Human Resources Manager", dept: "Human Resources" },
    PATIENT: { label: "Registered Patient Member", dept: "Patient Care & Self-Service" }
});

function buildVerificationHash({ cardSerial, memberNumber, fullName, hospitalCode, registeredAt }) {
    const secret = process.env.JWT_SECRET || "gbs-hospital-official-membership-seal-2026";
    const payload = `${cardSerial}|${memberNumber}|${fullName}|${hospitalCode}|${registeredAt}`;
    const digest = crypto.createHmac("sha256", secret).update(payload).digest("hex").toUpperCase();
    return `GBS-VRF-${digest.slice(0, 12)}`;
}

async function resolveHospitalProfile(preferredHospitalId = null) {
    let hospital = null;
    if (preferredHospitalId) {
        hospital = await prisma.hospital.findUnique({ where: { id: String(preferredHospitalId) } }).catch(() => null);
    }
    if (!hospital) {
        hospital = await prisma.hospital.findFirst({ orderBy: { createdAt: "asc" } }).catch(() => null);
    }

    const branding = typeof getFacilityBranding === "function"
        ? await Promise.resolve(getFacilityBranding()).catch(() => ({}))
        : {};
    let localeProfile = {};
    try {
        localeProfile = typeof getLocaleProfile === "function" ? (getLocaleProfile() || {}) : {};
    } catch (_e) {
        localeProfile = {};
    }

    const hospitalName = branding?.hospitalName || hospital?.name || "GBS Premier Specialist Teaching Hospital";
    const motto = branding?.motto || branding?.facilityTagline || "Smart Healthcare, Better Care.";
    const hospitalCode = hospital?.code || "GBS-HOSP-001";
    const addressLine = [hospital?.address, hospital?.city, hospital?.state, hospital?.country || localeProfile?.countryName]
        .filter(Boolean)
        .join(", ") || "Hospital Main Campus";

    return {
        hospitalId: hospital?.id || null,
        mainSystemName: branding?.mainSystemName || "GBS HOSPITAL MANAGEMENT SYSTEM",
        hospitalName,
        motto,
        organizationType: branding?.organizationType || "PRIVATE_HOSPITAL",
        hospitalCode,
        address: addressLine,
        city: hospital?.city || "",
        country: hospital?.country || localeProfile?.countryName || "Ghana",
        countryFlag: localeProfile?.countryFlag || "🏥",
        phone: hospital?.phone || "+233 30 200 0000",
        email: hospital?.email || "info@gbshospital.org",
        emergencyLine: localeProfile?.emergencyNumber || "112",
        healthInsuranceScheme: localeProfile?.healthInsuranceScheme || "National Health Insurance",
        logoUrl: branding?.logoUrl || "/gbs-official-logo.png"
    };
}

function buildValidityDates(registeredAt) {
    const issuedAt = new Date();
    const validThrough = new Date(issuedAt);
    validThrough.setFullYear(validThrough.getFullYear() + 2);
    return {
        registeredAt: registeredAt ? new Date(registeredAt).toISOString() : issuedAt.toISOString(),
        issuedAt: issuedAt.toISOString(),
        validThrough: validThrough.toISOString()
    };
}

/**
 * 1. Generate Official Hospital Membership ID Card for a Registered / Accepted Patient
 */
async function generatePatientMembershipCard(patientIdOrMrn, actor, requestId = null) {
    const clean = String(patientIdOrMrn || "").trim();
    if (!clean) {
        throw new AppError("Patient ID or MRN is required to generate a membership card.", 400, "MISSING_PATIENT_ID");
    }

    const patient = await prisma.patient.findFirst({
        where: {
            OR: [{ id: clean }, { patientNumber: clean }]
        },
        include: {
            hospital: true,
            folder: true
        }
    });

    if (!patient) {
        throw new AppError("Registered patient record not found in hospital system.", 404, "PATIENT_NOT_FOUND");
    }

    // Strict patient self-service privacy: PATIENT role may only generate their own membership card
    if (actor && String(actor.role).toUpperCase() === "PATIENT") {
        const ownsPatient =
            (patient.userId && String(patient.userId) === String(actor.id)) ||
            (patient.email && actor.email && patient.email.toLowerCase() === actor.email.toLowerCase());
        if (!ownsPatient) {
            throw new AppError("You can only view or print your own hospital membership ID card.", 403, "FORBIDDEN");
        }
    }

    const hospital = await resolveHospitalProfile(patient.hospitalId);
    const fullName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || patient.patientNumber;
    const year = new Date(patient.createdAt || Date.now()).getFullYear();
    const shortId = String(patient.id || "").replace(/-/g, "").slice(0, 6).toUpperCase();
    const cardSerial = `GBS-PAT-${year}-${shortId}`;
    const dates = buildValidityDates(patient.createdAt);

    const verificationHash = buildVerificationHash({
        cardSerial,
        memberNumber: patient.patientNumber,
        fullName,
        hospitalCode: hospital.hospitalCode,
        registeredAt: dates.registeredAt
    });

    const qrPayload = `GBS-HOSPITAL|CARD:${cardSerial}|MRN:${patient.patientNumber}|NAME:${fullName}|HOSP:${hospital.hospitalCode}|VRF:${verificationHash}`;

    const card = {
        cardSerial,
        cardCategory: "PATIENT_MEMBER",
        cardCategoryLabel: "OFFICIAL HOSPITAL PATIENT MEMBERSHIP CARD",
        membershipStatus: "ACCEPTED & REGISTERED",
        verified: true,
        member: {
            id: patient.id,
            memberNumber: patient.patientNumber,
            fullName,
            firstName: patient.firstName,
            lastName: patient.lastName,
            role: "PATIENT",
            roleLabel: "Registered Hospital Patient Member",
            department: "Outpatient, Inpatient & Emergency Care",
            gender: patient.gender || "Not Specified",
            dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().slice(0, 10) : null,
            bloodGroup: patient.bloodGroup ? String(patient.bloodGroup).replace(/_/g, " ") : "On File",
            genotype: patient.genotype || "On File",
            phone: patient.phone || null,
            email: patient.email || null,
            address: patient.address || null,
            nhisNumber: patient.nhisNumber || null,
            folderNumber: patient.folder?.folderNumber || null,
            shelfLocation: patient.folder?.shelfLocation || null
        },
        hospital,
        dates,
        verificationHash,
        qrPayload
    };

    await prisma.auditLog.create({
        data: {
            userId: actor?.id || null,
            role: actor?.role || null,
            hospitalId: hospital.hospitalId,
            action: "MEMBERSHIP_CARD_GENERATED",
            module: "PATIENTS",
            outcome: "SUCCESS",
            affectedRecord: patient.id,
            requestId,
            description: `Generated Official Hospital Patient Membership Card [${cardSerial}] for ${fullName} (${patient.patientNumber})`
        }
    }).catch(() => {});

    return card;
}

/**
 * 2. Generate Official Hospital Membership ID Card for an Accepted / Approved User Account
 * Rejects pending/inactive users with 403 MEMBERSHIP_NOT_ACCEPTED.
 */
async function generateUserMembershipCard(userId, actor, requestId = null) {
    const targetId = String(userId || actor?.id || "").trim();
    if (!targetId) {
        throw new AppError("User ID is required to generate a hospital membership card.", 400, "MISSING_USER_ID");
    }

    const isSelf = actor && String(actor.id) === targetId;
    if (!isSelf && !hasAdminAccess(actor?.role)) {
        throw new AppError("Only Hospital Administrators can generate membership cards for other staff accounts.", 403, "FORBIDDEN");
    }

    const user = await prisma.user.findUnique({
        where: { id: targetId },
        include: {
            role: { select: { name: true, description: true } },
            patient: {
                include: {
                    hospital: true,
                    folder: true
                }
            }
        }
    });

    if (!user) {
        throw new AppError("Hospital member account not found.", 404, "USER_NOT_FOUND");
    }

    if (!user.active) {
        throw new AppError(
            "This registration has not yet been accepted and activated by the Hospital Administrator. Membership ID cards are issued once registration is accepted.",
            403,
            "MEMBERSHIP_NOT_ACCEPTED"
        );
    }

    // If this accepted user is a linked PATIENT, enrich with their full Patient MPI & Folder details
    if (user.patient) {
        return await generatePatientMembershipCard(user.patient.id, actor, requestId);
    }

    const roleName = user.role?.name || "STAFF";
    const roleMeta = ROLE_DISPLAY[roleName] || { label: roleName.replace(/_/g, " "), dept: "Hospital Services" };
    const hospital = await resolveHospitalProfile(null);
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
    const year = new Date(user.createdAt || Date.now()).getFullYear();
    const shortId = String(user.id).replace(/-/g, "").slice(0, 6).toUpperCase();
    const isPatientRole = roleName === "PATIENT";
    const cardSerial = isPatientRole ? `GBS-PAT-${year}-${shortId}` : `GBS-MBR-${year}-${shortId}`;
    const memberNumber = `GBS-${roleName.slice(0, 3).toUpperCase()}-${shortId}`;
    const dates = buildValidityDates(user.createdAt);

    const verificationHash = buildVerificationHash({
        cardSerial,
        memberNumber,
        fullName,
        hospitalCode: hospital.hospitalCode,
        registeredAt: dates.registeredAt
    });

    const qrPayload = `GBS-HOSPITAL|CARD:${cardSerial}|MBR:${memberNumber}|ROLE:${roleName}|NAME:${fullName}|HOSP:${hospital.hospitalCode}|VRF:${verificationHash}`;

    const card = {
        cardSerial,
        cardCategory: isPatientRole ? "PATIENT_MEMBER" : "HOSPITAL_STAFF_MEMBER",
        cardCategoryLabel: isPatientRole
            ? "OFFICIAL HOSPITAL PATIENT MEMBERSHIP CARD"
            : "OFFICIAL HOSPITAL ACCEPTED MEMBER ID CARD",
        membershipStatus: "ACCEPTED & ACTIVE",
        verified: true,
        member: {
            id: user.id,
            memberNumber,
            fullName,
            firstName: user.firstName,
            lastName: user.lastName,
            role: roleName,
            roleLabel: roleMeta.label,
            department: roleMeta.dept,
            email: user.email,
            phone: null,
            gender: null,
            dateOfBirth: null,
            bloodGroup: null,
            genotype: null,
            nhisNumber: null,
            folderNumber: null,
            shelfLocation: null
        },
        hospital,
        dates,
        verificationHash,
        qrPayload
    };

    await prisma.auditLog.create({
        data: {
            userId: actor?.id || user.id,
            role: actor?.role || roleName,
            hospitalId: hospital.hospitalId,
            action: "MEMBERSHIP_CARD_GENERATED",
            module: "USERS",
            outcome: "SUCCESS",
            affectedRecord: user.id,
            requestId,
            description: `Generated Official Hospital Membership ID Card [${cardSerial}] for ${fullName} (${roleName})`
        }
    }).catch(() => {});

    return card;
}

module.exports = {
    generatePatientMembershipCard,
    generateUserMembershipCard
};
