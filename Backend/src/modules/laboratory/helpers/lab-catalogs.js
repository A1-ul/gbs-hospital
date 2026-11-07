"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
LABORATORY REFERENCE CATALOGS & PANIC VALUE ENGINE
Reference Ranges, Specimen Containers & Automated Clinical Alerts
LOCATION: src/modules/laboratory/helpers/lab-catalogs.js
====================================================
*/

/**
 * Standard Diagnostic Panels with Parameters & Reference Ranges
 */
const LAB_PANELS = Object.freeze({
    "LAB-FBC": {
        code: "LAB-FBC",
        name: "Full Blood Count (FBC)",
        department: "Hematology",
        specimenType: "WHOLE_BLOOD",
        tubeColor: "EDTA_PURPLE",
        parameters: [
            {
                name: "Hemoglobin",
                code: "HB",
                unit: "g/dL",
                refMinMale: 13.0,
                refMaxMale: 18.0,
                refMinFemale: 12.0,
                refMaxFemale: 16.0,
                panicLow: 7.0,
                panicHigh: 20.0
            },
            {
                name: "White Blood Cells (WBC)",
                code: "WBC",
                unit: "10^9/L",
                refMin: 4.0,
                refMax: 11.0,
                panicLow: 2.0,
                panicHigh: 30.0
            },
            {
                name: "Platelets",
                code: "PLT",
                unit: "10^9/L",
                refMin: 150.0,
                refMax: 450.0,
                panicLow: 50.0,
                panicHigh: 1000.0
            },
            {
                name: "Hematocrit (PCV)",
                code: "PCV",
                unit: "%",
                refMin: 36.0,
                refMax: 50.0,
                panicLow: 20.0,
                panicHigh: 60.0
            }
        ]
    },
    "LAB-MAL": {
        code: "LAB-MAL",
        name: "Malaria Parasite (MP) by Microscopy / RDT",
        department: "Parasitology",
        specimenType: "WHOLE_BLOOD",
        tubeColor: "EDTA_PURPLE",
        parameters: [
            {
                name: "Malaria Parasite (P. falciparum)",
                code: "MP",
                unit: "visual",
                isQualitative: true,
                normalValue: "Negative"
            }
        ]
    },
    "LAB-WIDAL": {
        code: "LAB-WIDAL",
        name: "Widal Typhoid Agglutination Test",
        department: "Serology",
        specimenType: "SERUM",
        tubeColor: "SST_GOLD",
        parameters: [
            {
                name: "S. Typhi 'O' Titer",
                code: "WIDAL_O",
                unit: "titer",
                isQualitative: true,
                normalValue: "< 1:80"
            },
            {
                name: "S. Typhi 'H' Titer",
                code: "WIDAL_H",
                unit: "titer",
                isQualitative: true,
                normalValue: "< 1:80"
            }
        ]
    },
    "LAB-LFT": {
        code: "LAB-LFT",
        name: "Liver Function Tests (LFT)",
        department: "Biochemistry",
        specimenType: "SERUM",
        tubeColor: "SST_GOLD",
        parameters: [
            {
                name: "Alanine Aminotransferase (ALT)",
                code: "ALT",
                unit: "U/L",
                refMin: 7.0,
                refMax: 56.0,
                panicHigh: 500.0
            },
            {
                name: "Aspartate Aminotransferase (AST)",
                code: "AST",
                unit: "U/L",
                refMin: 10.0,
                refMax: 40.0,
                panicHigh: 500.0
            },
            {
                name: "Total Bilirubin",
                code: "TBIL",
                unit: "mg/dL",
                refMin: 0.1,
                refMax: 1.2,
                panicHigh: 15.0
            }
        ]
    },
    "LAB-RFT": {
        code: "LAB-RFT",
        name: "Renal Function Tests (BUE & Cr)",
        department: "Biochemistry",
        specimenType: "SERUM",
        tubeColor: "SST_GOLD",
        parameters: [
            {
                name: "Serum Creatinine",
                code: "CREAT",
                unit: "mg/dL",
                refMin: 0.6,
                refMax: 1.3,
                panicHigh: 5.0
            },
            {
                name: "Blood Urea",
                code: "UREA",
                unit: "mg/dL",
                refMin: 7.0,
                refMax: 20.0,
                panicHigh: 100.0
            }
        ]
    },
    "LAB-URINE": {
        code: "LAB-URINE",
        name: "Urine Routine Examination & Microscopy",
        department: "Clinical Pathology",
        specimenType: "URINE",
        tubeColor: "STERILE_CONTAINER",
        parameters: [
            { name: "Protein", code: "UR_PROT", unit: "dipstick", isQualitative: true, normalValue: "Negative" },
            { name: "Glucose", code: "UR_GLU", unit: "dipstick", isQualitative: true, normalValue: "Negative" },
            { name: "Leukocytes", code: "UR_LEUK", unit: "dipstick", isQualitative: true, normalValue: "Negative" },
            { name: "Nitrite", code: "UR_NIT", unit: "dipstick", isQualitative: true, normalValue: "Negative" }
        ]
    }
});

/**
 * Automatically evaluate abnormal and critical panic flags for a measured lab value
 * 
 * @param {Object} paramDefinition - Parameter definition with ranges and panic cutoffs
 * @param {string|number} measuredValue - Measured test result
 * @param {string} [gender="MALE"] - Patient gender
 * @returns {Object} { flag: string, isPanic: boolean, refRangeText: string }
 */
function evaluateResultFlag(paramDefinition, measuredValue, gender = "MALE") {
    if (!paramDefinition) {
        return { flag: "NORMAL", isPanic: false, refRangeText: "Standard" };
    }

    if (paramDefinition.isQualitative) {
        const valStr = String(measuredValue).trim();
        const normStr = String(paramDefinition.normalValue || "Negative").trim();
        const isNormal = valStr.toLowerCase() === normStr.toLowerCase();
        const isPanic = !isNormal && (valStr.includes("+++") || valStr.toLowerCase().includes("reactive"));

        return {
            flag: isNormal ? "NEGATIVE" : (isPanic ? "CRITICAL_PANIC_HIGH" : "POSITIVE"),
            isPanic,
            refRangeText: normStr
        };
    }

    const numVal = parseFloat(measuredValue);
    if (isNaN(numVal)) {
        return { flag: "NORMAL", isPanic: false, refRangeText: "" };
    }

    const isFemale = String(gender).toUpperCase() === "FEMALE";
    const refMin = isFemale && paramDefinition.refMinFemale !== undefined
        ? paramDefinition.refMinFemale
        : paramDefinition.refMin !== undefined ? paramDefinition.refMin : paramDefinition.refMinMale;

    const refMax = isFemale && paramDefinition.refMaxFemale !== undefined
        ? paramDefinition.refMaxFemale
        : paramDefinition.refMax !== undefined ? paramDefinition.refMax : paramDefinition.refMaxMale;

    const panicLow = paramDefinition.panicLow;
    const panicHigh = paramDefinition.panicHigh;

    let flag = "NORMAL";
    let isPanic = false;

    if (panicLow !== undefined && numVal < panicLow) {
        flag = "CRITICAL_PANIC_LOW";
        isPanic = true;
    } else if (panicHigh !== undefined && numVal > panicHigh) {
        flag = "CRITICAL_PANIC_HIGH";
        isPanic = true;
    } else if (refMin !== undefined && numVal < refMin) {
        flag = "LOW";
    } else if (refMax !== undefined && numVal > refMax) {
        flag = "HIGH";
    }

    const refRangeText = `${refMin !== undefined ? refMin : ""}${refMin !== undefined && refMax !== undefined ? " - " : ""}${refMax !== undefined ? refMax : ""} ${paramDefinition.unit || ""}`.trim();

    return {
        flag,
        isPanic,
        refRangeText
    };
}

module.exports = {
    LAB_PANELS,
    evaluateResultFlag
};
