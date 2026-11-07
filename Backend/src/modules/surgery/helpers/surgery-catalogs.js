"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
SURGERY REFERENCE CATALOGS & PERIOPERATIVE PROTOCOLS
Operating Theatres, Procedures, WHO Checklist & Aldrete Score
LOCATION: src/modules/surgery/helpers/surgery-catalogs.js
====================================================
*/

/**
 * Standard Operating Theatre Suites
 */
const STANDARD_THEATRES = Object.freeze([
    {
        code: "OT-01",
        name: "Main Operating Theater Suite 1",
        theatreType: "GENERAL_SURGERY",
        floor: "2nd Floor",
        building: "Surgical Pavilion"
    },
    {
        code: "OT-02",
        name: "Main Operating Theater Suite 2 (Trauma/Ortho)",
        theatreType: "ORTHOPEDIC",
        floor: "2nd Floor",
        building: "Surgical Pavilion"
    },
    {
        code: "OT-03",
        name: "Maternity Operating Theater (Obstetrics)",
        theatreType: "OBGYN",
        floor: "1st Floor",
        building: "Maternal & Child Health Wing"
    },
    {
        code: "MOT-01",
        name: "Minor Operating Theater & Endoscopy",
        theatreType: "MINOR",
        floor: "Ground Floor",
        building: "Outpatient Surgical Center"
    }
]);

/**
 * Standard Surgical Procedures Catalog
 */
const BASE_PROCEDURES = {
    "SURG-APP-01": {
        code: "SURG-APP-01",
        procedureName: "Open / Laparoscopic Appendectomy",
        category: "GENERAL_SURGERY",
        estimatedDurationMinutes: 60,
        standardFee: 1500.00,
        nhisCovered: true
    },
    "SURG-CS-01": {
        code: "SURG-CS-01",
        procedureName: "Cesarean Section (Emergency / Elective LUSCS)",
        category: "OBSTETRICS_GYNAECOLOGY",
        estimatedDurationMinutes: 50,
        standardFee: 1800.00,
        nhisCovered: true
    },
    "SURG-HERN-01": {
        code: "SURG-HERN-01",
        procedureName: "Inguinal Hernioplasty with Polypropylene Mesh",
        category: "GENERAL_SURGERY",
        estimatedDurationMinutes: 60,
        standardFee: 1200.00,
        nhisCovered: true
    },
    "SURG-LAP-01": {
        code: "SURG-LAP-01",
        procedureName: "Emergency Exploratory Laparotomy",
        category: "GENERAL_SURGERY",
        estimatedDurationMinutes: 120,
        standardFee: 2500.00,
        nhisCovered: true
    },
    "SURG-ORTHO-01": {
        code: "SURG-ORTHO-01",
        procedureName: "Open Reduction & Internal Fixation (ORIF) Long Bone Fracture",
        category: "ORTHOPEDIC",
        estimatedDurationMinutes: 90,
        standardFee: 2200.00,
        nhisCovered: false
    },
    "SURG-CHOLE-01": {
        code: "SURG-CHOLE-01",
        procedureName: "Laparoscopic Cholecystectomy",
        category: "GENERAL_SURGERY",
        estimatedDurationMinutes: 75,
        standardFee: 2000.00,
        nhisCovered: false
    }
};

const STANDARD_PROCEDURES = Object.freeze({
    ...BASE_PROCEDURES,
    "SURG-APP": BASE_PROCEDURES["SURG-APP-01"],
    "SURG-CS": BASE_PROCEDURES["SURG-CS-01"],
    "SURG-HERNIA": BASE_PROCEDURES["SURG-HERN-01"],
    "SURG-LAP": BASE_PROCEDURES["SURG-LAP-01"],
    "SURG-ORIF": BASE_PROCEDURES["SURG-ORTHO-01"],
    "SURG-CHOLE": BASE_PROCEDURES["SURG-CHOLE-01"]
});

/**
 * Evaluate Modified Aldrete Recovery Score for PACU Discharge
 * 
 * Criteria (0 - 2 points each, max 10):
 * 1. Activity: Moves 4 extremities (2), Moves 2 (1), Unable to move (0)
 * 2. Respiration: Breathes deeply and coughs freely (2), Dyspneic/shallow (1), Apneic (0)
 * 3. Circulation: BP within +/- 20% of pre-op (2), +/- 20-49% (1), +/- 50% (0)
 * 4. Consciousness: Fully awake (2), Arousable on calling (1), Not responding (0)
 * 5. O2 Saturation: SpO2 > 92% on room air (2), Needs O2 to maintain SpO2 > 90% (1), SpO2 < 90% (0)
 * 
 * @param {Object} scores
 * @returns {{ totalScore: number, isCleared: boolean, recommendation: string }}
 */
function evaluateAldreteScore(scores = {}) {
    const activity = Math.min(2, Math.max(0, parseInt(scores.aldreteActivity, 10) || 0));
    const respiration = Math.min(2, Math.max(0, parseInt(scores.aldreteRespiration, 10) || 0));
    const circulation = Math.min(2, Math.max(0, parseInt(scores.aldreteCirculation, 10) || 0));
    const consciousness = Math.min(2, Math.max(0, parseInt(scores.aldreteConsciousness, 10) || 0));
    const o2Saturation = Math.min(2, Math.max(0, parseInt(scores.aldreteO2Saturation, 10) || 0));

    const totalScore = activity + respiration + circulation + consciousness + o2Saturation;
    const isCleared = totalScore >= 9;

    return {
        totalScore,
        isCleared,
        recommendation: isCleared
            ? "Patient meets PACU criteria (Aldrete >= 9). Safe for transfer to surgical ward."
            : `Patient Aldrete score (${totalScore}/10) below discharge threshold (< 9). Continue PACU monitoring.`
    };
}

module.exports = {
    STANDARD_THEATRES,
    STANDARD_PROCEDURES,
    evaluateAldreteScore
};
