"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
OPHTHALMOLOGY / EYE CLINIC SERVICE (EYE_DOCTOR)
Vision Testing (OD/OS), Intraocular Pressure (IOP), Refraction Rx & Eye Exams
LOCATION: Backend/src/modules/eye-clinic/eye-clinic.service.js
====================================================
*/

const prisma = require("../../core/database/prisma.client");
const { ensureDefaultHospitalId } = require("../../core/database/hospital-resolver");
const AppError = require("../../core/errors/app.error");

const NORMAL_IOP_MAX_MMHG = 21.0;

async function generateEyeExamNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.eyeClinicRecord.count();
    return `EYE-${year}-${String(count + 1).padStart(6, "0")}`;
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

async function getEyeClinicTelemetry() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [totalExams, todayExams, elevatedIopAlerts, proceduresPlanned] = await Promise.all([
        prisma.eyeClinicRecord.count(),
        prisma.eyeClinicRecord.count({ where: { createdAt: { gte: startOfDay } } }),
        prisma.eyeClinicRecord.count({ where: { ocularHypertensionFlag: true } }),
        prisma.eyeClinicRecord.count({ where: { procedurePlanned: { not: null } } })
    ]);

    return {
        totalExams,
        todayExams,
        elevatedIopAlerts,
        proceduresPlanned,
        normalIopRangeMmHg: "10 - 21 mmHg"
    };
}

async function listEyeExams({ patientId, elevatedIopOnly, limit = 50 } = {}) {
    const where = {};
    if (patientId) where.patientId = patientId;
    if (elevatedIopOnly === true || elevatedIopOnly === "true") {
        where.ocularHypertensionFlag = true;
    }

    const exams = await prisma.eyeClinicRecord.findMany({
        where,
        include: {
            patient: {
                select: { id: true, patientNumber: true, firstName: true, lastName: true, phone: true, gender: true }
            }
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit) || 50, 150)
    });

    return { total: exams.length, exams };
}

async function createEyeExam(payload = {}, actor) {
    const patient = await resolvePatient(payload.patientId);
    const {
        chiefComplaint,
        visualAcuityOD,
        visualAcuityOS,
        visualAcuityCorrectedOD,
        visualAcuityCorrectedOS,
        iopRightMmHg,
        iopLeftMmHg,
        refractionOD,
        refractionOS,
        pupillaryDistanceMm,
        slitLampFindings,
        funduscopyFindings,
        diagnosis,
        lensPrescription,
        eyeDropMedication,
        procedurePlanned,
        followUpDate,
        status = "COMPLETED"
    } = payload;

    if (!chiefComplaint || !diagnosis) {
        throw new AppError("Chief complaint and ophthalmologic diagnosis are required", 400, "MISSING_REQUIRED_FIELDS");
    }

    const iopR = iopRightMmHg !== undefined && iopRightMmHg !== "" && iopRightMmHg !== null ? Number(iopRightMmHg) : null;
    const iopL = iopLeftMmHg !== undefined && iopLeftMmHg !== "" && iopLeftMmHg !== null ? Number(iopLeftMmHg) : null;
    const ocularHypertensionFlag = Boolean(
        (iopR !== null && !Number.isNaN(iopR) && iopR > NORMAL_IOP_MAX_MMHG) ||
        (iopL !== null && !Number.isNaN(iopL) && iopL > NORMAL_IOP_MAX_MMHG)
    );

    const hospitalId = patient.hospitalId || (await ensureDefaultHospitalId());
    const examNumber = await generateEyeExamNumber();
    const doctorName = actor ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() || actor.email : "Ophthalmologist";

    const created = await prisma.$transaction(async (tx) => {
        const rec = await tx.eyeClinicRecord.create({
            data: {
                examNumber,
                hospitalId,
                patientId: patient.id,
                doctorId: actor?.id || null,
                doctorName,
                chiefComplaint: String(chiefComplaint).trim(),
                visualAcuityOD: visualAcuityOD ? String(visualAcuityOD).trim() : null,
                visualAcuityOS: visualAcuityOS ? String(visualAcuityOS).trim() : null,
                visualAcuityCorrectedOD: visualAcuityCorrectedOD ? String(visualAcuityCorrectedOD).trim() : null,
                visualAcuityCorrectedOS: visualAcuityCorrectedOS ? String(visualAcuityCorrectedOS).trim() : null,
                iopRightMmHg: iopR,
                iopLeftMmHg: iopL,
                ocularHypertensionFlag,
                refractionOD: refractionOD || null,
                refractionOS: refractionOS || null,
                pupillaryDistanceMm: pupillaryDistanceMm ? Number(pupillaryDistanceMm) : null,
                slitLampFindings: slitLampFindings ? String(slitLampFindings).trim() : null,
                funduscopyFindings: funduscopyFindings ? String(funduscopyFindings).trim() : null,
                diagnosis: String(diagnosis).trim(),
                lensPrescription: lensPrescription ? String(lensPrescription).trim() : null,
                eyeDropMedication: eyeDropMedication ? String(eyeDropMedication).trim() : null,
                procedurePlanned: procedurePlanned ? String(procedurePlanned).trim() : null,
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
                action: ocularHypertensionFlag ? "EYE_EXAM_ELEVATED_IOP_ALERT" : "EYE_EXAM_RECORDED",
                module: "EYE_CLINIC",
                outcome: "SUCCESS",
                affectedRecord: rec.id,
                description: `[${examNumber}] Ophthalmology exam (${rec.diagnosis}) for ${patient.firstName} ${patient.lastName} — VA OD:${rec.visualAcuityOD || "N/A"} OS:${rec.visualAcuityOS || "N/A"}, IOP OD:${iopR ?? "N/A"} OS:${iopL ?? "N/A"} mmHg${ocularHypertensionFlag ? " [OCULAR HYPERTENSION ALERT]" : ""}`
            }
        });

        return rec;
    });

    return created;
}

async function updateEyeExam(id, payload = {}, actor) {
    const existing = await prisma.eyeClinicRecord.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Eye clinic record not found", 404, "EYE_EXAM_NOT_FOUND");
    }

    const updated = await prisma.eyeClinicRecord.update({
        where: { id },
        data: {
            ...(payload.diagnosis !== undefined ? { diagnosis: String(payload.diagnosis).trim() } : {}),
            ...(payload.lensPrescription !== undefined ? { lensPrescription: payload.lensPrescription } : {}),
            ...(payload.eyeDropMedication !== undefined ? { eyeDropMedication: payload.eyeDropMedication } : {}),
            ...(payload.procedurePlanned !== undefined ? { procedurePlanned: payload.procedurePlanned } : {}),
            ...(payload.status !== undefined ? { status: String(payload.status).toUpperCase() } : {})
        }
    });

    await prisma.auditLog.create({
        data: {
            userId: actor?.id || null,
            role: actor?.role || null,
            hospitalId: existing.hospitalId,
            action: "EYE_EXAM_UPDATED",
            module: "EYE_CLINIC",
            outcome: "SUCCESS",
            affectedRecord: updated.id,
            description: `Updated eye exam ${existing.examNumber}`
        }
    });

    return updated;
}

async function getPatientEyeHistory(patientIdentifier) {
    const patient = await resolvePatient(patientIdentifier);
    const exams = await prisma.eyeClinicRecord.findMany({
        where: { patientId: patient.id },
        orderBy: { createdAt: "desc" }
    });
    return {
        patient: {
            id: patient.id,
            mrn: patient.patientNumber,
            fullName: `${patient.firstName} ${patient.lastName}`
        },
        total: exams.length,
        exams
    };
}

module.exports = {
    NORMAL_IOP_MAX_MMHG,
    getEyeClinicTelemetry,
    listEyeExams,
    createEyeExam,
    updateEyeExam,
    getPatientEyeHistory
};
