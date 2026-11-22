"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
DENTAL CLINIC & ORAL SURGERY SERVICE (DENTIST)
FDI 32-Tooth Odontogram, Treatments, Procedures & Oral Surgery
LOCATION: Backend/src/modules/dental/dental.service.js
====================================================
*/

const prisma = require("../../core/database/prisma.client");
const { ensureDefaultHospitalId } = require("../../core/database/hospital-resolver");
const AppError = require("../../core/errors/app.error");

const FDI_ADULT_TEETH = [
    "18", "17", "16", "15", "14", "13", "12", "11",
    "21", "22", "23", "24", "25", "26", "27", "28",
    "48", "47", "46", "45", "44", "43", "42", "41",
    "31", "32", "33", "34", "35", "36", "37", "38"
];

const DENTAL_PROCEDURE_CATALOG = [
    { code: "DEN-001", name: "Comprehensive Oral Examination & Odontogram", category: "PREVENTIVE" },
    { code: "DEN-002", name: "Ultrasonic Scaling & Polishing", category: "PREVENTIVE" },
    { code: "DEN-003", name: "Composite Resin Filling (Restorative)", category: "RESTORATIVE" },
    { code: "DEN-004", name: "Root Canal Therapy (Endodontic Treatment)", category: "ENDODONTICS" },
    { code: "DEN-005", name: "Porcelain / Zirconia Crown Placement", category: "PROSTHODONTICS" },
    { code: "DEN-006", name: "Simple Tooth Extraction", category: "ORAL_SURGERY" },
    { code: "DEN-007", name: "Surgical Impacted Wisdom Tooth Extraction", category: "ORAL_SURGERY" },
    { code: "DEN-008", name: "Periodontal Deep Curettage & Flap Surgery", category: "PERIODONTICS" },
    { code: "DEN-009", name: "Orthodontic Braces Evaluation & Adjustment", category: "ORTHODONTICS" }
];

async function generateDentalRecordNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.dentalRecord.count();
    return `DEN-${year}-${String(count + 1).padStart(6, "0")}`;
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

async function getDentalTelemetry() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const totalRecords = await prisma.dentalRecord.count();
    const todayRecords = await prisma.dentalRecord.count({ where: { createdAt: { gte: startOfDay } } });
    const oralSurgeryCases = await prisma.dentalRecord.count({ where: { category: "ORAL_SURGERY" } });
    const inProgressCases = await prisma.dentalRecord.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } });

    return {
        totalRecords,
        todayRecords,
        oralSurgeryCases,
        inProgressCases,
        fdiTeethCount: FDI_ADULT_TEETH.length,
        procedureCatalog: DENTAL_PROCEDURE_CATALOG
    };
}

async function listDentalRecords({ patientId, category, status, limit = 50 } = {}) {
    const where = {};
    if (patientId) where.patientId = patientId;
    if (category) where.category = String(category).toUpperCase();
    if (status) where.status = String(status).toUpperCase();

    const records = await prisma.dentalRecord.findMany({
        where,
        include: {
            patient: {
                select: { id: true, patientNumber: true, firstName: true, lastName: true, phone: true, gender: true }
            }
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit) || 50, 150)
    });

    return { total: records.length, records };
}

async function createDentalRecord(payload = {}, actor) {
    const patient = await resolvePatient(payload.patientId);
    const {
        chiefComplaint,
        oralExamFindings,
        odontogram = {},
        toothNumbers = [],
        category = "RESTORATIVE",
        procedureCode,
        procedureName,
        anesthesiaUsed,
        treatmentNotes,
        oralSurgeryNotes,
        followUpDate,
        status = "COMPLETED"
    } = payload;

    if (!chiefComplaint || !procedureName) {
        throw new AppError("Chief complaint and dental procedure name are required", 400, "MISSING_REQUIRED_FIELDS");
    }

    const hospitalId = patient.hospitalId || (await ensureDefaultHospitalId());
    const recordNumber = await generateDentalRecordNumber();
    const dentistName = actor ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() || actor.email : "Dentist";

    const created = await prisma.$transaction(async (tx) => {
        const rec = await tx.dentalRecord.create({
            data: {
                recordNumber,
                hospitalId,
                patientId: patient.id,
                dentistId: actor?.id || null,
                dentistName,
                chiefComplaint: String(chiefComplaint).trim(),
                oralExamFindings: oralExamFindings ? String(oralExamFindings).trim() : null,
                odontogram: odontogram && typeof odontogram === "object" ? odontogram : {},
                toothNumbers: Array.isArray(toothNumbers) ? toothNumbers.map(String) : [],
                category: String(category).toUpperCase(),
                procedureCode: procedureCode ? String(procedureCode).trim().toUpperCase() : null,
                procedureName: String(procedureName).trim(),
                anesthesiaUsed: anesthesiaUsed ? String(anesthesiaUsed).trim() : null,
                treatmentNotes: treatmentNotes ? String(treatmentNotes).trim() : null,
                oralSurgeryNotes: oralSurgeryNotes ? String(oralSurgeryNotes).trim() : null,
                followUpDate: followUpDate ? new Date(followUpDate) : null,
                status: String(status).toUpperCase()
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
                action: "DENTAL_RECORD_CREATED",
                module: "DENTAL_CLINIC",
                outcome: "SUCCESS",
                affectedRecord: rec.id,
                description: `[${recordNumber}] Dental ${rec.category} procedure "${rec.procedureName}" recorded for ${patient.firstName} ${patient.lastName} (${patient.patientNumber})`
            }
        });

        return rec;
    });

    return created;
}

async function updateDentalRecord(id, payload = {}, actor) {
    const existing = await prisma.dentalRecord.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Dental record not found", 404, "DENTAL_RECORD_NOT_FOUND");
    }

    const updated = await prisma.dentalRecord.update({
        where: { id },
        data: {
            ...(payload.oralExamFindings !== undefined ? { oralExamFindings: payload.oralExamFindings } : {}),
            ...(payload.odontogram !== undefined ? { odontogram: payload.odontogram } : {}),
            ...(payload.toothNumbers !== undefined ? { toothNumbers: payload.toothNumbers } : {}),
            ...(payload.treatmentNotes !== undefined ? { treatmentNotes: payload.treatmentNotes } : {}),
            ...(payload.oralSurgeryNotes !== undefined ? { oralSurgeryNotes: payload.oralSurgeryNotes } : {}),
            ...(payload.status !== undefined ? { status: String(payload.status).toUpperCase() } : {})
        }
    });

    await prisma.auditLog.create({
        data: {
            userId: actor?.id || null,
            role: actor?.role || null,
            hospitalId: existing.hospitalId,
            action: "DENTAL_RECORD_UPDATED",
            module: "DENTAL_CLINIC",
            outcome: "SUCCESS",
            affectedRecord: updated.id,
            description: `Updated dental record ${existing.recordNumber} (status: ${updated.status})`
        }
    });

    return updated;
}

async function getPatientOdontogram(patientIdentifier) {
    const patient = await resolvePatient(patientIdentifier);
    const records = await prisma.dentalRecord.findMany({
        where: { patientId: patient.id },
        orderBy: { createdAt: "asc" }
    });

    const mergedChart = {};
    for (const tooth of FDI_ADULT_TEETH) {
        mergedChart[tooth] = { condition: "HEALTHY", lastUpdated: null, procedure: null };
    }
    for (const rec of records) {
        if (rec.odontogram && typeof rec.odontogram === "object") {
            for (const [tooth, detail] of Object.entries(rec.odontogram)) {
                mergedChart[tooth] = {
                    ...(typeof detail === "object" ? detail : { condition: String(detail) }),
                    lastUpdated: rec.createdAt,
                    recordNumber: rec.recordNumber
                };
            }
        }
    }

    return {
        patient: {
            id: patient.id,
            mrn: patient.patientNumber,
            fullName: `${patient.firstName} ${patient.lastName}`
        },
        totalVisits: records.length,
        fdiTeeth: FDI_ADULT_TEETH,
        odontogram: mergedChart,
        history: records.reverse()
    };
}

module.exports = {
    FDI_ADULT_TEETH,
    DENTAL_PROCEDURE_CATALOG,
    getDentalTelemetry,
    listDentalRecords,
    createDentalRecord,
    updateDentalRecord,
    getPatientOdontogram
};
