"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ENTERPRISE LABORATORY & PATHOLOGY SERVICE
Real PostgreSQL Persistence, Specimen Barcode Accessioning, Panic Value Engine & Verification
LOCATION: src/modules/laboratory/services/laboratory.service.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");
const { generateLabRequestNumber, generateSampleBarcode } = require("../helpers/lab-id.generator");
const { LAB_PANELS, evaluateResultFlag } = require("../helpers/lab-catalogs");
const AppError = require("../../../core/errors/app.error");
const logger = require("../../../core/utils/logger");

/**
 * Order a new laboratory diagnostic investigation
 * 
 * @param {Object} requestData - Order payload
 * @param {Object} requestingUser - Authenticated ordering user
 */
async function createLabRequest(requestData, requestingUser) {
    const {
        encounterId,
        testName,
        testCode,
        department,
        priority = "ROUTINE",
        clinicalNotes,
        specimenType: explicitSpecimenType
    } = requestData;

    if (!encounterId) {
        throw new AppError("Clinical Encounter ID is required", 400, "MISSING_ENCOUNTER_ID");
    }

    if (!testName || !testName.trim()) {
        throw new AppError("Laboratory test name is required", 400, "MISSING_TEST_NAME");
    }

    const encounter = await prisma.patientEncounter.findUnique({
        where: { id: encounterId },
        include: { patient: true }
    });

    if (!encounter) {
        throw new AppError("Clinical Encounter not found", 404, "ENCOUNTER_NOT_FOUND");
    }

    // Auto-resolve panel metadata if standard testCode provided
    const panel = testCode ? LAB_PANELS[testCode.trim().toUpperCase()] : null;
    const resolvedDepartment = department || panel?.department || "General Pathology";
    const resolvedSpecimenType = explicitSpecimenType || panel?.specimenType || "WHOLE_BLOOD";

    const requestNumber = await generateLabRequestNumber();
    const requestingUserId = requestingUser ? requestingUser.id : null;

    const labRequest = await prisma.laboratoryRequest.create({
        data: {
            encounterId,
            requestNumber,
            testName: testName.trim(),
            testCode: testCode ? testCode.trim().toUpperCase() : panel?.code || null,
            department: resolvedDepartment,
            priority: priority ? priority.trim().toUpperCase() : "ROUTINE",
            clinicalNotes: clinicalNotes ? clinicalNotes.trim() : null,
            specimenType: resolvedSpecimenType,
            status: "REQUESTED"
        },
        include: {
            encounter: {
                include: { patient: true }
            }
        }
    });

    logger.info({
        message: "Laboratory request created successfully",
        requestNumber: labRequest.requestNumber,
        testName: labRequest.testName,
        encounterId
    });

    return {
        id: labRequest.id,
        requestNumber: labRequest.requestNumber,
        testName: labRequest.testName,
        testCode: labRequest.testCode,
        department: labRequest.department,
        priority: labRequest.priority,
        status: labRequest.status,
        specimenType: labRequest.specimenType,
        patient: {
            id: encounter.patient.id,
            name: `${encounter.patient.firstName} ${encounter.patient.lastName}`,
            mrn: encounter.patient.patientNumber
        },
        createdAt: labRequest.createdAt
    };
}

/**
 * List laboratory requests with filtering, pagination, and clinical priority sorting
 * 
 * @param {Object} [filterOptions]
 */
async function getLabRequests(filterOptions = {}) {
    const {
        status,
        department,
        priority,
        patientId,
        mrn,
        limit = 50,
        page = 1
    } = filterOptions;

    const where = {};

    if (status) {
        where.status = { equals: status.trim().toUpperCase() };
    }

    if (department) {
        where.department = { contains: department.trim(), mode: "insensitive" };
    }

    if (priority) {
        where.priority = { equals: priority.trim().toUpperCase() };
    }

    if (patientId) {
        where.encounter = { patientId };
    }

    if (mrn) {
        where.encounter = {
            patient: { patientNumber: { contains: mrn.trim(), mode: "insensitive" } }
        };
    }

    const take = Math.min(Number(limit) || 50, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const [requests, total] = await Promise.all([
        prisma.laboratoryRequest.findMany({
            where,
            include: {
                encounter: {
                    include: { patient: true }
                },
                samples: true,
                testResults: true
            },
            orderBy: [
                { priority: "desc" }, // STAT_EMERGENCY > URGENT > ROUTINE
                { createdAt: "asc" }  // FIFO
            ],
            take,
            skip
        }),
        prisma.laboratoryRequest.count({ where })
    ]);

    const formatted = requests.map(req => {
        const patient = req.encounter?.patient;
        return {
            id: req.id,
            requestNumber: req.requestNumber,
            testName: req.testName,
            testCode: req.testCode,
            department: req.department,
            priority: req.priority,
            status: req.status,
            specimenType: req.specimenType,
            clinicalNotes: req.clinicalNotes,
            patient: patient ? {
                id: patient.id,
                mrn: patient.patientNumber,
                name: `${patient.firstName} ${patient.lastName}`,
                gender: patient.gender,
                dateOfBirth: patient.dateOfBirth
            } : null,
            samplesCount: req.samples.length,
            resultsCount: req.testResults.length,
            createdAt: req.createdAt
        };
    });

    return {
        total,
        page: Number(page) || 1,
        limit: take,
        items: formatted
    };
}

/**
 * Get comprehensive laboratory investigation dossier by Request ID
 * 
 * @param {string} requestId
 */
async function getLabRequestById(requestId) {
    if (!requestId) {
        throw new AppError("Request ID is required", 400, "MISSING_REQUEST_ID");
    }

    const labRequest = await prisma.laboratoryRequest.findUnique({
        where: { id: requestId },
        include: {
            encounter: {
                include: { patient: true }
            },
            samples: {
                orderBy: { collectedAt: "asc" }
            },
            testResults: {
                orderBy: { createdAt: "asc" }
            }
        }
    });

    if (!labRequest) {
        throw new AppError("Laboratory request not found", 404, "LAB_REQUEST_NOT_FOUND");
    }

    const patient = labRequest.encounter?.patient;

    return {
        id: labRequest.id,
        requestNumber: labRequest.requestNumber,
        testName: labRequest.testName,
        testCode: labRequest.testCode,
        department: labRequest.department,
        priority: labRequest.priority,
        status: labRequest.status,
        clinicalNotes: labRequest.clinicalNotes,
        specimenType: labRequest.specimenType,
        resultSummary: labRequest.result,
        resultDate: labRequest.resultDate,
        verification: {
            verifiedByName: labRequest.verifiedByName,
            verifiedAt: labRequest.verifiedAt,
            isVerified: labRequest.status === "VERIFIED"
        },
        patient: patient ? {
            id: patient.id,
            mrn: patient.patientNumber,
            name: `${patient.firstName} ${patient.lastName}`,
            gender: patient.gender,
            dateOfBirth: patient.dateOfBirth,
            phone: patient.phone
        } : null,
        samples: labRequest.samples.map(s => ({
            id: s.id,
            sampleBarcode: s.sampleBarcode,
            specimenType: s.specimenType,
            tubeColor: s.tubeColor,
            collectionVolume: s.collectionVolume,
            collectedByName: s.collectedByName,
            collectedAt: s.collectedAt,
            receivedByName: s.receivedByName,
            receivedAt: s.receivedAt,
            status: s.status,
            notes: s.notes
        })),
        parameters: labRequest.testResults.map(r => ({
            id: r.id,
            parameterName: r.parameterName,
            parameterCode: r.parameterCode,
            measuredValue: r.measuredValue,
            numericValue: r.numericValue,
            unit: r.unit,
            referenceRange: r.referenceRangeText,
            abnormalFlag: r.abnormalFlag,
            notes: r.notes
        })),
        createdAt: labRequest.createdAt,
        updatedAt: labRequest.updatedAt
    };
}

/**
 * Phlebotomy / Nurse collects specimen sample from patient
 * 
 * @param {string} requestId
 * @param {Object} specimenData
 * @param {Object} phlebotomistUser
 */
async function collectSpecimen(requestId, specimenData = {}, phlebotomistUser) {
    if (!requestId) {
        throw new AppError("Request ID is required", 400, "MISSING_REQUEST_ID");
    }

    const labRequest = await prisma.laboratoryRequest.findUnique({
        where: { id: requestId },
        include: { encounter: true }
    });

    if (!labRequest) {
        throw new AppError("Laboratory request not found", 404, "LAB_REQUEST_NOT_FOUND");
    }

    if (labRequest.status !== "REQUESTED") {
        throw new AppError(`Cannot collect specimen for request in '${labRequest.status}' status`, 409, "INVALID_REQUEST_STATUS");
    }

    const panel = labRequest.testCode ? LAB_PANELS[labRequest.testCode] : null;
    const {
        specimenType = labRequest.specimenType || panel?.specimenType || "WHOLE_BLOOD",
        tubeColor = panel?.tubeColor || "EDTA_PURPLE",
        collectionVolume = "4.0 mL",
        notes
    } = specimenData;

    const sampleBarcode = await generateSampleBarcode();
    const phlebotomistName = phlebotomistUser
        ? `${phlebotomistUser.firstName || ""} ${phlebotomistUser.lastName || ""}`.trim() || phlebotomistUser.email
        : "Clinical Phlebotomist";

    const result = await prisma.$transaction(async (tx) => {
        const sample = await tx.laboratorySample.create({
            data: {
                sampleBarcode,
                requestId: labRequest.id,
                patientId: labRequest.encounter.patientId,
                specimenType: specimenType.toUpperCase(),
                tubeColor: tubeColor.toUpperCase(),
                collectionVolume,
                collectedById: phlebotomistUser ? phlebotomistUser.id : null,
                collectedByName: phlebotomistName,
                status: "COLLECTED",
                notes: notes ? notes.trim() : null
            }
        });

        const updatedRequest = await tx.laboratoryRequest.update({
            where: { id: labRequest.id },
            data: { status: "SAMPLE_COLLECTED" }
        });

        return { sample, updatedRequest };
    });

    logger.info({
        message: "Laboratory specimen collected successfully",
        sampleBarcode: result.sample.sampleBarcode,
        requestId,
        specimenType: result.sample.specimenType
    });

    return {
        sampleBarcode: result.sample.sampleBarcode,
        specimenType: result.sample.specimenType,
        tubeColor: result.sample.tubeColor,
        collectionVolume: result.sample.collectionVolume,
        collectedByName: phlebotomistName,
        collectedAt: result.sample.collectedAt,
        status: result.sample.status,
        requestStatus: result.updatedRequest.status
    };
}

/**
 * Accession specimen into laboratory workqueue
 * 
 * @param {string} sampleBarcode
 * @param {Object} labTechUser
 */
async function receiveSpecimenInLab(sampleBarcode, labTechUser) {
    if (!sampleBarcode || !sampleBarcode.trim()) {
        throw new AppError("Sample barcode is required", 400, "MISSING_SAMPLE_BARCODE");
    }

    const sample = await prisma.laboratorySample.findUnique({
        where: { sampleBarcode: sampleBarcode.trim().toUpperCase() },
        include: { request: true }
    });

    if (!sample) {
        throw new AppError(`Specimen with barcode '${sampleBarcode}' not found`, 404, "SAMPLE_NOT_FOUND");
    }

    const labTechName = labTechUser
        ? `${labTechUser.firstName || ""} ${labTechUser.lastName || ""}`.trim() || labTechUser.email
        : "Medical Laboratory Scientist";

    const result = await prisma.$transaction(async (tx) => {
        const updatedSample = await tx.laboratorySample.update({
            where: { id: sample.id },
            data: {
                status: "RECEIVED_IN_LAB",
                receivedById: labTechUser ? labTechUser.id : null,
                receivedByName: labTechName,
                receivedAt: new Date()
            }
        });

        const updatedRequest = await tx.laboratoryRequest.update({
            where: { id: sample.requestId },
            data: { status: "RECEIVED_IN_LAB" }
        });

        return { updatedSample, updatedRequest };
    });

    logger.info({
        message: "Specimen accessioned in laboratory",
        sampleBarcode: sample.sampleBarcode,
        receivedByName: labTechName
    });

    return {
        sampleBarcode: result.updatedSample.sampleBarcode,
        status: result.updatedSample.status,
        receivedByName: labTechName,
        receivedAt: result.updatedSample.receivedAt,
        requestNumber: result.updatedRequest.requestNumber,
        requestStatus: result.updatedRequest.status
    };
}

/**
 * Record laboratory test parameter results with automatic abnormal & panic value calculation
 * 
 * @param {string} requestId
 * @param {Object} resultPayload
 * @param {Object} labTechUser
 */
async function enterTestResults(requestId, resultPayload, labTechUser) {
    if (!requestId) {
        throw new AppError("Request ID is required", 400, "MISSING_REQUEST_ID");
    }

    const labRequest = await prisma.laboratoryRequest.findUnique({
        where: { id: requestId },
        include: {
            encounter: {
                include: { patient: true }
            }
        }
    });

    if (!labRequest) {
        throw new AppError("Laboratory request not found", 404, "LAB_REQUEST_NOT_FOUND");
    }

    const {
        parameters = [],
        summaryResult,
        clinicalRemarks
    } = resultPayload;

    if (!Array.isArray(parameters) || parameters.length === 0) {
        throw new AppError("At least one test result parameter is required", 400, "MISSING_TEST_PARAMETERS");
    }

    const patientGender = labRequest.encounter?.patient?.gender || "MALE";
    const panel = labRequest.testCode ? LAB_PANELS[labRequest.testCode] : null;

    let hasCriticalPanicAlert = false;
    const evaluatedResults = [];

    for (const p of parameters) {
        if (!p.parameterName || p.measuredValue === undefined || p.measuredValue === null) {
            continue;
        }

        // Find reference catalog parameter definition if available
        let catalogParam = panel?.parameters?.find(
            cp => cp.code === p.parameterCode || cp.name.toLowerCase() === p.parameterName.toLowerCase()
        );

        if (!catalogParam) {
            for (const pnl of Object.values(LAB_PANELS)) {
                const found = pnl.parameters?.find(
                    cp => cp.code === p.parameterCode || cp.name.toLowerCase() === p.parameterName.toLowerCase()
                );
                if (found) {
                    catalogParam = found;
                    break;
                }
            }
        }

        const evalResult = evaluateResultFlag(catalogParam, p.measuredValue, patientGender);
        if (evalResult.isPanic) {
            hasCriticalPanicAlert = true;
        }

        const numVal = parseFloat(p.measuredValue);

        evaluatedResults.push({
            parameterName: p.parameterName.trim(),
            parameterCode: p.parameterCode ? p.parameterCode.trim().toUpperCase() : catalogParam?.code || null,
            measuredValue: String(p.measuredValue).trim(),
            numericValue: isNaN(numVal) ? null : numVal,
            unit: p.unit || catalogParam?.unit || null,
            referenceRangeText: p.referenceRange || evalResult.refRangeText,
            abnormalFlag: p.abnormalFlag || evalResult.flag,
            notes: p.notes || null
        });
    }

    const labTechName = labTechUser
        ? `${labTechUser.firstName || ""} ${labTechUser.lastName || ""}`.trim() || labTechUser.email
        : "Medical Laboratory Scientist";

    const resultSummaryText = summaryResult || evaluatedResults.map(r => `${r.parameterName}: ${r.measuredValue} ${r.unit || ""}`.trim()).join(", ");

    const result = await prisma.$transaction(async (tx) => {
        // Clear old results if re-entering
        await tx.laboratoryTestResult.deleteMany({
            where: { requestId: labRequest.id }
        });

        // Create new parameter records
        const createdResults = [];
        for (const item of evaluatedResults) {
            const res = await tx.laboratoryTestResult.create({
                data: {
                    requestId: labRequest.id,
                    ...item
                }
            });
            createdResults.push(res);
        }

        let staffId = null;
        if (labTechUser) {
            const staff = await tx.hospitalStaff.findFirst({
                where: {
                    OR: [
                        { id: labTechUser.id },
                        { email: labTechUser.email }
                    ]
                }
            });
            if (staff) {
                staffId = staff.id;
            }
        }

        // Update Request status to COMPLETED (ready for verification)
        const updatedRequest = await tx.laboratoryRequest.update({
            where: { id: labRequest.id },
            data: {
                status: "COMPLETED",
                result: resultSummaryText,
                resultDate: new Date(),
                performedById: staffId
            }
        });

        return { createdResults, updatedRequest };
    });

    logger.info({
        message: "Laboratory results entered",
        requestId: labRequest.id,
        parametersCount: evaluatedResults.length,
        hasCriticalPanicAlert
    });

    return {
        requestId: labRequest.id,
        requestNumber: result.updatedRequest.requestNumber,
        status: result.updatedRequest.status,
        resultSummary: result.updatedRequest.result,
        resultDate: result.updatedRequest.resultDate,
        hasCriticalPanicAlert,
        parameters: result.createdResults.map(r => ({
            id: r.id,
            parameterName: r.parameterName,
            parameterCode: r.parameterCode,
            measuredValue: r.measuredValue,
            unit: r.unit,
            referenceRange: r.referenceRangeText,
            abnormalFlag: r.abnormalFlag
        }))
    };
}

/**
 * Pathologist or Senior Laboratory Scientist verifies and releases official report
 * 
 * @param {string} requestId
 * @param {Object} verificationData
 * @param {Object} verifierUser
 */
async function verifyAndReleaseResults(requestId, verificationData = {}, verifierUser) {
    if (!requestId) {
        throw new AppError("Request ID is required", 400, "MISSING_REQUEST_ID");
    }

    const labRequest = await prisma.laboratoryRequest.findUnique({
        where: { id: requestId },
        include: {
            encounter: {
                include: { patient: true }
            },
            testResults: true
        }
    });

    if (!labRequest) {
        throw new AppError("Laboratory request not found", 404, "LAB_REQUEST_NOT_FOUND");
    }

    if (labRequest.status !== "COMPLETED") {
        throw new AppError(`Cannot verify laboratory report in '${labRequest.status}' status. Results must be entered first.`, 409, "NOT_READY_FOR_VERIFICATION");
    }

    const verifierName = verifierUser
        ? `${verifierUser.firstName || ""} ${verifierUser.lastName || ""}`.trim() || verifierUser.email
        : "Consultant Clinical Pathologist";

    const updated = await prisma.laboratoryRequest.update({
        where: { id: labRequest.id },
        data: {
            status: "VERIFIED",
            verifiedById: verifierUser ? verifierUser.id : null,
            verifiedByName: verifierName,
            verifiedAt: new Date()
        },
        include: {
            testResults: true,
            encounter: {
                include: { patient: true }
            }
        }
    });

    logger.info({
        message: "Laboratory report verified and released",
        requestId,
        verifiedByName: verifierName
    });

    return {
        id: updated.id,
        requestNumber: updated.requestNumber,
        testName: updated.testName,
        department: updated.department,
        status: updated.status,
        resultSummary: updated.result,
        verifiedByName: updated.verifiedByName,
        verifiedAt: updated.verifiedAt,
        patient: {
            name: `${updated.encounter.patient.firstName} ${updated.encounter.patient.lastName}`,
            mrn: updated.encounter.patient.patientNumber
        },
        parametersCount: updated.testResults.length
    };
}

/**
 * Real-Time Laboratory & Pathology Dashboard Telemetry directly from PostgreSQL
 */
async function getLaboratoryDashboardTelemetry() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
        totalRequests,
        pendingCollectionCount,
        sampleCollectedCount,
        inLabProcessingCount,
        completedAwaitingVerificationCount,
        verifiedTodayCount,
        emergencyStatCount,
        panicResultsToday
    ] = await Promise.all([
        prisma.laboratoryRequest.count(),
        prisma.laboratoryRequest.count({ where: { status: "REQUESTED" } }),
        prisma.laboratoryRequest.count({ where: { status: "SAMPLE_COLLECTED" } }),
        prisma.laboratoryRequest.count({ where: { status: { in: ["RECEIVED_IN_LAB", "IN_ANALYSIS"] } } }),
        prisma.laboratoryRequest.count({ where: { status: "COMPLETED" } }),
        prisma.laboratoryRequest.count({
            where: {
                status: "VERIFIED",
                verifiedAt: { gte: todayStart }
            }
        }),
        prisma.laboratoryRequest.count({
            where: {
                priority: "STAT_EMERGENCY",
                status: { not: "VERIFIED" }
            }
        }),
        prisma.laboratoryTestResult.count({
            where: {
                abnormalFlag: { in: ["CRITICAL_PANIC_LOW", "CRITICAL_PANIC_HIGH"] },
                createdAt: { gte: todayStart }
            }
        })
    ]);

    return {
        operationalStats: {
            totalRequests,
            pendingCollectionCount,
            sampleCollectedCount,
            inLabProcessingCount,
            completedAwaitingVerificationCount,
            verifiedTodayCount,
            emergencyStatCount,
            criticalPanicAlertsTodayCount: panicResultsToday
        },
        themeMetadata: {
            role: "LAB_TECHNICIAN",
            heroImage: "/assets/images/roles/lab_pathology_hero.jpg",
            icon: "/assets/images/icons/microscope_flask_icon.png",
            colorPalette: {
                primary: "#4f46e5",      // Indigo
                secondary: "#06b6d4",    // Cyan
                accent: "#ef4444",       // Critical alert red
                background: "#eef2ff"    // Soft indigo background
            },
            badge: "CLINICAL_PATHOLOGY_LABORATORY",
            title: "Hospital Diagnostic Pathology & Clinical Laboratory"
        },
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    createLabRequest,
    getLabRequests,
    getLabRequestById,
    collectSpecimen,
    receiveSpecimenInLab,
    enterTestResults,
    verifyAndReleaseResults,
    getLaboratoryDashboardTelemetry
};
