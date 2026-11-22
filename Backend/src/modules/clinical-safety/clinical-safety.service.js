"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
CLINICAL SAFETY GUARDRAILS SERVICE
Allergy Alerts (Never Disabled), Drug Interactions (Always Active),
and Immutable Clinical Override Audit Logging
LOCATION: Backend/src/modules/clinical-safety/clinical-safety.service.js
====================================================
*/

const prisma = require("../../core/database/prisma.client");
const { ensureDefaultHospitalId } = require("../../core/database/hospital-resolver");
const AppError = require("../../core/errors/app.error");
const {
    IMMUTABLE_SAFETY_GUARDRAILS,
    evaluateClinicalMedicationSafety
} = require("../clinical/helpers/drug-safety.engine");

async function generateOverrideCode() {
    const year = new Date().getFullYear();
    const count = await prisma.clinicalSafetyOverride.count();
    return `OVR-${year}-${String(count + 1).padStart(6, "0")}`;
}

async function resolvePatient(patientIdentifier) {
    if (!patientIdentifier) {
        throw new AppError("Patient ID or MRN is required", 400, "MISSING_PATIENT_ID");
    }
    const patient = await prisma.patient.findFirst({
        where: {
            OR: [{ id: String(patientIdentifier) }, { patientNumber: String(patientIdentifier) }]
        }
    });
    if (!patient) {
        throw new AppError("Patient not found", 404, "PATIENT_NOT_FOUND");
    }
    return patient;
}

async function getGuardrailsStatus() {
    const [
        totalAllergies,
        severeAllergies,
        totalOverrides,
        totalAiSuggestions,
        pendingAiReviews
    ] = await Promise.all([
        prisma.patientAllergy.count({ where: { active: true } }),
        prisma.patientAllergy.count({ where: { active: true, severity: { in: ["HIGH", "SEVERE"] } } }),
        prisma.clinicalSafetyOverride.count(),
        prisma.aiClinicalSuggestion.count(),
        prisma.aiClinicalSuggestion.count({ where: { workflowStatus: { in: ["SUGGESTED", "UNDER_HUMAN_REVIEW"] } } })
    ]);

    return {
        guardrails: IMMUTABLE_SAFETY_GUARDRAILS,
        enforcedByArchitecture: true,
        canBeDisabled: false,
        metrics: {
            activeDocumentedAllergies: totalAllergies,
            severeAllergies,
            loggedClinicalOverrides: totalOverrides,
            totalAiSuggestions,
            pendingHumanAiReviews: pendingAiReviews
        }
    };
}

function rejectGuardrailDisableAttempt(actor, requestedKey) {
    throw new AppError(
        `PATIENT SAFETY GUARDRAIL IMMUTABLE: "${requestedKey || "Clinical Safety Alerts"}" cannot be disabled. Allergy alerts, drug interaction alerts, emergency access, and clinician override logging are permanently active.`,
        403,
        "SAFETY_GUARDRAIL_IMMUTABLE"
    );
}

async function getPatientAllergies(patientIdentifier) {
    const patient = await resolvePatient(patientIdentifier);
    const allergies = await prisma.patientAllergy.findMany({
        where: { patientId: patient.id, active: true },
        orderBy: { createdAt: "desc" }
    });
    return {
        patient: {
            id: patient.id,
            mrn: patient.patientNumber,
            fullName: `${patient.firstName} ${patient.lastName}`
        },
        total: allergies.length,
        allergies
    };
}

async function recordPatientAllergy(patientIdentifier, payload = {}, actor) {
    const patient = await resolvePatient(patientIdentifier);
    const {
        allergyName,
        allergyType = "DRUG",
        severity = "HIGH",
        reaction,
        notes
    } = payload;

    if (!allergyName || !String(allergyName).trim()) {
        throw new AppError("Allergen name is required", 400, "MISSING_ALLERGY_NAME");
    }

    const clinicianName = actor ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() || actor.email : "Clinician";
    const normalizedSeverity = ["MILD", "MODERATE", "HIGH", "SEVERE"].includes(String(severity).toUpperCase())
        ? String(severity).toUpperCase()
        : "HIGH";

    const created = await prisma.$transaction(async (tx) => {
        const allergy = await tx.patientAllergy.create({
            data: {
                patientId: patient.id,
                allergyName: String(allergyName).trim(),
                allergyType: String(allergyType || "DRUG").trim().toUpperCase(),
                severity: normalizedSeverity,
                reaction: reaction ? String(reaction).trim() : null,
                notes: notes ? String(notes).trim() : null,
                status: "ACTIVE",
                recordedBy: clinicianName,
                active: true
            }
        });

        await tx.auditLog.create({
            data: {
                userId: actor?.id || null,
                role: actor?.role || null,
                hospitalId: patient.hospitalId,
                action: "PATIENT_ALLERGY_RECORDED",
                module: "CLINICAL_SAFETY",
                outcome: "SUCCESS",
                affectedRecord: allergy.id,
                description: `Documented ${normalizedSeverity} ${allergy.allergyType} allergy (${allergy.allergyName}) for ${patient.firstName} ${patient.lastName} (${patient.patientNumber})`
            }
        });

        return allergy;
    });

    return created;
}

/**
 * Evaluate proposed medications for a patient against PostgreSQL allergies + active prescriptions/medications
 */
async function checkPatientMedicationSafety({ patientId, proposedMedications = [] }) {
    const patient = await resolvePatient(patientId);

    const [allergies, activePrescriptions, activeMedications] = await Promise.all([
        prisma.patientAllergy.findMany({
            where: { patientId: patient.id, active: true, status: { not: "RESOLVED" } }
        }),
        prisma.patientPrescription.findMany({
            where: {
                encounter: { patientId: patient.id },
                status: { in: ["PENDING", "DISPENSED", "ACTIVE"] }
            },
            orderBy: { createdAt: "desc" },
            take: 25
        }),
        prisma.patientMedication.findMany({
            where: { patientId: patient.id },
            take: 25
        })
    ]);

    const existingMedList = [
        ...activePrescriptions.map((p) => p.medicationName),
        ...activeMedications.map((m) => m.medicationName || m.name)
    ].filter(Boolean);

    const evaluation = evaluateClinicalMedicationSafety({
        proposedMedications,
        patientAllergies: allergies,
        activeMedications: existingMedList
    });

    return {
        patient: {
            id: patient.id,
            mrn: patient.patientNumber,
            fullName: `${patient.firstName} ${patient.lastName}`
        },
        activeAllergiesCount: allergies.length,
        activeMedicationsCount: existingMedList.length,
        ...evaluation
    };
}

/**
 * Persist an immutable clinical safety override audit entry
 */
async function logClinicalSafetyOverride(payload = {}, actor, txClient = null) {
    const db = txClient || prisma;
    const {
        patientId,
        encounterId = null,
        prescriptionId = null,
        alertCategory = "DRUG_INTERACTION",
        severity = "HIGH",
        offendingMedication,
        conflictingAgent,
        alertSummary,
        overrideReason,
        clinicalJustification = null
    } = payload;

    if (!patientId || !offendingMedication || !overrideReason || String(overrideReason).trim().length < 10) {
        throw new AppError(
            "Patient ID, offending medication, and a clinical override reason (at least 10 characters) are mandatory.",
            400,
            "INVALID_OVERRIDE_PAYLOAD"
        );
    }

    const patient = await db.patient.findFirst({
        where: { OR: [{ id: String(patientId) }, { patientNumber: String(patientId) }] }
    });
    if (!patient) {
        throw new AppError("Patient not found for safety override", 404, "PATIENT_NOT_FOUND");
    }

    const hospitalId = patient.hospitalId || (await ensureDefaultHospitalId());
    const overrideCode = await generateOverrideCode();
    const clinicianName = actor ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() || actor.email : "Licensed Clinician";

    const record = await db.clinicalSafetyOverride.create({
        data: {
            overrideCode,
            hospitalId,
            patientId: patient.id,
            encounterId,
            prescriptionId,
            clinicianId: actor?.id || null,
            clinicianName,
            clinicianRole: actor?.role || null,
            alertCategory: String(alertCategory).toUpperCase(),
            severity: String(severity).toUpperCase(),
            offendingMedication: String(offendingMedication).trim(),
            conflictingAgent: String(conflictingAgent || "Documented Safety Conflict").trim(),
            alertSummary: String(alertSummary || "High-severity clinical safety conflict overridden by licensed clinician").trim(),
            overrideReason: String(overrideReason).trim(),
            clinicalJustification: clinicalJustification ? String(clinicalJustification).trim() : null,
            status: "OVERRIDDEN_WITH_AUDIT"
        }
    });

    await db.auditLog.create({
        data: {
            userId: actor?.id || null,
            role: actor?.role || null,
            hospitalId,
            action: "CLINICAL_SAFETY_OVERRIDE_LOGGED",
            module: "CLINICAL_SAFETY",
            outcome: "SUCCESS",
            affectedRecord: record.id,
            description: `[${overrideCode}] ${clinicianName} (${actor?.role || "CLINICIAN"}) overrode ${record.severity} ${record.alertCategory} alert for ${record.offendingMedication} vs ${record.conflictingAgent}. Reason: ${record.overrideReason}`
        }
    });

    return record;
}

async function listClinicalSafetyOverrides({ patientId, alertCategory, limit = 50 } = {}) {
    const where = {};
    if (patientId) where.patientId = patientId;
    if (alertCategory) where.alertCategory = String(alertCategory).toUpperCase();

    const overrides = await prisma.clinicalSafetyOverride.findMany({
        where,
        include: {
            patient: {
                select: { id: true, patientNumber: true, firstName: true, lastName: true }
            }
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit) || 50, 150)
    });

    return {
        total: overrides.length,
        overrides
    };
}

module.exports = {
    getGuardrailsStatus,
    rejectGuardrailDisableAttempt,
    getPatientAllergies,
    recordPatientAllergy,
    checkPatientMedicationSafety,
    logClinicalSafetyOverride,
    listClinicalSafetyOverrides
};
