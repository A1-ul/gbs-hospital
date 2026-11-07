"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MORTUARY & DECEASED PATIENT SERVICES - CATALOGS & PROTOCOLS
Phase 14 Production Hardened - CommonJS Only
LOCATION: src/modules/mortuary/helpers/mortuary-catalogs.js
====================================================
*/

const CASE_CATEGORIES = [
    "NON_CORONER_CLINICAL",
    "POLICE_CORONER",
    "MEDICO_LEGAL",
    "UNCLAIMED"
];

const STORAGE_TIERS = {
    REFRIGERATED: {
        code: "REFRIGERATED",
        name: "Standard Cold Chamber (Short-Term)",
        targetTempC: 3.0,
        minTempC: 1.0,
        maxTempC: 5.0
    },
    DEEP_FREEZE: {
        code: "DEEP_FREEZE",
        name: "Forensic Deep Freeze Vault (Long-Term / Coroner)",
        targetTempC: -15.0,
        minTempC: -20.0,
        maxTempC: -10.0
    }
};

const AUTOPSY_TYPES = [
    "CLINICAL_PATHOLOGY",
    "MEDICO_LEGAL_CORONER"
];

/**
 * Validates deceased family release protocol compliance
 */
function validateReleaseEligibility(corpseRecord, releaseData) {
    const reasons = [];

    if (!releaseData.nextOfKinName || !releaseData.nextOfKinNationalId || !releaseData.relationshipToDeceased) {
        reasons.push("Next-of-Kin identification incomplete (Name, National ID, and Relationship required)");
    }

    if (corpseRecord.caseCategory === "POLICE_CORONER" && !corpseRecord.isCoronerCleared) {
        reasons.push("Mandatory Legal Hold: Police coroner clearance has not been granted for this case");
    }

    if (corpseRecord.status === "AUTOPSY_IN_PROGRESS") {
        reasons.push("Cannot release body: Post-mortem examination is currently in progress");
    }

    if (corpseRecord.status === "RELEASED_TO_FAMILY") {
        reasons.push("Body has already been released");
    }

    return {
        isEligible: reasons.length === 0,
        reasons
    };
}

module.exports = {
    CASE_CATEGORIES,
    STORAGE_TIERS,
    AUTOPSY_TYPES,
    validateReleaseEligibility
};
