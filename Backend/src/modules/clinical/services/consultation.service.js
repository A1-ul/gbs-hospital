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
const { ensureDefaultHospitalId } = require("../../../core/database/hospital-resolver");
const { searchICD10, searchMedications, searchLabTests, ICD10_CATALOG } = require("../helpers/clinical-catalogs");
const { checkPatientMedicationSafety, logClinicalSafetyOverride } = require("../../clinical-safety/clinical-safety.service");
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
async function recordDoctorConsultation(encounterId, consultationData = {}, doctorUser) {
    const lookupId = encounterId || consultationData.encounterId || consultationData.patientId;
    if (!lookupId) {
        throw new AppError("Encounter ID or Patient ID is required", 400, "MISSING_ENCOUNTER_ID");
    }

    let encounter = await prisma.patientEncounter.findUnique({
        where: { id: lookupId },
        include: {
            patient: true,
            queueTicket: true
        }
    });

    if (!encounter) {
        const patientIdentifier = consultationData.patientId || lookupId;
        const patient = await prisma.patient.findFirst({
            where: {
                OR: [{ id: patientIdentifier }, { patientNumber: patientIdentifier }]
            }
        });
        if (patient) {
            encounter = await prisma.patientEncounter.findFirst({
                where: { patientId: patient.id, status: { not: "CANCELLED" } },
                include: { patient: true, queueTicket: true },
                orderBy: { visitDate: "desc" }
            });
            if (!encounter) {
                encounter = await prisma.patientEncounter.create({
                    data: {
                        patientId: patient.id,
                        hospitalId: patient.hospitalId,
                        encounterNumber: `ENC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
                        encounterType: consultationData.type || "OUTPATIENT",
                        status: "IN_CONSULTATION",
                        chiefComplaint: consultationData.chiefComplaint || null
                    },
                    include: { patient: true, queueTicket: true }
                });
            }
            encounterId = encounter.id;
        }
    } else {
        encounterId = encounter.id;
    }

    if (!encounter) {
        throw new AppError("Clinical Encounter not found", 404, "ENCOUNTER_NOT_FOUND");
    }

    const {
        consultationType = "INITIAL",
        history = consultationData.chiefComplaint || null,
        examination,
        assessment = consultationData.diagnosis || null,
        plan = consultationData.treatmentPlan || null,
        diagnoses: rawDiagnoses = [],
        prescriptions = [],
        laboratoryRequests = [],
        markComplete = false,
        safetyOverrideReason = null
    } = consultationData;

    // PATIENT SAFETY GUARDRAIL (NEVER DISABLED): Allergy & Drug-Drug Interaction Enforcement
    let safetyCheckReport = null;
    if (Array.isArray(prescriptions) && prescriptions.length > 0) {
        safetyCheckReport = await checkPatientMedicationSafety({
            patientId: encounter.patientId,
            proposedMedications: prescriptions
        });
        if (!safetyCheckReport.safeToProceedWithoutOverride) {
            const reasonText = String(safetyOverrideReason || "").trim();
            if (reasonText.length < 10) {
                throw new AppError(
                    `CLINICAL SAFETY ALERT: ${safetyCheckReport.blockingAlertsCount} high-severity allergy or drug interaction conflict(s) detected. Provide a documented safetyOverrideReason (>= 10 characters) to override with audit.`,
                    409,
                    "CLINICAL_SAFETY_ALERT_REQUIRES_OVERRIDE",
                    { safetyReport: safetyCheckReport }
                );
            }
        }
    }

    const diagnoses = Array.isArray(rawDiagnoses) && rawDiagnoses.length > 0
        ? rawDiagnoses
        : consultationData.diagnosis
            ? [{ diagnosisCode: consultationData.icd10Code || null, diagnosisName: consultationData.diagnosis, diagnosisType: "PRIMARY" }]
            : [];

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

        // 3. Create Electronic Prescriptions (+ Log Audited Safety Overrides if applicable)
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

        const loggedOverrides = [];
        if (safetyCheckReport && !safetyCheckReport.safeToProceedWithoutOverride && safetyOverrideReason) {
            for (const alert of safetyCheckReport.alerts.filter((a) => a.requiresOverride)) {
                const ovr = await logClinicalSafetyOverride(
                    {
                        patientId: encounter.patientId,
                        encounterId,
                        alertCategory: alert.category,
                        severity: alert.severity,
                        offendingMedication: alert.offendingMedication,
                        conflictingAgent: alert.conflictingAgent,
                        alertSummary: alert.summary,
                        overrideReason: String(safetyOverrideReason).trim()
                    },
                    doctorUser,
                    tx
                );
                loggedOverrides.push(ovr);
            }
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
            encounter: updatedEncounter,
            safetyReport: safetyCheckReport,
            safetyOverridesLogged: loggedOverrides
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
async function getDoctorDashboardTelemetry(explicitHospitalId, doctorUserId) {
    const hospitalId = await ensureDefaultHospitalId(explicitHospitalId);

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

/**
 * Dispatch a Patient Clinical Report from Doctor/Clinician to any Target Role or Specialist
 * Persists in PostgreSQL and generates a SENT notification record
 */
async function dispatchClinicalReport(reportData = {}, senderUser = null) {
    const {
        patientId,
        targetRole = "SPECIALIST",
        targetStaffName,
        reportCategory = "CONSULTATION",
        reportTitle,
        title,
        summary,
        clinicalFindings,
        findingsSummary,
        recommendations,
        recommendedAction,
        urgency = "NORMAL"
    } = reportData;

    const resolvedSummary = summary || clinicalFindings || findingsSummary;
    const resolvedTitle = reportTitle || title || `${reportCategory} Report -> ${targetRole}`;
    const resolvedRecommendations = recommendations || recommendedAction || null;

    if (!resolvedSummary) {
        throw new AppError("Report summary or clinical findings are required", 400, "MISSING_REPORT_CONTENT");
    }

    let patient = null;
    if (patientId) {
        patient = await prisma.patient.findFirst({
            where: {
                OR: [{ id: patientId }, { patientNumber: patientId }]
            }
        });
    }
    if (!patient) {
        patient = await prisma.patient.findFirst({ orderBy: { createdAt: "desc" } });
    }

    const senderName = senderUser
        ? (senderUser.name || `${senderUser.firstName || ""} ${senderUser.lastName || ""}`.trim() || senderUser.email)
        : "Attending Physician";
    const senderRole = senderUser?.role || "DOCTOR";

    const payload = {
        dispatchNumber: `RPT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        status: "SENT",
        notificationStatus: "SENT",
        patientId: patient?.id || null,
        patientMrn: patient?.patientNumber || String(patientId || "N/A"),
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : (reportData.patientName || "General Report"),
        senderName,
        senderRole,
        targetRole: String(targetRole).toUpperCase(),
        targetStaffName: targetStaffName || String(targetRole).toUpperCase(),
        reportCategory: String(reportCategory).toUpperCase(),
        reportTitle: resolvedTitle,
        title: resolvedTitle,
        summary: resolvedSummary,
        clinicalFindings: clinicalFindings || resolvedSummary,
        findingsSummary: resolvedSummary,
        recommendations: resolvedRecommendations,
        recommendedAction: resolvedRecommendations,
        urgency: String(urgency).toUpperCase(),
        sentAt: new Date().toISOString()
    };

    let createdNote = null;
    if (patient) {
        createdNote = await prisma.patientClinicalNote.create({
            data: {
                patientId: patient.id,
                noteType: `DISPATCH_REPORT_${payload.targetRole}`,
                title: payload.reportTitle,
                content: JSON.stringify(payload),
                author: `${senderName} (${senderRole})`,
                department: payload.targetRole
            }
        });
    }

    const auditEntry = await prisma.auditLog.create({
        data: {
            userId: senderUser?.id || null,
            action: "CLINICAL_REPORT_DISPATCHED",
            module: "CLINICAL_REPORTS",
            description: JSON.stringify(payload)
        }
    });

    return {
        id: createdNote?.id || auditEntry.id,
        ...payload
    };
}

/**
 * Prepare and Submit a Role Duty Report (Available to Every Hospital Role)
 */
async function createDutyReport(reportData = {}, authorUser = null) {
    const {
        reportCategory = "STAFF_DUTY",
        title,
        department,
        shift,
        shiftType,
        dutiesPerformed,
        dutiesSummary,
        challengesOrIncidents,
        challengesFaced,
        handoverNotes
    } = reportData;

    const resolvedDuties = dutiesPerformed || dutiesSummary;
    if (!resolvedDuties) {
        throw new AppError("Duties performed summary is required", 400, "MISSING_DUTY_REPORT_FIELDS");
    }

    const authorName = reportData.staffName || reportData.authorName || (authorUser
        ? (authorUser.name || `${authorUser.firstName || ""} ${authorUser.lastName || ""}`.trim() || authorUser.email)
        : "Hospital Staff");
    const authorRole = reportData.role || reportData.authorRole || authorUser?.role || "STAFF";
    const resolvedShift = shift || shiftType || "MORNING_SHIFT";
    const resolvedTitle = title || `${authorRole} Duty Report — ${authorName} (${resolvedShift})`;

    const payload = {
        reportNumber: `DUTY-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        reportCategory: String(reportCategory).toUpperCase(),
        title: String(resolvedTitle).trim(),
        authorName,
        staffName: authorName,
        authorRole,
        role: authorRole,
        department: department || authorRole,
        shift: resolvedShift,
        shiftType: resolvedShift,
        dutiesPerformed: String(resolvedDuties).trim(),
        dutiesSummary: String(resolvedDuties).trim(),
        challengesOrIncidents: challengesOrIncidents || challengesFaced || null,
        handoverNotes: handoverNotes || null,
        status: "SUBMITTED",
        submittedAt: new Date().toISOString()
    };

    const auditEntry = await prisma.auditLog.create({
        data: {
            userId: authorUser?.id || null,
            action: "ROLE_DUTY_REPORT_SUBMITTED",
            module: "DUTY_REPORTS",
            description: JSON.stringify(payload)
        }
    });

    return {
        id: auditEntry.id,
        ...payload
    };
}

/**
 * Unified Report Center Query across Categories:
 * ALL, LAB_REPORTS, VITALS_TRIAGE, CONSULTATION, PHARMACY, RADIOLOGY, STAFF_DUTY, DISPATCHED_REPORTS
 */
async function getClinicalAndDutyReports(query = {}) {
    const category = String(query.category || "ALL").toUpperCase();

    const [
        labRequests,
        vitals,
        consultations,
        prescriptions,
        radiologyReports,
        dispatchedLogs,
        dutyLogs
    ] = await Promise.all([
        prisma.laboratoryRequest.findMany({
            include: { encounter: { include: { patient: true } }, testResults: true },
            orderBy: { createdAt: "desc" },
            take: 30
        }),
        prisma.patientVitalSign.findMany({
            include: { patient: true },
            orderBy: { recordedAt: "desc" },
            take: 30
        }),
        prisma.patientConsultation.findMany({
            include: { encounter: { include: { patient: true, diagnoses: true } } },
            orderBy: { createdAt: "desc" },
            take: 30
        }),
        prisma.patientPrescription.findMany({
            include: { encounter: { include: { patient: true } }, dispense: true },
            orderBy: { createdAt: "desc" },
            take: 30
        }),
        prisma.radiologyReport.findMany({
            include: { order: { include: { patient: true } } },
            orderBy: { createdAt: "desc" },
            take: 30
        }),
        prisma.auditLog.findMany({
            where: { module: "CLINICAL_REPORTS", action: "CLINICAL_REPORT_DISPATCHED" },
            orderBy: { createdAt: "desc" },
            take: 30
        }),
        prisma.auditLog.findMany({
            where: { module: "DUTY_REPORTS", action: "ROLE_DUTY_REPORT_SUBMITTED" },
            orderBy: { createdAt: "desc" },
            take: 30
        })
    ]);

    const allReports = [
        ...dispatchedLogs.map((l) => {
            let parsed = {};
            try { parsed = JSON.parse(l.description || "{}"); } catch (_e) { }
            return {
                id: l.id,
                reportNumber: parsed.dispatchNumber || l.id.slice(0, 8),
                category: "DISPATCHED_REPORTS",
                title: parsed.reportTitle || "Specialist Referral Report",
                patientName: parsed.patientName || "N/A",
                patientMrn: parsed.patientMrn || "N/A",
                author: `${parsed.senderName || "Doctor"} -> ${parsed.targetStaffName || parsed.targetRole || "Specialist"}`,
                status: parsed.status || "SENT",
                summary: parsed.summary || l.description,
                createdAt: l.createdAt
            };
        }),
        ...dutyLogs.map((l) => {
            let parsed = {};
            try { parsed = JSON.parse(l.description || "{}"); } catch (_e) { }
            return {
                id: l.id,
                reportNumber: parsed.reportNumber || l.id.slice(0, 8),
                category: "STAFF_DUTY",
                title: parsed.title || "Role Duty Report",
                patientName: parsed.department || "Facility Duty",
                patientMrn: parsed.shift || "SHIFT",
                author: `${parsed.authorName || "Staff"} (${parsed.authorRole || "ROLE"})`,
                status: parsed.status || "SUBMITTED",
                summary: parsed.dutiesPerformed || l.description,
                createdAt: l.createdAt
            };
        }),
        ...labRequests.map((lab) => ({
            id: lab.id,
            reportNumber: lab.requestNumber || lab.id.slice(0, 8),
            category: "LAB_REPORTS",
            title: `Lab Investigation: ${lab.testName}`,
            patientName: lab.encounter?.patient ? `${lab.encounter.patient.firstName} ${lab.encounter.patient.lastName}` : "Patient",
            patientMrn: lab.encounter?.patient?.patientNumber || "N/A",
            author: lab.verifiedByName || lab.department || "Laboratory",
            status: lab.status,
            summary: lab.result || (lab.testResults?.length ? lab.testResults.map((r) => `${r.parameterName}: ${r.measuredValue} ${r.unit || ""}`).join(", ") : `Specimen: ${lab.specimenType || "Blood"}`),
            createdAt: lab.createdAt
        })),
        ...vitals.map((v) => ({
            id: v.id,
            reportNumber: `VIT-${v.id.slice(0, 6).toUpperCase()}`,
            category: "VITALS_TRIAGE",
            title: `Triage & Vital Signs (NEWS2: ${v.news2Score ?? 0} - ${v.riskCategory || "LOW"})`,
            patientName: v.patient ? `${v.patient.firstName} ${v.patient.lastName}` : "Patient",
            patientMrn: v.patient?.patientNumber || "N/A",
            author: v.recordedBy || "Triage Nurse",
            status: v.riskCategory || "RECORDED",
            summary: `Temp: ${v.temperature ?? "-"}C, BP: ${v.systolicBP ?? "-"}/${v.diastolicBP ?? "-"} mmHg, HR: ${v.pulseRate ?? "-"} bpm, SpO2: ${v.oxygenSaturation ?? "-"}%, BMI: ${v.bmi ?? "-"}`,
            createdAt: v.recordedAt
        })),
        ...consultations.map((c) => ({
            id: c.id,
            reportNumber: c.encounter?.encounterNumber || `CON-${c.id.slice(0, 6).toUpperCase()}`,
            category: "CONSULTATION",
            title: `Physician Consultation (${c.consultationType || "OPD"})`,
            patientName: c.encounter?.patient ? `${c.encounter.patient.firstName} ${c.encounter.patient.lastName}` : "Patient",
            patientMrn: c.encounter?.patient?.patientNumber || "N/A",
            author: c.encounter?.assignedDoctorName || "Consulting Physician",
            status: c.encounter?.status || "RECORDED",
            summary: `Assessment: ${c.assessment || (c.encounter?.diagnoses?.[0]?.diagnosisName) || "Reviewed"} | Plan: ${c.plan || "Follow-up"}`,
            createdAt: c.createdAt
        })),
        ...prescriptions.map((rx) => ({
            id: rx.id,
            reportNumber: rx.dispense?.dispenseNumber || `RX-${rx.id.slice(0, 6).toUpperCase()}`,
            category: "PHARMACY",
            title: `Prescription: ${rx.medicationName} (${rx.dosage || ""} ${rx.frequency || ""})`,
            patientName: rx.encounter?.patient ? `${rx.encounter.patient.firstName} ${rx.encounter.patient.lastName}` : "Patient",
            patientMrn: rx.encounter?.patient?.patientNumber || "N/A",
            author: rx.dispense?.pharmacistName || "Pharmacy",
            status: rx.status,
            summary: `Duration: ${rx.duration || "N/A"} | Instructions: ${rx.instructions || "Standard"}`,
            createdAt: rx.createdAt
        })),
        ...radiologyReports.map((rad) => ({
            id: rad.id,
            reportNumber: rad.reportNumber,
            category: "RADIOLOGY",
            title: `Radiology Report (${rad.modality})`,
            patientName: rad.order?.patient ? `${rad.order.patient.firstName} ${rad.order.patient.lastName}` : "Patient",
            patientMrn: rad.order?.patient?.patientNumber || "N/A",
            author: rad.verifiedByName || rad.radiologistName || "Radiologist",
            status: rad.status,
            summary: `Impression: ${rad.impression} | Classification: ${rad.classification}`,
            createdAt: rad.createdAt
        }))
    ];

    const filtered = category === "ALL"
        ? allReports
        : allReports.filter((r) => r.category === category);

    return {
        category,
        total: filtered.length,
        reports: filtered
    };
}

module.exports = {
    recordDoctorConsultation,
    getConsultationDetails,
    getPatientClinicalHistory,
    getDoctorDashboardTelemetry,
    searchICD10,
    searchMedications,
    searchLabTests,
    dispatchClinicalReport,
    createDutyReport,
    getClinicalAndDutyReports
};
