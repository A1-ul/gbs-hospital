"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
QUALITY ASSURANCE, CLINICAL AUDIT & IPC CATALOGS
Phase 18 Production Hardened - CommonJS Only
LOCATION: src/modules/quality/helpers/quality-catalogs.js
====================================================
*/

const INCIDENT_SEVERITIES = {
    SENTINEL_EVENT: {
        code: "SENTINEL_EVENT",
        name: "Sentinel Event",
        description: "Unanticipated event resulting in death or serious permanent physical/psychological injury.",
        requiresRCA: true,
        notificationHours: 24
    },
    ADVERSE_EVENT: {
        code: "ADVERSE_EVENT",
        name: "Adverse Event",
        description: "Patient harm resulted from medical care rather than underlying disease.",
        requiresRCA: true,
        notificationHours: 48
    },
    NEAR_MISS: {
        code: "NEAR_MISS",
        name: "Near Miss (Good Catch)",
        description: "Patient safety event that did not reach the patient due to barrier intervention.",
        requiresRCA: false,
        notificationHours: 72
    },
    HAZARDOUS_CONDITION: {
        code: "HAZARDOUS_CONDITION",
        name: "Hazardous Condition",
        description: "Circumstance with significant potential to cause injury or incident if uncorrected.",
        requiresRCA: false,
        notificationHours: 120
    }
};

const INCIDENT_CATEGORIES = [
    "MEDICATION_ERROR",
    "SURGICAL_PROCEDURAL",
    "PATIENT_FALL",
    "DIAGNOSTIC_DELAY",
    "TRANSFUSION_EVENT",
    "EQUIPMENT_MALFUNCTION",
    "HEALTHCARE_ASSOCIATED_INFECTION",
    "DOCUMENTATION_CLINICAL_HANDOVER"
];

const INFECTION_TYPES = [
    "SURGICAL_SITE_INFECTION",
    "CAUTI",
    "CLABSI",
    "VAP",
    "MRSA",
    "CDIFF",
    "TUBERCULOSIS_AIRBORNE",
    "VIRAL_HEMORRHAGIC"
];

const ISOLATION_PRECAUTIONS = [
    "STANDARD",
    "CONTACT",
    "DROPLET",
    "AIRBORNE_ISOLATION",
    "PROTECTIVE_ENVIRONMENT"
];

const AUDIT_TYPES = [
    "ANTIBIOTIC_STEWARDSHIP",
    "HAND_HYGIENE_COMPLIANCE",
    "SURGICAL_SAFETY_CHECKLIST",
    "MORTALITY_MORBIDITY_REVIEW",
    "SBAR_HANDOVER_QUALITY",
    "RESUSCITATION_CRASH_CART"
];

const ROOT_CAUSE_METHODS = [
    "FIVE_WHYS",
    "FISHBONE_ISHIKAWA",
    "FMEA",
    "BARRIER_ANALYSIS"
];

/**
 * Computes hospital composite safety index from live counts
 */
function calculateSafetyIndex({ sentinelEvents, adverseEvents, activeHais, overdueCapas, complianceScoreAvg }) {
    let index = 100.0;
    index -= (sentinelEvents * 15.0);
    index -= (adverseEvents * 5.0);
    index -= (activeHais * 3.0);
    index -= (overdueCapas * 4.0);

    // Factor in clinical audit compliance score average
    if (typeof complianceScoreAvg === "number" && !isNaN(complianceScoreAvg)) {
        index = (index * 0.7) + (complianceScoreAvg * 0.3);
    }

    return Math.max(0, Math.min(100, Math.round(index * 10) / 10));
}

module.exports = {
    INCIDENT_SEVERITIES,
    INCIDENT_CATEGORIES,
    INFECTION_TYPES,
    ISOLATION_PRECAUTIONS,
    AUDIT_TYPES,
    ROOT_CAUSE_METHODS,
    calculateSafetyIndex
};
