"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BLOOD BANK & TRANSFUSION CLINICAL CATALOGS & COMPATIBILITY MATRIX
Phase 13 Production Hardened - CommonJS Only
LOCATION: src/modules/blood-bank/helpers/blood-bank-catalogs.js
====================================================
*/

/**
 * Standard Blood Groups & Rh Phenotypes
 */
const BLOOD_GROUPS = [
    "A_POSITIVE",
    "A_NEGATIVE",
    "B_POSITIVE",
    "B_NEGATIVE",
    "AB_POSITIVE",
    "AB_NEGATIVE",
    "O_POSITIVE",
    "O_NEGATIVE"
];

/**
 * Blood Components, standard shelf-life in days, and optimal storage temperatures in Celsius
 */
const BLOOD_COMPONENTS = {
    PACKED_RED_CELLS: {
        code: "PACKED_RED_CELLS",
        name: "Packed Red Blood Cells (PRBC)",
        defaultVolumeMl: 300,
        shelfLifeDays: 35,
        minTempC: 2.0,
        maxTempC: 6.0,
        targetTempC: 4.0,
        defaultStorageLocation: "FRIDGE-PRBC-01"
    },
    WHOLE_BLOOD: {
        code: "WHOLE_BLOOD",
        name: "Whole Blood (WB)",
        defaultVolumeMl: 450,
        shelfLifeDays: 28,
        minTempC: 2.0,
        maxTempC: 6.0,
        targetTempC: 4.0,
        defaultStorageLocation: "FRIDGE-WB-01"
    },
    FRESH_FROZEN_PLASMA: {
        code: "FRESH_FROZEN_PLASMA",
        name: "Fresh Frozen Plasma (FFP)",
        defaultVolumeMl: 250,
        shelfLifeDays: 365,
        minTempC: -25.0,
        maxTempC: -18.0,
        targetTempC: -20.0,
        defaultStorageLocation: "FREEZER-FFP-01"
    },
    PLATELETS: {
        code: "PLATELETS",
        name: "Platelet Concentrate (PLT)",
        defaultVolumeMl: 60,
        shelfLifeDays: 5,
        minTempC: 20.0,
        maxTempC: 24.0,
        targetTempC: 22.0,
        defaultStorageLocation: "AGITATOR-PLT-01"
    },
    CRYOPRECIPITATE: {
        code: "CRYOPRECIPITATE",
        name: "Cryoprecipitate (CRYO)",
        defaultVolumeMl: 15,
        shelfLifeDays: 365,
        minTempC: -25.0,
        maxTempC: -18.0,
        targetTempC: -20.0,
        defaultStorageLocation: "FREEZER-CRYO-01"
    }
};

/**
 * Red Blood Cell (RBC) Compatibility Matrix (Major Cross-Match Rules)
 * Recipient Blood Group -> Compatible Donor Red Blood Cell Groups
 */
const RBC_COMPATIBILITY_MATRIX = {
    A_POSITIVE: ["A_POSITIVE", "A_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"],
    A_NEGATIVE: ["A_NEGATIVE", "O_NEGATIVE"],
    B_POSITIVE: ["B_POSITIVE", "B_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"],
    B_NEGATIVE: ["B_NEGATIVE", "O_NEGATIVE"],
    AB_POSITIVE: ["A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"], // Universal Recipient
    AB_NEGATIVE: ["A_NEGATIVE", "B_NEGATIVE", "AB_NEGATIVE", "O_NEGATIVE"],
    O_POSITIVE: ["O_POSITIVE", "O_NEGATIVE"],
    O_NEGATIVE: ["O_NEGATIVE"] // Universal Donor (can only receive O-)
};

/**
 * Fresh Frozen Plasma (FFP) Compatibility Matrix
 * Recipient Blood Group -> Compatible Donor Plasma Groups
 */
const PLASMA_COMPATIBILITY_MATRIX = {
    O_POSITIVE: ["O_POSITIVE", "O_NEGATIVE", "A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE"],
    O_NEGATIVE: ["O_NEGATIVE", "A_NEGATIVE", "B_NEGATIVE", "AB_NEGATIVE"],
    A_POSITIVE: ["A_POSITIVE", "A_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE"],
    A_NEGATIVE: ["A_NEGATIVE", "AB_NEGATIVE"],
    B_POSITIVE: ["B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE"],
    B_NEGATIVE: ["B_NEGATIVE", "AB_NEGATIVE"],
    AB_POSITIVE: ["AB_POSITIVE", "AB_NEGATIVE"], // Plasma: AB is universal donor, O is universal recipient
    AB_NEGATIVE: ["AB_NEGATIVE"]
};

/**
 * Checks RBC or Plasma compatibility between Recipient and Donor
 */
function isBloodCompatible(recipientGroup, donorGroup, componentType = "PACKED_RED_CELLS") {
    if (!recipientGroup || !donorGroup) return false;

    if (componentType === "FRESH_FROZEN_PLASMA" || componentType === "CRYOPRECIPITATE") {
        const allowed = PLASMA_COMPATIBILITY_MATRIX[recipientGroup] || [];
        return allowed.includes(donorGroup);
    }

    // Default to Red Blood Cells (PRBC or Whole Blood)
    const allowed = RBC_COMPATIBILITY_MATRIX[recipientGroup] || [];
    return allowed.includes(donorGroup);
}

/**
 * Donor eligibility screening evaluation criteria
 */
function evaluateDonorEligibility(screeningData) {
    const {
        age,
        weightKg,
        hemoglobinLevel,
        systolicBp,
        diastolicBp,
        pulse,
        hasRecentIllness,
        hasTravelRisk,
        lastDonationDate
    } = screeningData;

    const reasons = [];

    if (age !== undefined && (age < 18 || age > 65)) {
        reasons.push("Age outside allowable donor range (18 - 65 years)");
    }

    if (weightKg !== undefined && weightKg < 50.0) {
        reasons.push("Donor weight below minimum threshold (50.0 kg required)");
    }

    if (hemoglobinLevel !== undefined && hemoglobinLevel < 12.5) {
        reasons.push("Hemoglobin level below clinical safety cutoff (minimum 12.5 g/dL required)");
    }

    if (systolicBp !== undefined && (systolicBp < 100 || systolicBp > 160)) {
        reasons.push("Systolic blood pressure outside safe threshold (100 - 160 mmHg)");
    }

    if (diastolicBp !== undefined && (diastolicBp < 60 || diastolicBp > 100)) {
        reasons.push("Diastolic blood pressure outside safe threshold (60 - 100 mmHg)");
    }

    if (pulse !== undefined && (pulse < 50 || pulse > 100)) {
        reasons.push("Pulse rate outside acceptable resting range (50 - 100 bpm)");
    }

    if (hasRecentIllness) {
        reasons.push("Temporary deferral: Recent acute febrile or infectious illness");
    }

    if (hasTravelRisk) {
        reasons.push("Temporary deferral: Endemic disease exposure risk");
    }

    // Check donation interval: minimum 56 days (8 weeks) between whole blood donations
    if (lastDonationDate) {
        const daysSinceLast = Math.floor((new Date() - new Date(lastDonationDate)) / (1000 * 60 * 60 * 24));
        if (daysSinceLast < 56) {
            reasons.push(`Minimum 56-day rest period not elapsed (${daysSinceLast} days since last donation)`);
        }
    }

    return {
        isEligible: reasons.length === 0,
        status: reasons.length === 0 ? "ELIGIBLE" : "TEMPORARILY_DEFERRED",
        reasons
    };
}

module.exports = {
    BLOOD_GROUPS,
    BLOOD_COMPONENTS,
    RBC_COMPATIBILITY_MATRIX,
    PLASMA_COMPATIBILITY_MATRIX,
    isBloodCompatible,
    evaluateDonorEligibility
};
