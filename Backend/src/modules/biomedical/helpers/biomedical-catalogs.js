"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BIOMEDICAL ENGINEERING - CLINICAL & ENGINEERING CATALOGS
Phase 15 Production Hardened - CommonJS Only
LOCATION: src/modules/biomedical/helpers/biomedical-catalogs.js
====================================================
*/

const EQUIPMENT_CATEGORIES = Object.freeze({
    LIFE_SUPPORT: {
        code: "LIFE_SUPPORT",
        name: "Life-Support Systems",
        defaultRisk: "CRITICAL_HIGH_RISK",
        defaultPpmDays: 60,
        defaultCalDays: 90,
        examples: ["Mechanical Ventilators", "Defibrillators", "Anesthesia Workstations", "Dialysis Machines"]
    },
    DIAGNOSTIC_IMAGING: {
        code: "DIAGNOSTIC_IMAGING",
        name: "Diagnostic Imaging Equipment",
        defaultRisk: "CRITICAL_HIGH_RISK",
        defaultPpmDays: 90,
        defaultCalDays: 180,
        examples: ["MRI", "CT Scanners", "Digital X-Ray", "Ultrasound Units"]
    },
    SURGICAL_THEATRE: {
        code: "SURGICAL_THEATRE",
        name: "Surgical Theatre Systems",
        defaultRisk: "CRITICAL_HIGH_RISK",
        defaultPpmDays: 60,
        defaultCalDays: 90,
        examples: ["Electrosurgical Units (Diathermy)", "Laparoscopic Towers", "Operating Tables", "Surgical Lights"]
    },
    MONITORING: {
        code: "MONITORING",
        name: "Patient Monitoring & Infusion",
        defaultRisk: "MEDIUM_RISK",
        defaultPpmDays: 90,
        defaultCalDays: 180,
        examples: ["ICU Multi-parameter Monitors", "Syringe Pumps", "Volumetric Infusion Pumps", "Pulse Oximeters"]
    },
    LABORATORY: {
        code: "LABORATORY",
        name: "Laboratory & Pathology Analyzers",
        defaultRisk: "MEDIUM_RISK",
        defaultPpmDays: 90,
        defaultCalDays: 90,
        examples: ["Hematology Analyzers", "Clinical Chemistry Analyzers", "Blood Gas Analyzers", "Centrifuges"]
    },
    STERILIZATION: {
        code: "STERILIZATION",
        name: "Central Sterile Supply & Autoclaves",
        defaultRisk: "MEDIUM_RISK",
        defaultPpmDays: 30,
        defaultCalDays: 90,
        examples: ["Steam Autoclaves", "Plasma Sterilizers", "Washer-Disinfectors"]
    },
    GENERAL_BIOMEDICAL: {
        code: "GENERAL_BIOMEDICAL",
        name: "General Biomedical Devices",
        defaultRisk: "LOW_RISK",
        defaultPpmDays: 180,
        defaultCalDays: 365,
        examples: ["Examination Couches", "Nebulizers", "Suction Units", "Digital Thermometers"]
    }
});

const RISK_LEVELS = Object.freeze({
    CRITICAL_HIGH_RISK: {
        code: "CRITICAL_HIGH_RISK",
        name: "Critical Life-Support / High Risk",
        responseTargetMinutes: 15,
        mandatorySafetyOverrideLog: true
    },
    MEDIUM_RISK: {
        code: "MEDIUM_RISK",
        name: "Medium Clinical Risk",
        responseTargetMinutes: 60,
        mandatorySafetyOverrideLog: false
    },
    LOW_RISK: {
        code: "LOW_RISK",
        name: "Low Risk Auxiliary",
        responseTargetMinutes: 240,
        mandatorySafetyOverrideLog: false
    }
});

const WORK_ORDER_TYPES = Object.freeze({
    CORRECTIVE_BREAKDOWN: "CORRECTIVE_BREAKDOWN",
    PREVENTIVE_MAINTENANCE: "PREVENTIVE_MAINTENANCE",
    CALIBRATION_CERTIFICATION: "CALIBRATION_CERTIFICATION",
    SAFETY_INSPECTION: "SAFETY_INSPECTION"
});

const WORK_ORDER_PRIORITIES = Object.freeze({
    STAT_EMERGENCY_BREAKDOWN: {
        code: "STAT_EMERGENCY_BREAKDOWN",
        slaMinutes: 15,
        description: "Life-support or operating theatre emergency failure"
    },
    URGENT: {
        code: "URGENT",
        slaMinutes: 60,
        description: "Essential clinical department equipment down"
    },
    ROUTINE: {
        code: "ROUTINE",
        slaMinutes: 1440, // 24 hours
        description: "Scheduled service or non-critical asset maintenance"
    }
});

const WORK_ORDER_STATUSES = Object.freeze({
    REPORTED: "REPORTED",
    ASSIGNED: "ASSIGNED",
    IN_PROGRESS: "IN_PROGRESS",
    PENDING_SPARE_PARTS: "PENDING_SPARE_PARTS",
    COMPLETED_AWAITING_QA: "COMPLETED_AWAITING_QA",
    VERIFIED_RETURNED_TO_SERVICE: "VERIFIED_RETURNED_TO_SERVICE"
});

// IEC 60601-1 Medical Electrical Safety Limits
const ELECTRICAL_SAFETY_LIMITS = Object.freeze({
    MAX_GROUND_RESISTANCE_OHMS: 0.2,       // Maximum protective earth conductor resistance: 0.2 Ohms
    MAX_LEAKAGE_CURRENT_MICRO_AMPS: 500.0, // Maximum chassis leakage current (Single Fault Condition): 500 uA
    MAX_NORMAL_LEAKAGE_MICRO_AMPS: 100.0   // Maximum normal condition leakage: 100 uA
});

/**
 * Validates electrical safety analysis results
 */
function evaluateElectricalSafety(groundResistanceOhms, leakageCurrentMicroAmps) {
    const reasons = [];
    if (groundResistanceOhms !== undefined && groundResistanceOhms !== null) {
        if (groundResistanceOhms > ELECTRICAL_SAFETY_LIMITS.MAX_GROUND_RESISTANCE_OHMS) {
            reasons.push(`Ground Resistance (${groundResistanceOhms} Ω) exceeds IEC 60601-1 limit of ${ELECTRICAL_SAFETY_LIMITS.MAX_GROUND_RESISTANCE_OHMS} Ω.`);
        }
    }
    if (leakageCurrentMicroAmps !== undefined && leakageCurrentMicroAmps !== null) {
        if (leakageCurrentMicroAmps > ELECTRICAL_SAFETY_LIMITS.MAX_LEAKAGE_CURRENT_MICRO_AMPS) {
            reasons.push(`Chassis Leakage Current (${leakageCurrentMicroAmps} µA) exceeds IEC 60601-1 safety threshold of ${ELECTRICAL_SAFETY_LIMITS.MAX_LEAKAGE_CURRENT_MICRO_AMPS} µA.`);
        }
    }
    return {
        passed: reasons.length === 0,
        reasons
    };
}

module.exports = {
    EQUIPMENT_CATEGORIES,
    RISK_LEVELS,
    WORK_ORDER_TYPES,
    WORK_ORDER_PRIORITIES,
    WORK_ORDER_STATUSES,
    ELECTRICAL_SAFETY_LIMITS,
    evaluateElectricalSafety
};
