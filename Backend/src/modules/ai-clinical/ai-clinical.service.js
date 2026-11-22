"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
AI CLINICAL ASSISTANCE SERVICE (MANDATORY HUMAN APPROVAL WORKFLOW)
Master Blueprint Workflow:
1. Suggest -> 2. Review by Human -> 3. Override -> 4. Final Decision
"All outputs are recommendations only. Final decision requires a licensed clinician."
LOCATION: Backend/src/modules/ai-clinical/ai-clinical.service.js
====================================================
*/

const prisma = require("../../core/database/prisma.client");
const { ensureDefaultHospitalId } = require("../../core/database/hospital-resolver");
const AppError = require("../../core/errors/app.error");
const { evaluateClinicalMedicationSafety } = require("../clinical/helpers/drug-safety.engine");
const { evaluateIcuVitals } = require("../icu/icu.service");
const { logClinicalSafetyOverride } = require("../clinical-safety/clinical-safety.service");

const MANDATORY_DISCLAIMER = "All outputs are recommendations only. Final decision requires a licensed clinician.";

const SUPPORTED_ASSISTANTS = [
    "TRIAGE_ASSISTANT",
    "DIAGNOSIS_SUGGESTIONS",
    "TREATMENT_SUGGESTIONS",
    "DRUG_INTERACTION_CHECK",
    "CLINICAL_SUMMARIZATION",
    "RISK_PREDICTION"
];

const DIFFERENTIAL_RULES = [
    {
        keywords: ["fever", "chills", "rigors", "headache", "malaria"],
        icd10: "B50.9",
        condition: "Plasmodium falciparum Malaria (Suspected)",
        workup: "Rapid Diagnostic Test (RDT) / Blood Film for Malaria Parasites, FBC",
        firstLine: "Artemether-Lumefantrine (check QTc/drug interactions)"
    },
    {
        keywords: ["chest pain", "shortness of breath", "dyspnea", "sweating", "radiating"],
        icd10: "I21.9",
        condition: "Acute Coronary Syndrome / Angina (Rule Out)",
        workup: "Immediate 12-lead ECG, Serial High-Sensitivity Troponin, Chest X-Ray",
        firstLine: "Urgent Cardiology escalation, Oxygen if SpO2 < 94%, Aspirin (verify no allergy/bleed)"
    },
    {
        keywords: ["cough", "sputum", "fever", "crackles", "pneumonia", "breathless"],
        icd10: "J18.9",
        condition: "Community-Acquired Pneumonia",
        workup: "Chest X-Ray, FBC, CRP, Sputum Culture, SpO2 monitoring",
        firstLine: "Amoxicillin or Azithromycin (verify Penicillin allergy before beta-lactam)"
    },
    {
        keywords: ["hypertension", "high blood pressure", "headache", "blurred vision", "bp"],
        icd10: "I10",
        condition: "Essential / Uncontrolled Hypertension",
        workup: "Repeat BP measurement, Renal Function (U&E/Cr), Urinalysis, Funduscopy, ECG",
        firstLine: "Amlodipine or Lisinopril (check potassium & pregnancy status)"
    },
    {
        keywords: ["abdominal pain", "vomiting", "diarrhea", "dehydration", "nausea"],
        icd10: "A09",
        condition: "Acute Gastroenteritis / Intra-Abdominal Pathology",
        workup: "Electrolytes, Stool R/E, Abdominal Ultrasound if focal tenderness",
        firstLine: "Oral/IV rehydration therapy, electrolyte replacement, antiemetic if indicated"
    },
    {
        keywords: ["dysuria", "frequency", "flank pain", "uti", "burning urination"],
        icd10: "N39.0",
        condition: "Urinary Tract Infection / Acute Pyelonephritis",
        workup: "Urine R/E & Culture/Sensitivity, Renal Function if febrile",
        firstLine: "Nitrofurantoin or Cefuroxime guided by culture & allergy profile"
    },
    {
        keywords: ["polyuria", "polydipsia", "hyperglycemia", "diabetes", "high sugar"],
        icd10: "E11.9",
        condition: "Type 2 Diabetes Mellitus / Glycemic Decompensation",
        workup: "Random/Fasting Blood Glucose, HbA1c, Urine Ketones, U&E",
        firstLine: "Metformin (verify eGFR >= 30 & no contrast imaging scheduled) + lifestyle/glycemic titration"
    }
];

async function generateSuggestionCode() {
    const year = new Date().getFullYear();
    const count = await prisma.aiClinicalSuggestion.count();
    return `AIC-${year}-${String(count + 1).padStart(6, "0")}`;
}

async function resolvePatientWithClinicalContext(patientIdentifier) {
    if (!patientIdentifier) {
        throw new AppError("Patient ID or MRN is required", 400, "MISSING_PATIENT_ID");
    }
    const patient = await prisma.patient.findFirst({
        where: {
            OR: [{ id: String(patientIdentifier) }, { patientNumber: String(patientIdentifier) }]
        },
        include: {
            allergies: { where: { active: true } },
            vitalSigns: { orderBy: { recordedAt: "desc" }, take: 5 },
            icuMonitoringRecords: { orderBy: { recordedAt: "desc" }, take: 5 },
            patientEncounters: {
                orderBy: { visitDate: "desc" },
                take: 5,
                include: {
                    diagnoses: true,
                    prescriptions: true,
                    laboratoryRequests: true
                }
            }
        }
    });
    if (!patient) {
        throw new AppError("Patient not found", 404, "PATIENT_NOT_FOUND");
    }
    return patient;
}

async function getAiClinicalTelemetry() {
    const [
        totalSuggestions,
        awaitingReview,
        approvedCount,
        overriddenCount,
        rejectedCount,
        finalDecisionsRecorded
    ] = await Promise.all([
        prisma.aiClinicalSuggestion.count(),
        prisma.aiClinicalSuggestion.count({ where: { workflowStatus: { in: ["SUGGESTED", "UNDER_HUMAN_REVIEW"] } } }),
        prisma.aiClinicalSuggestion.count({ where: { humanDecision: "APPROVE" } }),
        prisma.aiClinicalSuggestion.count({ where: { humanDecision: "OVERRIDE" } }),
        prisma.aiClinicalSuggestion.count({ where: { humanDecision: "REJECT" } }),
        prisma.aiClinicalSuggestion.count({ where: { workflowStatus: "FINAL_DECISION_RECORDED" } })
    ]);

    return {
        totalSuggestions,
        awaitingReview,
        approvedCount,
        overriddenCount,
        rejectedCount,
        finalDecisionsRecorded,
        humanApprovalMandatory: true,
        disclaimer: MANDATORY_DISCLAIMER,
        supportedAssistants: SUPPORTED_ASSISTANTS
    };
}

async function listSuggestions({ patientId, assistantType, workflowStatus, limit = 50 } = {}) {
    const where = {};
    if (patientId) where.patientId = patientId;
    if (assistantType) where.assistantType = String(assistantType).toUpperCase();
    if (workflowStatus) where.workflowStatus = String(workflowStatus).toUpperCase();

    const suggestions = await prisma.aiClinicalSuggestion.findMany({
        where,
        include: {
            patient: {
                select: { id: true, patientNumber: true, firstName: true, lastName: true, gender: true }
            }
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit) || 50, 150)
    });

    return {
        total: suggestions.length,
        disclaimer: MANDATORY_DISCLAIMER,
        suggestions
    };
}

/**
 * Step 1: Generate evidence-based clinical AI recommendation from live PostgreSQL records.
 * Strictly advisory (workflowStatus = "SUGGESTED") until licensed clinician reviews & decides.
 */
async function generateClinicalSuggestion(payload = {}, actor) {
    const assistantType = String(payload.assistantType || "TRIAGE_ASSISTANT").trim().toUpperCase();
    if (!SUPPORTED_ASSISTANTS.includes(assistantType)) {
        throw new AppError(
            `Unsupported AI clinical assistant type. Supported: ${SUPPORTED_ASSISTANTS.join(", ")}`,
            400,
            "INVALID_ASSISTANT_TYPE"
        );
    }

    const patient = await resolvePatientWithClinicalContext(payload.patientId);
    const symptomsText = String(payload.symptoms || payload.chiefComplaint || payload.clinicalNotes || "").trim();
    const proposedMedications = Array.isArray(payload.proposedMedications) ? payload.proposedMedications : [];

    const latestVitals = payload.vitals || patient.vitalSigns[0] || patient.icuMonitoringRecords[0] || {};
    const activeAllergies = patient.allergies || [];
    const recentEncounters = patient.patientEncounters || [];
    const recentDiagnoses = recentEncounters.flatMap((e) => e.diagnoses || []);
    const recentPrescriptions = recentEncounters.flatMap((e) => e.prescriptions || []);

    let recommendationSummary = "";
    let recommendations = [];
    let riskLevel = "MODERATE";
    let confidenceScore = 0.84;

    if (assistantType === "TRIAGE_ASSISTANT") {
        const evalVitals = evaluateIcuVitals({
            heartRateBpm: latestVitals.heartRateBpm ?? latestVitals.pulseRate,
            systolicBP: latestVitals.systolicBP,
            diastolicBP: latestVitals.diastolicBP,
            oxygenSaturationPct: latestVitals.oxygenSaturationPct ?? latestVitals.oxygenSaturation,
            respiratoryRate: latestVitals.respiratoryRate,
            temperatureC: latestVitals.temperatureC ?? latestVitals.temperature,
            glasgowComaScale: latestVitals.glasgowComaScale ?? payload.gcs
        });
        const symptomLower = symptomsText.toLowerCase();
        const redFlag = /(chest pain|unconscious|seizure|stroke|severe bleed|anaphylaxis|shortness of breath)/.test(symptomLower);
        const acuity =
            evalVitals.alertLevel === "CRITICAL" || redFlag
                ? "RED — IMMEDIATE RESUSCITATION / EMERGENCY"
                : evalVitals.alertLevel === "WARNING"
                    ? "ORANGE — URGENT PHYSICIAN REVIEW (<= 15 MIN)"
                    : "GREEN — STANDARD OPD QUEUE";

        riskLevel = evalVitals.alertLevel === "CRITICAL" || redFlag ? "CRITICAL" : evalVitals.alertLevel === "WARNING" ? "HIGH" : "LOW";
        confidenceScore = 0.91;
        recommendationSummary = `Suggested Triage Acuity: ${acuity} (Adult NEWS2 Score: ${evalVitals.news2Score}, Active Alerts: ${evalVitals.triggeredAlerts.length}).`;
        recommendations = [
            { title: "Recommended Acuity Level", detail: acuity, priority: riskLevel },
            ...evalVitals.triggeredAlerts.map((a) => ({ title: `Vital Alert: ${a.parameter}`, detail: a.message, priority: a.severity })),
            { title: "Allergy Awareness", detail: activeAllergies.length > 0 ? `Patient has ${activeAllergies.length} active allergy record(s): ${activeAllergies.map((al) => al.allergyName).join(", ")}.` : "No active allergies recorded in PostgreSQL — verify verbally at triage.", priority: "INFO" }
        ];
    } else if (assistantType === "DIAGNOSIS_SUGGESTIONS") {
        const combinedText = `${symptomsText} ${recentEncounters.map((e) => e.chiefComplaint || "").join(" ")}`.toLowerCase();
        const matched = DIFFERENTIAL_RULES.filter((rule) => rule.keywords.some((kw) => combinedText.includes(kw)));
        if (matched.length === 0) {
            recommendations = [
                {
                    title: "Broad Clinical Evaluation Recommended",
                    icd10: "R69",
                    detail: "Input symptoms did not match a narrow high-probability syndrome. Obtain full history, vital signs, FBC, and targeted diagnostics.",
                    priority: "MODERATE"
                }
            ];
            riskLevel = "MODERATE";
            confidenceScore = 0.72;
        } else {
            recommendations = matched.map((m) => ({
                title: `${m.condition} (${m.icd10})`,
                icd10: m.icd10,
                detail: `Recommended workup: ${m.workup}`,
                priority: m.icd10 === "I21.9" ? "CRITICAL" : "HIGH"
            }));
            riskLevel = matched.some((m) => m.icd10 === "I21.9") ? "CRITICAL" : "HIGH";
            confidenceScore = 0.87;
        }
        recommendationSummary = `Generated ${recommendations.length} differential diagnosis recommendation(s) based on clinical findings and EHR history. Clinician confirmation mandatory.`;
    } else if (assistantType === "TREATMENT_SUGGESTIONS") {
        const combinedText = `${symptomsText} ${recentDiagnoses.map((d) => d.diagnosisName).join(" ")}`.toLowerCase();
        const matched = DIFFERENTIAL_RULES.filter((rule) => rule.keywords.some((kw) => combinedText.includes(kw)));
        const safetyCheck = evaluateClinicalMedicationSafety({
            proposedMedications: proposedMedications.length > 0 ? proposedMedications : matched.map((m) => m.firstLine),
            patientAllergies: activeAllergies,
            activeMedications: recentPrescriptions.map((p) => p.medicationName)
        });

        recommendations = [
            ...(matched.length > 0
                ? matched.map((m) => ({ title: `Guideline Option — ${m.condition}`, detail: m.firstLine, priority: "HIGH" }))
                : [{ title: "Supportive & Diagnostic-Guided Care", detail: "Confirm definitive diagnosis before initiating targeted pharmacotherapy; maintain hydration and vital monitoring.", priority: "MODERATE" }]),
            ...safetyCheck.alerts.map((al) => ({ title: `SAFETY WARNING (${al.severity})`, detail: `${al.summary} ${al.recommendation}`, priority: al.severity }))
        ];
        riskLevel = safetyCheck.blockingAlertsCount > 0 ? "CRITICAL" : "MODERATE";
        confidenceScore = 0.86;
        recommendationSummary = `Prepared ${recommendations.length} evidence-based treatment consideration(s) cross-checked against ${activeAllergies.length} patient allergy record(s) and ${recentPrescriptions.length} prior prescriptions.`;
    } else if (assistantType === "DRUG_INTERACTION_CHECK") {
        const evalSafety = evaluateClinicalMedicationSafety({
            proposedMedications,
            patientAllergies: activeAllergies,
            activeMedications: recentPrescriptions.map((p) => p.medicationName)
        });
        riskLevel = evalSafety.highestSeverity === "CONTRAINDICATED" ? "CRITICAL" : evalSafety.highestSeverity === "HIGH" ? "HIGH" : evalSafety.highestSeverity === "MODERATE" ? "MODERATE" : "LOW";
        confidenceScore = 0.96;
        recommendationSummary = evalSafety.totalAlerts === 0
            ? "No high-risk drug-drug interactions or documented allergy conflicts detected across proposed and active therapies."
            : `Detected ${evalSafety.totalAlerts} medication safety alert(s) (${evalSafety.blockingAlertsCount} requiring explicit clinician override).`;
        recommendations = evalSafety.alerts.length > 0
            ? evalSafety.alerts.map((a) => ({ title: `${a.category} — ${a.offendingMedication} vs ${a.conflictingAgent}`, detail: `${a.summary} Recommendation: ${a.recommendation}`, priority: a.severity }))
            : [{ title: "Medication Profile Clear", detail: "Proceed with standard weight/renal dosing verification.", priority: "LOW" }];
    } else if (assistantType === "CLINICAL_SUMMARIZATION") {
        const diagList = recentDiagnoses.slice(0, 5).map((d) => `${d.diagnosisName}${d.diagnosisCode ? ` (${d.diagnosisCode})` : ""}`);
        const rxList = recentPrescriptions.slice(0, 6).map((p) => `${p.medicationName} ${p.dosage || ""}`.trim());
        const allergyList = activeAllergies.map((a) => `${a.allergyName} (${a.severity})`);
        riskLevel = activeAllergies.some((a) => ["SEVERE", "HIGH"].includes(a.severity)) ? "HIGH" : "LOW";
        confidenceScore = 0.93;
        recommendationSummary = `SBAR Clinical Summary for ${patient.firstName} ${patient.lastName} (${patient.patientNumber}): ${recentEncounters.length} recent encounter(s), ${diagList.length} diagnosis entries, ${rxList.length} prescription(s), ${allergyList.length} active allergy alert(s).`;
        recommendations = [
            { title: "S — Situation", detail: symptomsText || recentEncounters[0]?.chiefComplaint || "Routine clinical review / ongoing hospital care.", priority: "INFO" },
            { title: "B — Background & Diagnoses", detail: diagList.length > 0 ? diagList.join("; ") : "No prior diagnoses recorded.", priority: "INFO" },
            { title: "A — Assessment, Allergies & Medications", detail: `Allergies: ${allergyList.length > 0 ? allergyList.join(", ") : "None documented"} | Recent Meds: ${rxList.length > 0 ? rxList.join(", ") : "None recorded"}.`, priority: allergyList.length > 0 ? "HIGH" : "INFO" },
            { title: "R — Recommended Handoff Review", detail: "Licensed clinician to verify allergies, pending lab results, and discharge/follow-up plan.", priority: "MODERATE" }
        ];
    } else if (assistantType === "RISK_PREDICTION") {
        const evalVitals = evaluateIcuVitals({
            heartRateBpm: latestVitals.heartRateBpm ?? latestVitals.pulseRate,
            systolicBP: latestVitals.systolicBP,
            diastolicBP: latestVitals.diastolicBP,
            oxygenSaturationPct: latestVitals.oxygenSaturationPct ?? latestVitals.oxygenSaturation,
            respiratoryRate: latestVitals.respiratoryRate,
            temperatureC: latestVitals.temperatureC ?? latestVitals.temperature,
            glasgowComaScale: latestVitals.glasgowComaScale ?? 15
        });
        const polypharmacyRisk = recentPrescriptions.length >= 5;
        const deteriorationScore = Math.min(100, evalVitals.news2Score * 11 + (polypharmacyRisk ? 15 : 0) + (activeAllergies.length >= 2 ? 10 : 0));
        riskLevel = deteriorationScore >= 65 ? "CRITICAL" : deteriorationScore >= 35 ? "HIGH" : "LOW";
        confidenceScore = 0.88;
        recommendationSummary = `Composite Clinical Risk Score: ${deteriorationScore}/100 (${riskLevel}) — NEWS2=${evalVitals.news2Score}, Active Meds=${recentPrescriptions.length}, Documented Allergies=${activeAllergies.length}.`;
        recommendations = [
            { title: "Clinical Deterioration / Sepsis Screening", detail: `NEWS2=${evalVitals.news2Score}. ${evalVitals.news2Score >= 5 ? "Escalate immediately for physician bedside assessment & sepsis bundle screening." : "Continue standard scheduled vital observations."}`, priority: riskLevel },
            { title: "Polypharmacy & Medication Safety Risk", detail: polypharmacyRisk ? `${recentPrescriptions.length} prescriptions recorded — pharmacist medication reconciliation advised.` : "Medication burden within standard threshold.", priority: polypharmacyRisk ? "HIGH" : "LOW" }
        ];
    }

    const hospitalId = patient.hospitalId || (await ensureDefaultHospitalId());
    const suggestionCode = await generateSuggestionCode();
    const requesterName = actor ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() || actor.email : "Clinician";

    const created = await prisma.$transaction(async (tx) => {
        const record = await tx.aiClinicalSuggestion.create({
            data: {
                suggestionCode,
                hospitalId,
                patientId: patient.id,
                encounterId: payload.encounterId || recentEncounters[0]?.id || null,
                requestedById: actor?.id || null,
                requestedByName: requesterName,
                requestedByRole: actor?.role || null,
                assistantType,
                inputContext: {
                    symptoms: symptomsText,
                    proposedMedications,
                    vitalsSnapshot: latestVitals || null
                },
                recommendationSummary,
                recommendations,
                confidenceScore,
                riskLevel,
                disclaimer: MANDATORY_DISCLAIMER,
                workflowStatus: "SUGGESTED"
            },
            include: {
                patient: {
                    select: { id: true, patientNumber: true, firstName: true, lastName: true }
                }
            }
        });

        await tx.auditLog.create({
            data: {
                userId: actor?.id || null,
                role: actor?.role || null,
                hospitalId,
                action: "AI_CLINICAL_SUGGESTION_GENERATED",
                module: "AI_CLINICAL",
                outcome: "SUCCESS",
                affectedRecord: record.id,
                description: `[${suggestionCode}] Generated advisory ${assistantType} suggestion for ${patient.firstName} ${patient.lastName} (Risk: ${riskLevel}). Awaiting licensed clinician review.`
            }
        });

        return record;
    });

    return created;
}

/**
 * Steps 2 & 3: Licensed Clinician Review / Approve / Override / Reject
 */
async function reviewClinicalSuggestion(id, payload = {}, actor) {
    const existing = await prisma.aiClinicalSuggestion.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("AI clinical suggestion not found", 404, "AI_SUGGESTION_NOT_FOUND");
    }

    const decision = String(payload.decision || "APPROVE").trim().toUpperCase();
    if (!["APPROVE", "OVERRIDE", "REJECT", "REVIEWING"].includes(decision)) {
        throw new AppError("Decision must be APPROVE, OVERRIDE, REJECT, or REVIEWING", 400, "INVALID_REVIEW_DECISION");
    }

    if (decision === "OVERRIDE" && (!payload.overrideNotes || String(payload.overrideNotes).trim().length < 10)) {
        throw new AppError(
            "Overriding an AI clinical suggestion requires documented clinical override notes (at least 10 characters).",
            400,
            "OVERRIDE_NOTES_REQUIRED"
        );
    }

    const workflowStatus =
        decision === "APPROVE"
            ? "APPROVED"
            : decision === "OVERRIDE"
                ? "OVERRIDDEN"
                : decision === "REJECT"
                    ? "REJECTED"
                    : "UNDER_HUMAN_REVIEW";

    const reviewerName = actor ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() || actor.email : "Licensed Clinician";

    const updated = await prisma.$transaction(async (tx) => {
        const rec = await tx.aiClinicalSuggestion.update({
            where: { id },
            data: {
                workflowStatus,
                humanDecision: decision === "REVIEWING" ? null : decision,
                reviewedById: actor?.id || null,
                reviewedByName: reviewerName,
                reviewedByRole: actor?.role || null,
                reviewedAt: new Date(),
                overrideNotes: payload.overrideNotes ? String(payload.overrideNotes).trim() : existing.overrideNotes
            },
            include: {
                patient: {
                    select: { id: true, patientNumber: true, firstName: true, lastName: true }
                }
            }
        });

        if (decision === "OVERRIDE") {
            await logClinicalSafetyOverride(
                {
                    patientId: existing.patientId,
                    encounterId: existing.encounterId,
                    alertCategory: "AI_RECOMMENDATION",
                    severity: existing.riskLevel === "CRITICAL" ? "HIGH" : "MODERATE",
                    offendingMedication: existing.assistantType,
                    conflictingAgent: existing.suggestionCode,
                    alertSummary: existing.recommendationSummary,
                    overrideReason: String(payload.overrideNotes).trim()
                },
                actor,
                tx
            );
        }

        await tx.auditLog.create({
            data: {
                userId: actor?.id || null,
                role: actor?.role || null,
                hospitalId: existing.hospitalId,
                action: `AI_CLINICAL_HUMAN_${decision}`,
                module: "AI_CLINICAL",
                outcome: "SUCCESS",
                affectedRecord: rec.id,
                description: `[${existing.suggestionCode}] Licensed clinician ${reviewerName} (${actor?.role}) recorded ${decision}${payload.overrideNotes ? ` — Notes: ${payload.overrideNotes}` : ""}`
            }
        });

        return rec;
    });

    return updated;
}

/**
 * Step 4: Final Binding Clinical Decision by Licensed Clinician
 */
async function recordFinalClinicalDecision(id, payload = {}, actor) {
    const existing = await prisma.aiClinicalSuggestion.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("AI clinical suggestion not found", 404, "AI_SUGGESTION_NOT_FOUND");
    }

    if (!existing.reviewedById && !payload.humanDecision) {
        throw new AppError(
            "Mandatory Human Approval Workflow: Suggestion must undergo human clinician review before recording a Final Decision.",
            409,
            "HUMAN_REVIEW_REQUIRED_FIRST"
        );
    }

    const finalDecisionText = String(payload.finalDecisionText || "").trim();
    if (finalDecisionText.length < 5) {
        throw new AppError("A documented Final Clinical Decision is required.", 400, "FINAL_DECISION_REQUIRED");
    }

    const clinicianName = actor ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() || actor.email : "Licensed Clinician";

    const updated = await prisma.$transaction(async (tx) => {
        const rec = await tx.aiClinicalSuggestion.update({
            where: { id },
            data: {
                workflowStatus: "FINAL_DECISION_RECORDED",
                humanDecision: existing.humanDecision || String(payload.humanDecision || "APPROVE").toUpperCase(),
                reviewedById: existing.reviewedById || actor?.id || null,
                reviewedByName: existing.reviewedByName || clinicianName,
                reviewedByRole: existing.reviewedByRole || actor?.role || null,
                reviewedAt: existing.reviewedAt || new Date(),
                finalDecisionText,
                finalDecidedById: actor?.id || null,
                finalDecidedByName: clinicianName,
                finalDecidedByRole: actor?.role || null,
                finalDecidedAt: new Date()
            },
            include: {
                patient: {
                    select: { id: true, patientNumber: true, firstName: true, lastName: true }
                }
            }
        });

        await tx.auditLog.create({
            data: {
                userId: actor?.id || null,
                role: actor?.role || null,
                hospitalId: existing.hospitalId,
                action: "AI_CLINICAL_FINAL_DECISION_RECORDED",
                module: "AI_CLINICAL",
                outcome: "SUCCESS",
                affectedRecord: rec.id,
                description: `[${existing.suggestionCode}] Final clinical decision signed by ${clinicianName} (${actor?.role}): ${finalDecisionText}`
            }
        });

        return rec;
    });

    return updated;
}

module.exports = {
    MANDATORY_DISCLAIMER,
    SUPPORTED_ASSISTANTS,
    getAiClinicalTelemetry,
    listSuggestions,
    generateClinicalSuggestion,
    reviewClinicalSuggestion,
    recordFinalClinicalDecision
};
