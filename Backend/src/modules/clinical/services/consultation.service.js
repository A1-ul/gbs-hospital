"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
DOCTOR CLINICAL CONSULTATION & DIAGNOSIS SERVICE
Real Database Execution, ICD-10 Coding, Prescriptions & Lab Requests
LOCATION: src/modules/clinical/services/consultation.service.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");
const { searchICD10, searchMedications, searchLabTests, ICD10_CATALOG } = require("../helpers/clinical-catalogs");
const AppError = require("../../../core/errors/app.error");
const logger = require("../../../core/utils/logger");

/**
 * Record Doctor Clinical Consultation with ICD-10 Diagnosis, Prescriptions & Lab Requests
 * Executes in an atomic PostgreSQL transaction
 * 
 * @param {string} encounterId - Encounter ID
 * @param {Object} consultationData - Consultation payload
 * @param {Object} doctorUser - Authenticated doctor user object
 */
async function recordDoctorConsultation(encounterId, consultationData, doctorUser) {
    if (!encounterId) {
        throw new AppError("Encounter ID is required", 400, "MISSING_ENCOUNTER_ID");
    }

    const encounter = await prisma.patientEncounter.findUnique({
        where: { id: encounterId },
        include: {
            patient: true,
            queueTicket: true
        }
    });

    if (!encounter) {
        throw new AppError("Clinical Encounter not found", 404, "ENCOUNTER_NOT_FOUND");
    }

    const {
        consultationType = "INITIAL",
        history,
        examination,
        assessment,
        plan,
        diagnoses = [],
        prescriptions = [],
        laboratoryRequests = [],
        markComplete = false
    } = consultationData;

    const doctorUserId = doctorUser ? doctorUser.id : null;
    const doctorName = doctorUser ? `${doctorUser.firstName} ${doctorUser.lastName}` : "Consulting Physician";

    const result = await prisma.$transaction(async (tx) => {
        // 1. Create PatientConsultation
        const consultation = await tx.patientConsultation.create({
            data: {
                encounterId,
                consultationType,
                history: history || null,
                examination: examination || null,
                assessment: assessment || null,
                plan: plan || null
            }
        });

        // 2. Create Diagnoses with ICD-10 validation
        const createdDiagnoses = [];
        for (const diag of diagnoses) {
            let diagnosisName = diag.diagnosisName;
            let diagnosisCode = diag.diagnosisCode ? diag.diagnosisCode.trim().toUpperCase() : null;

            // Auto-resolve diagnosis name if code is provided from catalog
            if (diagnosisCode && !diagnosisName) {
                const catalogMatch = ICD10_CATALOG.find(c => c.code.toUpperCase() === diagnosisCode);
                if (catalogMatch) {
                    diagnosisName = catalogMatch.name;
                }
            }

            if (!diagnosisName) {
                diagnosisName = "Unspecified clinical condition";
            }

            const diagnosis = await tx.patientDiagnosis.create({
                data: {
                    encounterId,
                    diagnosisCode,
                    diagnosisName,
                    diagnosisType: diag.diagnosisType || "PRIMARY",
                    notes: diag.notes || null
                }
            });
            createdDiagnoses.push(diagnosis);
        }

        // 3. Create Electronic Prescriptions
        const createdPrescriptions = [];
        for (const rx of prescriptions) {
            if (!rx.medicationName) continue;

            const prescription = await tx.patientPrescription.create({
                data: {
                    encounterId,
                    medicationName: rx.medicationName.trim(),
                    dosage: rx.dosage ? rx.dosage.trim() : null,
                    frequency: rx.frequency ? rx.frequency.trim().toUpperCase() : "OD",
                    duration: rx.duration ? rx.duration.trim() : "5 days",
                    instructions: rx.instructions ? rx.instructions.trim() : null,
                    status: "PENDING"
                }
            });
            createdPrescriptions.push(prescription);
        }

        // 4. Create Laboratory Investigation Requests
        const createdLabRequests = [];
        for (const lab of laboratoryRequests) {
            if (!lab.testName) continue;

            const labReq = await tx.laboratoryRequest.create({
                data: {
                    encounterId,
                    testName: lab.testName.trim(),
                    testCode: lab.testCode ? lab.testCode.trim().toUpperCase() : null,
                    status: "REQUESTED"
                }
            });
            createdLabRequests.push(labReq);
        }

        // 5. Update Encounter status and timestamps
        const now = new Date();
        const encounterUpdate = {
            assignedDoctorId: doctorUserId || encounter.assignedDoctorId,
            assignedDoctorName: doctorName || encounter.assignedDoctorName
        };

        if (markComplete) {
            encounterUpdate.status = "COMPLETED";
            encounterUpdate.consultationCompletedAt = now;
        } else if (encounter.status !== "IN_CONSULTATION") {
            encounterUpdate.status = "IN_CONSULTATION";
            if (!encounter.consultationStartedAt) {
                encounterUpdate.consultationStartedAt = now;
            }
        }

        const updatedEncounter = await tx.patientEncounter.update({
            where: { id: encounterId },
            data: encounterUpdate
        });

        // 6. Update OPD Queue Ticket if completing
        if (markComplete && encounter.queueTicket) {
            await tx.opdQueueTicket.update({
                where: { id: encounter.queueTicket.id },
                data: {
                    status: "COMPLETED",
                    completedAt: now
                }
            });
        }

        return {
            consultation,
            diagnoses: createdDiagnoses,
            prescriptions: createdPrescriptions,
            laboratoryRequests: createdLabRequests,
            encounter: updatedEncounter
        };
    });

    logger.info("Doctor consultation recorded successfully", {
        encounterId,
        diagnosesCount: result.diagnoses.length,
        prescriptionsCount: result.prescriptions.length,
        labRequestsCount: result.laboratoryRequests.length,
        markComplete
    });

    return {
        success: true,
        data: result
    };
}

/**
 * Get Full Consultation Details by Encounter ID
 * 
 * @param {string} encounterId - Encounter ID
 */
async function getConsultationDetails(encounterId) {
    if (!encounterId) {
        throw new AppError("Encounter ID is required", 400, "MISSING_ENCOUNTER_ID");
    }

    const encounter = await prisma.patientEncounter.findUnique({
        where: { id: encounterId },
        include: {
            patient: {
                include: { folder: true }
            },
            vitalSigns: {
                orderBy: { recordedAt: "desc" }
            },
            consultations: {
                orderBy: { createdAt: "desc" }
            },
            diagnoses: {
                orderBy: { createdAt: "desc" }
            },
            prescriptions: {
                orderBy: { createdAt: "desc" }
            },
            laboratoryRequests: {
                orderBy: { createdAt: "desc" }
            },
            queueTicket: true
        }
    });

    if (!encounter) {
        throw new AppError("Encounter not found", 404, "ENCOUNTER_NOT_FOUND");
    }

    return {
        encounterId: encounter.id,
        encounterNumber: encounter.encounterNumber,
        visitDate: encounter.visitDate,
        status: encounter.status,
        priority: encounter.priority,
        queueToken: encounter.queueToken,
        chiefComplaint: encounter.chiefComplaint,
        assignedRoom: encounter.assignedRoom,
        assignedDoctorName: encounter.assignedDoctorName,
        triageRiskLevel: encounter.triageRiskLevel,
        patient: {
            id: encounter.patient.id,
            mrn: encounter.patient.patientNumber,
            patientNumber: encounter.patient.patientNumber,
            fullName: `${encounter.patient.firstName} ${encounter.patient.lastName}`,
            gender: encounter.patient.gender,
            dateOfBirth: encounter.patient.dateOfBirth,
            bloodGroup: encounter.patient.bloodGroup,
            genotype: encounter.patient.genotype,
            folderNumber: encounter.patient.folder ? encounter.patient.folder.folderNumber : null,
            shelfLocation: encounter.patient.folder ? encounter.patient.folder.shelfLocation : null
        },
        latestVitals: encounter.vitalSigns.length > 0 ? encounter.vitalSigns[0] : null,
        consultations: encounter.consultations,
        diagnoses: encounter.diagnoses,
        prescriptions: encounter.prescriptions,
        laboratoryRequests: encounter.laboratoryRequests,
        ticket: encounter.queueTicket
    };
}

/**
 * Get Longitudinal Patient Clinical History
 * Returns all encounters, diagnoses, prescriptions, and lab tests for a patient
 * 
 * @param {string} patientId - Patient ID
 */
async function getPatientClinicalHistory(patientId) {
    if (!patientId) {
        throw new AppError("Patient ID is required", 400, "MISSING_PATIENT_ID");
    }

    const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
            folder: true,
            patientEncounters: {
                include: {
                    vitalSigns: { orderBy: { recordedAt: "desc" } },
                    consultations: { orderBy: { createdAt: "desc" } },
                    diagnoses: true,
                    prescriptions: true,
                    laboratoryRequests: true
                },
                orderBy: { visitDate: "desc" }
            }
        }
    });

    if (!patient) {
        throw new AppError("Patient not found", 404, "PATIENT_NOT_FOUND");
    }

    const encountersList = patient.patientEncounters || [];

    return {
        patient: {
            id: patient.id,
            mrn: patient.patientNumber,
            patientNumber: patient.patientNumber,
            fullName: `${patient.firstName} ${patient.lastName}`,
            gender: patient.gender,
            dateOfBirth: patient.dateOfBirth,
            bloodGroup: patient.bloodGroup,
            genotype: patient.genotype,
            folderNumber: patient.folder ? patient.folder.folderNumber : null,
            shelfLocation: patient.folder ? patient.folder.shelfLocation : null
        },
        totalEncounters: encountersList.length,
        encounters: encountersList.map(enc => ({
            encounterId: enc.id,
            encounterNumber: enc.encounterNumber,
            visitDate: enc.visitDate,
            status: enc.status,
            priority: enc.priority,
            chiefComplaint: enc.chiefComplaint,
            doctorName: enc.assignedDoctorName,
            consultation: enc.consultations.length > 0 ? enc.consultations[0] : null,
            diagnoses: enc.diagnoses,
            prescriptions: enc.prescriptions,
            laboratoryRequests: enc.laboratoryRequests,
            latestVitals: enc.vitalSigns.length > 0 ? enc.vitalSigns[0] : null
        }))
    };
}

/**
 * Doctor Role Real-Life Dashboard Telemetry & Clinical Statistics
 * Aggregates live PostgreSQL numbers and attaches authentic imagery metadata
 * 
 * @param {string} hospitalId - Hospital ID
 * @param {string} doctorUserId - Doctor User ID
 */
async function getDoctorDashboardTelemetry(hospitalId, doctorUserId) {
    if (!hospitalId) {
        throw new AppError("Hospital ID is required", 400, "MISSING_HOSPITAL_ID");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        patientsWaiting,
        consultationsCompletedToday,
        activePrescriptionsCount,
        pendingLabResultsCount,
        emergencyPatientsWaiting,
        recentConsultations
    ] = await Promise.all([
        prisma.patientEncounter.count({
            where: {
                hospitalId,
                status: { in: ["WAITING_DOCTOR", "ASSIGNED_DOCTOR"] },
                visitDate: { gte: today }
            }
        }),
        prisma.patientEncounter.count({
            where: {
                hospitalId,
                status: "COMPLETED",
                consultationCompletedAt: { gte: today }
            }
        }),
        prisma.patientPrescription.count({
            where: {
                encounter: { hospitalId },
                createdAt: { gte: today }
            }
        }),
        prisma.laboratoryRequest.count({
            where: {
                encounter: { hospitalId },
                status: { in: ["REQUESTED", "IN_PROGRESS"] },
                createdAt: { gte: today }
            }
        }),
        prisma.patientEncounter.count({
            where: {
                hospitalId,
                status: { in: ["WAITING_DOCTOR", "ASSIGNED_DOCTOR"] },
                visitDate: { gte: today },
                OR: [
                    { priority: "EMERGENCY" },
                    { triageRiskLevel: { in: ["CRITICAL", "HIGH"] } }
                ]
            }
        }),
        prisma.patientConsultation.findMany({
            where: {
                encounter: { hospitalId },
                createdAt: { gte: today }
            },
            include: {
                encounter: {
                    include: {
                        patient: {
                            select: { firstName: true, lastName: true, patientNumber: true }
                        },
                        diagnoses: true,
                        vitalSigns: {
                            orderBy: { recordedAt: "desc" },
                            take: 1
                        }
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            take: 10
        })
    ]);

    return {
        timestamp: new Date(),
        telemetry: {
            patientsWaiting,
            consultationsCompletedToday,
            activePrescriptionsCount,
            pendingLabResultsCount,
            emergencyPatientsWaiting
        },
        recentConsultations: recentConsultations.map(c => ({
            consultationId: c.id,
            encounterNumber: c.encounter.encounterNumber,
            patientName: `${c.encounter.patient.firstName} ${c.encounter.patient.lastName}`,
            patientMrn: c.encounter.patient.patientNumber,
            primaryDiagnosis: c.encounter.diagnoses.length > 0 ? c.encounter.diagnoses[0].diagnosisName : "Clinical Review",
            diagnosisCode: c.encounter.diagnoses.length > 0 ? c.encounter.diagnoses[0].diagnosisCode : null,
            latestVitals: c.encounter.vitalSigns.length > 0 ? c.encounter.vitalSigns[0] : null,
            createdAt: c.createdAt
        })),
        dashboardRoleTheme: {
            role: "DOCTOR",
            heroTitle: "Clinical Physician Command & Diagnostic Consultation",
            heroSubtitle: "Evidence-based clinical decision support, ICD-10 diagnostic coding, and electronic prescribing",
            bannerImageUrl: "/assets/images/roles/doctor_clinical_hero.jpg",
            avatarBadgeUrl: "/assets/images/roles/stethoscope_badge.png",
            themeColor: "#0284C7"
        }
    };
}

module.exports = {
    recordDoctorConsultation,
    getConsultationDetails,
    getPatientClinicalHistory,
    getDoctorDashboardTelemetry,
    searchICD10,
    searchMedications,
    searchLabTests
};
