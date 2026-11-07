"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
OUTPATIENT DEPARTMENT (OPD) & NURSE TRIAGE SERVICE
Real Database Execution, NEWS2 Clinical Early Warning & Queue Engine
LOCATION: src/modules/clinical/services/opd-triage.service.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");
const { generateOpdToken, generateEncounterNumber } = require("../helpers/opd-token.generator");
const { calculateBMI, calculateNEWS2 } = require("../helpers/triage-scorer");
const AppError = require("../../../core/errors/app.error");
const logger = require("../../../core/utils/logger");

/**
 * Check-in a patient into the Outpatient Department (OPD)
 * Generates official daily queue token (OPD-001, EMG-001) and opens Patient Encounter
 * 
 * @param {Object} data - Check-in payload
 * @param {string} createdById - User ID of receptionist / admissions officer
 */
async function checkInPatient(data, createdById) {
    const {
        hospitalId,
        patientId,
        department = "GENERAL_OPD",
        priority = "ROUTINE",
        chiefComplaint,
        notes
    } = data;

    if (!hospitalId || !patientId) {
        throw new AppError("Hospital ID and Patient ID are required for OPD check-in", 400, "MISSING_REQUIRED_FIELDS");
    }

    // Verify hospital exists
    const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId }
    });
    if (!hospital) {
        throw new AppError("Hospital not found", 404, "HOSPITAL_NOT_FOUND");
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
            folder: true
        }
    });
    if (!patient) {
        throw new AppError("Patient not found in Master Patient Index", 404, "PATIENT_NOT_FOUND");
    }

    // Normalize priority
    const normalizedPriority = ["EMERGENCY", "PRIORITY", "ROUTINE"].includes(String(priority).toUpperCase())
        ? String(priority).toUpperCase()
        : "ROUTINE";

    // Generate daily token and clinical encounter number
    const queueToken = await generateOpdToken(hospitalId, department, normalizedPriority);
    const encounterNumber = await generateEncounterNumber();

    // Create Encounter and Queue Ticket in atomic transaction
    const result = await prisma.$transaction(async (tx) => {
        const encounter = await tx.patientEncounter.create({
            data: {
                patientId,
                hospitalId,
                encounterNumber,
                encounterType: "OPD",
                status: "WAITING_TRIAGE",
                visitDate: new Date(),
                chiefComplaint: chiefComplaint || "General medical consultation",
                notes: notes || null,
                createdBy: createdById,
                queueToken,
                priority: normalizedPriority,
                triageStatus: "PENDING",
                triageRiskLevel: normalizedPriority === "EMERGENCY" ? "HIGH" : "ROUTINE"
            }
        });

        const ticket = await tx.opdQueueTicket.create({
            data: {
                hospitalId,
                encounterId: encounter.id,
                patientId,
                ticketNumber: queueToken,
                department,
                priority: normalizedPriority,
                status: "WAITING_TRIAGE"
            }
        });

        return { encounter, ticket };
    });

    logger.info("Patient checked into OPD queue successfully", {
        hospitalId,
        patientId,
        queueToken,
        encounterNumber: result.encounter.encounterNumber,
        priority: normalizedPriority
    });

    return {
        ...result,
        patient: {
            id: patient.id,
            mrn: patient.patientNumber,
            patientNumber: patient.patientNumber,
            fullName: `${patient.firstName} ${patient.lastName}`,
            gender: patient.gender,
            dateOfBirth: patient.dateOfBirth,
            phone: patient.phone,
            folderNumber: patient.folder ? patient.folder.folderNumber : null,
            shelfLocation: patient.folder ? patient.folder.shelfLocation : null
        }
    };
}

/**
 * Get Nurse Triage Queue
 * Ordered strictly by clinical priority (EMERGENCY > PRIORITY > ROUTINE) and FIFO arrival time
 * 
 * @param {string} hospitalId - Hospital ID
 * @param {Object} [filters] - Optional status/priority filters
 */
async function getNurseTriageQueue(hospitalId, filters = {}) {
    if (!hospitalId) {
        throw new AppError("Hospital ID is required", 400, "MISSING_HOSPITAL_ID");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where = {
        hospitalId,
        status: filters.status || "WAITING_TRIAGE",
        createdAt: { gte: today }
    };

    if (filters.priority) {
        where.priority = String(filters.priority).toUpperCase();
    }

    const tickets = await prisma.opdQueueTicket.findMany({
        where,
        include: {
            patient: {
                include: {
                    folder: true
                }
            },
            encounter: true
        },
        orderBy: {
            createdAt: "asc"
        }
    });

    // Priority rank: EMERGENCY (1), PRIORITY (2), ROUTINE (3)
    const priorityWeight = {
        EMERGENCY: 1,
        PRIORITY: 2,
        ROUTINE: 3
    };

    const sorted = tickets.sort((a, b) => {
        const weightA = priorityWeight[a.priority] || 4;
        const weightB = priorityWeight[b.priority] || 4;
        if (weightA !== weightB) {
            return weightA - weightB;
        }
        return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const now = Date.now();
    return sorted.map(ticket => {
        const waitMinutes = Math.floor((now - new Date(ticket.createdAt).getTime()) / 60000);
        return {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            priority: ticket.priority,
            status: ticket.status,
            department: ticket.department,
            waitTimeMinutes: waitMinutes,
            createdAt: ticket.createdAt,
            encounter: {
                id: ticket.encounter.id,
                encounterNumber: ticket.encounter.encounterNumber,
                chiefComplaint: ticket.encounter.chiefComplaint,
                triageStatus: ticket.encounter.triageStatus,
                triageRiskLevel: ticket.encounter.triageRiskLevel
            },
            patient: {
                id: ticket.patient.id,
                mrn: ticket.patient.patientNumber,
                patientNumber: ticket.patient.patientNumber,
                fullName: `${ticket.patient.firstName} ${ticket.patient.lastName}`,
                gender: ticket.patient.gender,
                dateOfBirth: ticket.patient.dateOfBirth,
                bloodGroup: ticket.patient.bloodGroup,
                genotype: ticket.patient.genotype,
                knownAllergies: ticket.patient.knownAllergies,
                chronicConditions: ticket.patient.chronicConditions,
                folderNumber: ticket.patient.folder ? ticket.patient.folder.folderNumber : null,
                shelfLocation: ticket.patient.folder ? ticket.patient.folder.shelfLocation : null
            }
        };
    });
}

/**
 * Record Nurse Triage & Physiological Vital Signs
 * Automatically computes BMI and NEWS2 early warning score
 * Automatically escalates high risk patients to emergency triage tier
 * 
 * @param {string} ticketOrEncounterId - Ticket ID or Encounter ID
 * @param {Object} triageData - Vital signs and clinical observation
 * @param {string} nurseUserId - User ID of the nurse
 */
async function recordNurseTriage(ticketOrEncounterId, triageData, nurseUserId) {
    if (!ticketOrEncounterId) {
        throw new AppError("Ticket ID or Encounter ID is required", 400, "MISSING_IDENTIFIER");
    }

    // Locate encounter and ticket
    let ticket = await prisma.opdQueueTicket.findUnique({
        where: { id: ticketOrEncounterId },
        include: { encounter: true, patient: true }
    });

    let encounter;
    if (ticket) {
        encounter = ticket.encounter;
    } else {
        encounter = await prisma.patientEncounter.findUnique({
            where: { id: ticketOrEncounterId },
            include: { queueTicket: true, patient: true }
        });
        if (encounter) {
            ticket = encounter.queueTicket;
        }
    }

    if (!encounter) {
        throw new AppError("Clinical Encounter or OPD Ticket not found", 404, "ENCOUNTER_NOT_FOUND");
    }

    const {
        temperature,
        pulseRate,
        respiratoryRate,
        systolicBP,
        diastolicBP,
        oxygenSaturation,
        weight,
        height,
        bloodGlucose,
        painScore,
        consciousness = "ALERT",
        triageNotes
    } = triageData;

    // Calculate BMI
    const bmiResult = calculateBMI(Number(weight), Number(height));

    // Calculate Adult NEWS2 Score
    const news2Result = calculateNEWS2({
        respiratoryRate,
        oxygenSaturation,
        systolicBP,
        pulseRate,
        consciousness,
        temperature
    });

    // Determine final clinical risk tier and escalation
    let effectiveRiskLevel = news2Result.riskCategory;
    let finalPriority = encounter.priority;

    if (news2Result.triggersImmediateEscalation || news2Result.news2Score >= 7) {
        finalPriority = "EMERGENCY";
        if (effectiveRiskLevel !== "CRITICAL") {
            effectiveRiskLevel = "HIGH";
        }
    }

    const triagedAt = new Date();

    const transactionResult = await prisma.$transaction(async (tx) => {
        // 1. Record vital signs entry
        const vitalSign = await tx.patientVitalSign.create({
            data: {
                patientId: encounter.patientId,
                encounterId: encounter.id,
                temperature: temperature != null ? Number(temperature) : null,
                pulseRate: pulseRate != null ? Number(pulseRate) : null,
                respiratoryRate: respiratoryRate != null ? Number(respiratoryRate) : null,
                systolicBP: systolicBP != null ? Number(systolicBP) : null,
                diastolicBP: diastolicBP != null ? Number(diastolicBP) : null,
                oxygenSaturation: oxygenSaturation != null ? Number(oxygenSaturation) : null,
                weight: weight != null ? Number(weight) : null,
                height: height != null ? Number(height) : null,
                bmi: bmiResult.bmi,
                bmiCategory: bmiResult.category,
                bloodGlucose: bloodGlucose != null ? Number(bloodGlucose) : null,
                painScore: painScore != null ? Number(painScore) : null,
                consciousness: String(consciousness).toUpperCase(),
                news2Score: news2Result.news2Score,
                riskCategory: effectiveRiskLevel,
                triageNotes: triageNotes || null,
                recordedBy: nurseUserId,
                recordedAt: triagedAt
            }
        });

        // 2. Update Patient Encounter
        const updatedEncounter = await tx.patientEncounter.update({
            where: { id: encounter.id },
            data: {
                triageStatus: "COMPLETED",
                triageRiskLevel: effectiveRiskLevel,
                triageNotes: triageNotes || null,
                triagedAt,
                status: "WAITING_DOCTOR",
                priority: finalPriority
            }
        });

        // 3. Update OPD Queue Ticket if exists
        let updatedTicket = null;
        if (ticket) {
            updatedTicket = await tx.opdQueueTicket.update({
                where: { id: ticket.id },
                data: {
                    status: "WAITING_DOCTOR",
                    triagedAt,
                    priority: finalPriority
                }
            });
        }

        return { vitalSign, encounter: updatedEncounter, ticket: updatedTicket };
    });

    logger.info("Nurse triage vitals recorded and scored", {
        encounterId: encounter.id,
        news2Score: news2Result.news2Score,
        riskCategory: effectiveRiskLevel,
        finalPriority,
        bmi: bmiResult.bmi
    });

    return {
        success: true,
        vitalSigns: transactionResult.vitalSign,
        encounter: transactionResult.encounter,
        ticket: transactionResult.ticket,
        news2: news2Result,
        bmi: bmiResult
    };
}

/**
 * Assign Doctor and Room to Patient Encounter
 * 
 * @param {string} encounterId - Encounter ID
 * @param {Object} assignmentData - { doctorId, doctorName, room }
 * @param {string} staffUserId - Staff user performing assignment
 */
async function assignDoctorAndRoom(encounterId, assignmentData, staffUserId) {
    const { doctorId, doctorName, room } = assignmentData;

    if (!encounterId) {
        throw new AppError("Encounter ID is required", 400, "MISSING_ENCOUNTER_ID");
    }

    const encounter = await prisma.patientEncounter.findUnique({
        where: { id: encounterId },
        include: { queueTicket: true }
    });

    if (!encounter) {
        throw new AppError("Encounter not found", 404, "ENCOUNTER_NOT_FOUND");
    }

    const updated = await prisma.$transaction(async (tx) => {
        const enc = await tx.patientEncounter.update({
            where: { id: encounterId },
            data: {
                assignedDoctorId: doctorId || encounter.assignedDoctorId,
                assignedDoctorName: doctorName || encounter.assignedDoctorName,
                assignedRoom: room || encounter.assignedRoom,
                status: "ASSIGNED_DOCTOR"
            }
        });

        if (encounter.queueTicket) {
            await tx.opdQueueTicket.update({
                where: { id: encounter.queueTicket.id },
                data: {
                    assignedRoom: room || encounter.queueTicket.assignedRoom,
                    assignedStaffId: doctorId || encounter.queueTicket.assignedStaffId,
                    status: "ASSIGNED_DOCTOR"
                }
            });
        }

        return enc;
    });

    return updated;
}

/**
 * Call Patient into Consulting Room
 * Transitions encounter and queue ticket to IN_CONSULTATION
 * 
 * @param {string} encounterId - Encounter ID
 * @param {string} doctorUserId - Calling Doctor User ID
 */
async function callPatientToDoctorRoom(encounterId, doctorUserId) {
    if (!encounterId) {
        throw new AppError("Encounter ID is required", 400, "MISSING_ENCOUNTER_ID");
    }

    const encounter = await prisma.patientEncounter.findUnique({
        where: { id: encounterId },
        include: { queueTicket: true }
    });

    if (!encounter) {
        throw new AppError("Encounter not found", 404, "ENCOUNTER_NOT_FOUND");
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
        const enc = await tx.patientEncounter.update({
            where: { id: encounterId },
            data: {
                status: "IN_CONSULTATION",
                consultationStartedAt: now
            }
        });

        if (encounter.queueTicket) {
            await tx.opdQueueTicket.update({
                where: { id: encounter.queueTicket.id },
                data: {
                    status: "IN_CONSULTATION",
                    calledAt: now
                }
            });
        }

        return enc;
    });

    return result;
}

/**
 * Complete Doctor Consultation for this Encounter
 * 
 * @param {string} encounterId - Encounter ID
 * @param {string} notes - Consultation summary notes
 * @param {string} doctorUserId - Completing Doctor User ID
 */
async function completeConsultation(encounterId, notes, doctorUserId) {
    if (!encounterId) {
        throw new AppError("Encounter ID is required", 400, "MISSING_ENCOUNTER_ID");
    }

    const encounter = await prisma.patientEncounter.findUnique({
        where: { id: encounterId },
        include: { queueTicket: true }
    });

    if (!encounter) {
        throw new AppError("Encounter not found", 404, "ENCOUNTER_NOT_FOUND");
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
        const enc = await tx.patientEncounter.update({
            where: { id: encounterId },
            data: {
                status: "COMPLETED",
                consultationCompletedAt: now,
                notes: notes ? `${encounter.notes ? encounter.notes + "\n" : ""}${notes}` : encounter.notes
            }
        });

        if (encounter.queueTicket) {
            await tx.opdQueueTicket.update({
                where: { id: encounter.queueTicket.id },
                data: {
                    status: "COMPLETED",
                    completedAt: now
                }
            });
        }

        return enc;
    });

    return result;
}

/**
 * Get Doctor Waiting Queue
 * Returns patients triaged and waiting for consultation
 * 
 * @param {string} hospitalId - Hospital ID
 * @param {string} [doctorId] - Optional specific doctor ID
 * @param {Object} [options] - Optional filter options
 */
async function getDoctorWaitingQueue(hospitalId, doctorId = null, options = {}) {
    if (!hospitalId) {
        throw new AppError("Hospital ID is required", 400, "MISSING_HOSPITAL_ID");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where = {
        hospitalId,
        status: { in: ["WAITING_DOCTOR", "ASSIGNED_DOCTOR"] },
        visitDate: { gte: today }
    };

    if (doctorId) {
        where.OR = [
            { assignedDoctorId: doctorId },
            { assignedDoctorId: null }
        ];
    }

    const encounters = await prisma.patientEncounter.findMany({
        where,
        include: {
            patient: {
                include: { folder: true }
            },
            vitalSigns: {
                orderBy: { recordedAt: "desc" },
                take: 1
            },
            queueTicket: true
        },
        orderBy: {
            createdAt: "asc"
        }
    });

    // Priority sorting: EMERGENCY (1), HIGH risk (2), PRIORITY (3), ROUTINE (4)
    const priorityWeight = {
        EMERGENCY: 1,
        PRIORITY: 3,
        ROUTINE: 4
    };

    const sorted = encounters.sort((a, b) => {
        const riskA = a.triageRiskLevel === "CRITICAL" ? 1 : a.triageRiskLevel === "HIGH" ? 2 : priorityWeight[a.priority] || 4;
        const riskB = b.triageRiskLevel === "CRITICAL" ? 1 : b.triageRiskLevel === "HIGH" ? 2 : priorityWeight[b.priority] || 4;
        if (riskA !== riskB) {
            return riskA - riskB;
        }
        return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return sorted.map(enc => ({
        encounterId: enc.id,
        encounterNumber: enc.encounterNumber,
        queueToken: enc.queueToken,
        priority: enc.priority,
        status: enc.status,
        triageRiskLevel: enc.triageRiskLevel,
        chiefComplaint: enc.chiefComplaint,
        assignedRoom: enc.assignedRoom,
        assignedDoctorName: enc.assignedDoctorName,
        triagedAt: enc.triagedAt,
        latestVitals: enc.vitalSigns && enc.vitalSigns.length > 0 ? enc.vitalSigns[0] : null,
        patient: {
            id: enc.patient.id,
            mrn: enc.patient.patientNumber,
            patientNumber: enc.patient.patientNumber,
            fullName: `${enc.patient.firstName} ${enc.patient.lastName}`,
            gender: enc.patient.gender,
            dateOfBirth: enc.patient.dateOfBirth,
            bloodGroup: enc.patient.bloodGroup,
            folderNumber: enc.patient.folder ? enc.patient.folder.folderNumber : null,
            shelfLocation: enc.patient.folder ? enc.patient.folder.shelfLocation : null
        }
    }));
}

/**
 * Get Nurse Dashboard Telemetry & Clinical Statistics
 * 
 * @param {string} hospitalId - Hospital ID
 */
async function getNurseDashboardTelemetry(hospitalId) {
    if (!hospitalId) {
        throw new AppError("Hospital ID is required", 400, "MISSING_HOSPITAL_ID");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        totalCheckedInToday,
        waitingForTriage,
        triagedWaitingDoctor,
        inConsultation,
        completedToday,
        criticalAlertsCount,
        recentVitals
    ] = await Promise.all([
        prisma.opdQueueTicket.count({
            where: { hospitalId, createdAt: { gte: today } }
        }),
        prisma.opdQueueTicket.count({
            where: { hospitalId, status: "WAITING_TRIAGE", createdAt: { gte: today } }
        }),
        prisma.opdQueueTicket.count({
            where: { hospitalId, status: { in: ["WAITING_DOCTOR", "ASSIGNED_DOCTOR"] }, createdAt: { gte: today } }
        }),
        prisma.opdQueueTicket.count({
            where: { hospitalId, status: "IN_CONSULTATION", createdAt: { gte: today } }
        }),
        prisma.opdQueueTicket.count({
            where: { hospitalId, status: "COMPLETED", createdAt: { gte: today } }
        }),
        prisma.patientEncounter.count({
            where: {
                hospitalId,
                visitDate: { gte: today },
                OR: [
                    { priority: "EMERGENCY" },
                    { triageRiskLevel: { in: ["CRITICAL", "HIGH"] } }
                ]
            }
        }),
        prisma.patientVitalSign.findMany({
            where: {
                encounter: { hospitalId },
                recordedAt: { gte: today }
            },
            include: {
                patient: {
                    select: { firstName: true, lastName: true, patientNumber: true }
                },
                encounter: {
                    select: { queueToken: true, encounterNumber: true }
                }
            },
            orderBy: { recordedAt: "desc" },
            take: 10
        })
    ]);

    return {
        timestamp: new Date(),
        telemetry: {
            totalCheckedInToday,
            waitingForTriage,
            triagedWaitingDoctor,
            inConsultation,
            completedToday,
            criticalAlertsCount
        },
        recentVitals: recentVitals.map(v => ({
            id: v.id,
            patientName: `${v.patient.firstName} ${v.patient.lastName}`,
            mrn: v.patient.patientNumber,
            patientNumber: v.patient.patientNumber,
            queueToken: v.encounter.queueToken,
            temperature: v.temperature,
            pulseRate: v.pulseRate,
            bloodPressure: v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : null,
            oxygenSaturation: v.oxygenSaturation,
            bmi: v.bmi,
            bmiCategory: v.bmiCategory,
            news2Score: v.news2Score,
            riskCategory: v.riskCategory,
            recordedAt: v.recordedAt
        }))
    };
}

/**
 * Get Single Encounter Details with Vitals and Ticket
 * 
 * @param {string} encounterId - Encounter ID
 */
async function getEncounterById(encounterId) {
    if (!encounterId) {
        throw new AppError("Encounter ID is required", 400, "MISSING_ENCOUNTER_ID");
    }

    const encounter = await prisma.patientEncounter.findUnique({
        where: { id: encounterId },
        include: {
            patient: {
                include: { folder: true }
            },
            queueTicket: true,
            vitalSigns: {
                orderBy: { recordedAt: "desc" }
            }
        }
    });

    if (!encounter) {
        throw new AppError("Encounter not found", 404, "ENCOUNTER_NOT_FOUND");
    }

    return encounter;
}

module.exports = {
    checkInPatient,
    getNurseTriageQueue,
    recordNurseTriage,
    assignDoctorAndRoom,
    callPatientToDoctorRoom,
    completeConsultation,
    getDoctorWaitingQueue,
    getNurseDashboardTelemetry,
    getEncounterById
};
