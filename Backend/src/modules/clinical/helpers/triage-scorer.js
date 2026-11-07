"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
CLINICAL TRIAGE SCORER & VITAL SIGNS ANALYSIS
Adult NEWS2 (National Early Warning Score 2) & BMI Engine
LOCATION: src/modules/clinical/helpers/triage-scorer.js
====================================================
*/

/**
 * Calculate Body Mass Index (BMI) and WHO classification
 * @param {number} weightKg - Patient weight in kg
 * @param {number} heightCm - Patient height in cm
 * @returns {{ bmi: number, category: string }}
 */
function calculateBMI(weightKg, heightCm) {
    if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
        return { bmi: null, category: "NOT_CALCULATED" };
    }

    const heightM = heightCm / 100;
    const rawBmi = weightKg / (heightM * heightM);
    const bmi = Math.round(rawBmi * 10) / 10;

    let category = "NORMAL";
    if (bmi < 18.5) {
        category = "UNDERWEIGHT";
    } else if (bmi >= 18.5 && bmi < 25.0) {
        category = "NORMAL";
    } else if (bmi >= 25.0 && bmi < 30.0) {
        category = "OVERWEIGHT";
    } else if (bmi >= 30.0 && bmi < 35.0) {
        category = "OBESE_CLASS_I";
    } else if (bmi >= 35.0 && bmi < 40.0) {
        category = "OBESE_CLASS_II";
    } else {
        category = "OBESE_CLASS_III";
    }

    return { bmi, category };
}

/**
 * Calculate NEWS2 (National Early Warning Score 2)
 * UK Royal College of Physicians standard physiological scoring
 * 
 * Physiological parameters evaluated:
 * 1. Respiration Rate (breaths/min)
 * 2. Oxygen Saturation SpO2 (%)
 * 3. Systolic Blood Pressure (mmHg)
 * 4. Pulse / Heart Rate (bpm)
 * 5. Level of Consciousness (AVPU scale)
 * 6. Body Temperature (°C)
 * 
 * @param {Object} vitals
 * @returns {{ news2Score: number, riskCategory: string, parameterBreakdown: Object, triggersImmediateEscalation: boolean }}
 */
function calculateNEWS2(vitals = {}) {
    const {
        respiratoryRate,
        oxygenSaturation,
        systolicBP,
        pulseRate,
        consciousness = "ALERT",
        temperature
    } = vitals;

    const breakdown = {
        respiratoryRate: 0,
        oxygenSaturation: 0,
        systolicBP: 0,
        pulseRate: 0,
        consciousness: 0,
        temperature: 0
    };

    // 1. Respiration Rate (breaths/min)
    if (respiratoryRate != null) {
        const rr = Number(respiratoryRate);
        if (rr <= 8) breakdown.respiratoryRate = 3;
        else if (rr >= 9 && rr <= 11) breakdown.respiratoryRate = 1;
        else if (rr >= 12 && rr <= 20) breakdown.respiratoryRate = 0;
        else if (rr >= 21 && rr <= 24) breakdown.respiratoryRate = 2;
        else if (rr >= 25) breakdown.respiratoryRate = 3;
    }

    // 2. Oxygen Saturation SpO2 (%)
    if (oxygenSaturation != null) {
        const spo2 = Number(oxygenSaturation);
        if (spo2 <= 91) breakdown.oxygenSaturation = 3;
        else if (spo2 >= 92 && spo2 <= 93) breakdown.oxygenSaturation = 2;
        else if (spo2 >= 94 && spo2 <= 95) breakdown.oxygenSaturation = 1;
        else if (spo2 >= 96) breakdown.oxygenSaturation = 0;
    }

    // 3. Systolic Blood Pressure (mmHg)
    if (systolicBP != null) {
        const sbp = Number(systolicBP);
        if (sbp <= 90) breakdown.systolicBP = 3;
        else if (sbp >= 91 && sbp <= 100) breakdown.systolicBP = 2;
        else if (sbp >= 101 && sbp <= 110) breakdown.systolicBP = 1;
        else if (sbp >= 111 && sbp <= 219) breakdown.systolicBP = 0;
        else if (sbp >= 220) breakdown.systolicBP = 3;
    }

    // 4. Pulse / Heart Rate (bpm)
    if (pulseRate != null) {
        const hr = Number(pulseRate);
        if (hr <= 40) breakdown.pulseRate = 3;
        else if (hr >= 41 && hr <= 50) breakdown.pulseRate = 1;
        else if (hr >= 51 && hr <= 90) breakdown.pulseRate = 0;
        else if (hr >= 91 && hr <= 110) breakdown.pulseRate = 1;
        else if (hr >= 111 && hr <= 130) breakdown.pulseRate = 2;
        else if (hr >= 131) breakdown.pulseRate = 3;
    }

    // 5. Level of Consciousness (AVPU: Alert, Voice, Pain, Unresponsive)
    const normalizedConsciousness = String(consciousness || "ALERT").trim().toUpperCase();
    if (["A", "ALERT"].includes(normalizedConsciousness)) {
        breakdown.consciousness = 0;
    } else if (["V", "VOICE", "P", "PAIN", "U", "UNRESPONSIVE", "CONFUSED", "CVPU"].includes(normalizedConsciousness)) {
        breakdown.consciousness = 3;
    }

    // 6. Body Temperature (°C)
    if (temperature != null) {
        const temp = Number(temperature);
        if (temp <= 35.0) breakdown.temperature = 3;
        else if (temp >= 35.1 && temp <= 36.0) breakdown.temperature = 1;
        else if (temp >= 36.1 && temp <= 38.0) breakdown.temperature = 0;
        else if (temp >= 38.1 && temp <= 39.0) breakdown.temperature = 1;
        else if (temp >= 39.1) breakdown.temperature = 2;
    }

    const news2Score = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    // Has individual red score (a score of 3 in any single parameter)?
    const hasSingleRedScore = Object.values(breakdown).some(val => val >= 3);

    let riskCategory = "LOW";
    if (news2Score >= 7) {
        riskCategory = "CRITICAL";
    } else if (news2Score >= 5 || hasSingleRedScore) {
        riskCategory = "MEDIUM";
    } else if (news2Score >= 1) {
        riskCategory = "LOW";
    } else {
        riskCategory = "ROUTINE";
    }

    const triggersImmediateEscalation = news2Score >= 7 || hasSingleRedScore;

    return {
        news2Score,
        riskCategory,
        parameterBreakdown: breakdown,
        triggersImmediateEscalation
    };
}

module.exports = {
    calculateBMI,
    calculateNEWS2
};
