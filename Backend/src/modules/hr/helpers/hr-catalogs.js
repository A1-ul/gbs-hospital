"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
HUMAN RESOURCES & STAFF CREDENTIALING - CATALOGS
Phase 17 Production Hardened - CommonJS Only
LOCATION: src/modules/hr/helpers/hr-catalogs.js
====================================================
*/

const REGULATORY_BODIES = Object.freeze({
    MDC_GHANA: {
        code: "MDC_GHANA",
        name: "Medical and Dental Council of Ghana",
        prefix: "MDC",
        renewalIntervalMonths: 12
    },
    NMC_GHANA: {
        code: "NMC_GHANA",
        name: "Nursing and Midwifery Council of Ghana",
        prefix: "NMC",
        renewalIntervalMonths: 12
    },
    PHARMACY_COUNCIL_GHANA: {
        code: "PHARMACY_COUNCIL_GHANA",
        name: "Pharmacy Council of Ghana",
        prefix: "PCG",
        renewalIntervalMonths: 12
    },
    ALLIED_HEALTH_GHANA: {
        code: "ALLIED_HEALTH_GHANA",
        name: "Allied Health Professions Council Ghana",
        prefix: "AHPC",
        renewalIntervalMonths: 12
    },
    HEFRA: {
        code: "HEFRA",
        name: "Health Facilities Regulatory Agency",
        prefix: "HEFRA",
        renewalIntervalMonths: 12
    }
});

const PROFESSIONAL_CADRES = Object.freeze([
    "CONSULTANT_SURGEON",
    "SPECIALIST_PHYSICIAN",
    "SENIOR_MEDICAL_OFFICER",
    "MEDICAL_OFFICER",
    "REGISTERED_GENERAL_NURSE",
    "CRITICAL_CARE_NURSE",
    "CLINICAL_PHARMACIST",
    "BIOMEDICAL_SCIENTIST",
    "RADIOGRAPHER",
    "EMERGENCY_PARAMEDIC",
    "HEALTH_RECORDS_OFFICER"
]);

const SHIFT_TYPES = Object.freeze({
    MORNING_SHIFT: {
        code: "MORNING_SHIFT",
        name: "Morning Shift (07:00 - 15:00)",
        startTime: "07:00",
        endTime: "15:00",
        standardHours: 8.0
    },
    AFTERNOON_SHIFT: {
        code: "AFTERNOON_SHIFT",
        name: "Afternoon Shift (14:30 - 21:30)",
        startTime: "14:30",
        endTime: "21:30",
        standardHours: 7.0
    },
    NIGHT_SHIFT: {
        code: "NIGHT_SHIFT",
        name: "Night Shift (21:00 - 08:00)",
        startTime: "21:00",
        endTime: "08:00",
        standardHours: 11.0
    },
    ON_CALL_24HR: {
        code: "ON_CALL_24HR",
        name: "24-Hour Clinical On-Call (08:00 - 08:00)",
        startTime: "08:00",
        endTime: "08:00",
        standardHours: 24.0
    }
});

const LEAVE_TYPES = Object.freeze([
    "ANNUAL_LEAVE",
    "SICK_LEAVE",
    "MATERNITY_LEAVE",
    "STUDY_LEAVE",
    "COMPASSIONATE_LEAVE"
]);

const CREDENTIAL_STATUSES = Object.freeze([
    "ACTIVE_VERIFIED",
    "EXPIRING_SOON",
    "EXPIRED_SUSPENDED",
    "UNDER_REVIEW"
]);

/**
 * Calculates credential expiration status dynamically
 */
function evaluateCredentialStatus(expiryDate) {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return {
            status: "EXPIRED_SUSPENDED",
            daysRemaining: diffDays,
            isExpired: true,
            alertNotice: "License has expired. Immediate renewal required with governing council."
        };
    } else if (diffDays <= 30) {
        return {
            status: "EXPIRING_SOON",
            daysRemaining: diffDays,
            isExpired: false,
            alertNotice: `License will expire in ${diffDays} days. Renewal application recommended.`
        };
    } else {
        return {
            status: "ACTIVE_VERIFIED",
            daysRemaining: diffDays,
            isExpired: false,
            alertNotice: "License is active and certified in good standing."
        };
    }
}

module.exports = {
    REGULATORY_BODIES,
    PROFESSIONAL_CADRES,
    SHIFT_TYPES,
    LEAVE_TYPES,
    CREDENTIAL_STATUSES,
    evaluateCredentialStatus
};
