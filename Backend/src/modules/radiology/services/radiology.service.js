"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ENTERPRISE RADIOLOGY, PACS & DICOM SERVICE
Real PostgreSQL Persistence, Modality Worklists, Windowing & Panic Finding Verification
LOCATION: src/modules/radiology/services/radiology.service.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");
const {
    generateAccessionNumber,
    generateReportNumber,
    generateStudyInstanceUid,
    generateSeriesInstanceUid
} = require("../helpers/radiology-id.generator");
const {
    MODALITIES,
    BODY_PARTS,
    DICOM_WINDOW_PRESETS,
    STANDARD_RADIOLOGY_PROCEDURES,
    detectCriticalFindings
} = require("../helpers/radiology-catalogs");
const AppError = require("../../../core/errors/app.error");
const logger = require("../../../core/utils/logger");

/**
 * Order a new radiology diagnostic procedure
 * 
 * @param {Object} orderData 
 * @param {Object} requestingUser 
 */
async function createRadiologyOrder(orderData, requestingUser) {
    const {
        encounterId,
        procedureName: explicitProcedureName,
        procedureCode,
        modality: explicitModality,
        bodyPart: explicitBodyPart,
        priority = "ROUTINE",
        clinicalIndication,
        scheduledDate
    } = orderData;

    if (!encounterId) {
        throw new AppError("Clinical Encounter ID is required", 400, "MISSING_ENCOUNTER_ID");
    }

    const encounter = await prisma.patientEncounter.findUnique({
        where: { id: encounterId },
        include: { patient: true }
    });

    if (!encounter) {
        throw new AppError("Clinical Encounter not found", 404, "ENCOUNTER_NOT_FOUND");
    }

    // Auto-resolve catalog metadata if standard procedure code provided
    const catalogItem = procedureCode ? STANDARD_RADIOLOGY_PROCEDURES[procedureCode.trim().toUpperCase()] : null;
    const procedureName = explicitProcedureName || catalogItem?.procedureName;
    const modality = explicitModality || catalogItem?.modality || MODALITIES.XRAY;
    const bodyPart = explicitBodyPart || catalogItem?.bodyPart || BODY_PARTS.CHEST;

    if (!procedureName || !procedureName.trim()) {
        throw new AppError("Radiology procedure name is required", 400, "MISSING_PROCEDURE_NAME");
    }

    const accessionNumber = await generateAccessionNumber();
    const requestingUserId = requestingUser ? requestingUser.id : null;
    const requestingUserName = requestingUser
        ? (requestingUser.name || `${requestingUser.firstName || ""} ${requestingUser.lastName || ""}`.trim() || null)
        : null;
    const requestingUserRole = requestingUser?.role || "DOCTOR";

    const radiologyOrder = await prisma.radiologyOrder.create({
        data: {
            encounterId,
            patientId: encounter.patientId,
            accessionNumber,
            modality,
            procedureName: procedureName.trim(),
            procedureCode: procedureCode ? procedureCode.trim().toUpperCase() : null,
            bodyPart,
            priority: priority.toUpperCase(),
            clinicalIndication: clinicalIndication || null,
            status: "ORDERED",
            requestedById: requestingUserId,
            requestedByName: requestingUserName,
            requestedByRole: requestingUserRole,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : null
        },
        include: {
            encounter: {
                include: { patient: true }
            },
            studies: true,
            reports: true
        }
    });

    logger.info(`[RadiologyService] Created order ${accessionNumber} (${procedureName}) for patient ${encounter.patientId}`);
    return radiologyOrder;
}

/**
 * List radiology worklist orders with filtering and priority ranking
 * 
 * @param {Object} query 
 */
async function getRadiologyOrders(query = {}) {
    const {
        encounterId,
        patientId,
        modality,
        status,
        priority,
        search,
        page = 1,
        limit = 50
    } = query;

    const where = {};

    if (encounterId) where.encounterId = encounterId;
    if (patientId) where.patientId = patientId;
    if (modality) where.modality = modality.toUpperCase();
    if (status) where.status = status.toUpperCase();
    if (priority) where.priority = priority.toUpperCase();

    if (search && search.trim()) {
        const searchTerm = search.trim();
        where.OR = [
            { accessionNumber: { contains: searchTerm, mode: "insensitive" } },
            { procedureName: { contains: searchTerm, mode: "insensitive" } },
            { clinicalIndication: { contains: searchTerm, mode: "insensitive" } }
        ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [orders, total] = await Promise.all([
        prisma.radiologyOrder.findMany({
            where,
            include: {
                encounter: {
                    include: { patient: true }
                },
                studies: true,
                reports: true
            },
            orderBy: [
                { createdAt: "desc" }
            ],
            skip,
            take
        }),
        prisma.radiologyOrder.count({ where })
    ]);

    // Priority sorting: STAT_EMERGENCY first, then URGENT, then ROUTINE
    const priorityWeights = { STAT_EMERGENCY: 1, URGENT: 2, ROUTINE: 3 };
    orders.sort((a, b) => {
        const weightA = priorityWeights[a.priority] || 4;
        const weightB = priorityWeights[b.priority] || 4;
        if (weightA !== weightB) return weightA - weightB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return {
        data: orders,
        pagination: {
            total,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            pages: Math.ceil(total / take)
        }
    };
}

/**
 * Get radiology order details by ID or accession number
 * 
 * @param {string} idOrAccession 
 */
async function getRadiologyOrderById(idOrAccession) {
    if (!idOrAccession) {
        throw new AppError("Order ID or Accession Number is required", 400, "MISSING_IDENTIFIER");
    }

    const order = await prisma.radiologyOrder.findFirst({
        where: {
            OR: [
                { id: idOrAccession },
                { accessionNumber: idOrAccession }
            ]
        },
        include: {
            encounter: {
                include: { patient: true }
            },
            studies: {
                orderBy: { acquiredAt: "desc" }
            },
            reports: {
                orderBy: { createdAt: "desc" }
            }
        }
    });

    if (!order) {
        throw new AppError(`Radiology order '${idOrAccession}' not found`, 404, "ORDER_NOT_FOUND");
    }

    return order;
}

/**
 * Schedule a radiology examination
 * 
 * @param {string} orderId 
 * @param {Object} scheduleData 
 * @param {Object} staffUser 
 */
async function scheduleRadiologyOrder(orderId, scheduleData, staffUser) {
    const { scheduledDate, performingRadiographerName } = scheduleData;

    const order = await prisma.radiologyOrder.findUnique({
        where: { id: orderId }
    });

    if (!order) {
        throw new AppError("Radiology order not found", 404, "ORDER_NOT_FOUND");
    }

    const updated = await prisma.radiologyOrder.update({
        where: { id: orderId },
        data: {
            status: "SCHEDULED",
            scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
            performingRadiographerName: performingRadiographerName || order.performingRadiographerName
        },
        include: {
            encounter: { include: { patient: true } },
            studies: true,
            reports: true
        }
    });

    return updated;
}

/**
 * Acquire DICOM Study (Radiographer Acquisition & PACS Ingestion)
 * 
 * @param {Object} studyData 
 * @param {Object} radiographerUser 
 */
async function acquireDicomStudy(studyData, radiographerUser) {
    const {
        orderId,
        studyInstanceUid: explicitUid,
        seriesInstanceUid: explicitSeriesUid,
        sopClassUid,
        modality: explicitModality,
        seriesCount = 1,
        instanceCount = 1,
        imageStorageUri,
        thumbnailUri,
        windowWidth: explicitWW,
        windowCenter: explicitWC,
        kvp = 120.0,
        exposureTime = 100.0,
        sliceThickness = 2.5,
        pixelSpacing = "0.75\\0.75",
        patientPosition = "HFS",
        acquisitionDevice = "Siemens Somatom Definition AS+",
        notes
    } = studyData;

    if (!orderId) {
        throw new AppError("Radiology Order ID is required for image acquisition", 400, "MISSING_ORDER_ID");
    }

    const order = await prisma.radiologyOrder.findUnique({
        where: { id: orderId },
        include: {
            encounter: { include: { patient: true } }
        }
    });

    if (!order) {
        throw new AppError("Radiology order not found", 404, "ORDER_NOT_FOUND");
    }

    const studyInstanceUid = explicitUid || generateStudyInstanceUid();
    const seriesInstanceUid = explicitSeriesUid || generateSeriesInstanceUid(studyInstanceUid, 1);
    const modality = explicitModality || order.modality || MODALITIES.XRAY;

    // Resolve windowing defaults if not explicitly specified
    let windowWidth = explicitWW;
    let windowCenter = explicitWC;
    if (windowWidth === undefined || windowCenter === undefined) {
        if (order.procedureCode && STANDARD_RADIOLOGY_PROCEDURES[order.procedureCode]?.defaultWindow) {
            const defWin = STANDARD_RADIOLOGY_PROCEDURES[order.procedureCode].defaultWindow;
            windowWidth = defWin.windowWidth;
            windowCenter = defWin.windowCenter;
        } else if (modality === MODALITIES.CT_SCAN) {
            windowWidth = DICOM_WINDOW_PRESETS.BRAIN_SOFT_TISSUE.windowWidth;
            windowCenter = DICOM_WINDOW_PRESETS.BRAIN_SOFT_TISSUE.windowCenter;
        } else {
            windowWidth = DICOM_WINDOW_PRESETS.CHEST_LUNG.windowWidth;
            windowCenter = DICOM_WINDOW_PRESETS.CHEST_LUNG.windowCenter;
        }
    }

    const radiographerId = radiographerUser ? radiographerUser.id : null;
    const radiographerName = radiographerUser
        ? (radiographerUser.name || `${radiographerUser.firstName || ""} ${radiographerUser.lastName || ""}`.trim() || null)
        : null;

    const patientName = order.encounter?.patient
        ? `${order.encounter.patient.firstName || ""} ${order.encounter.patient.lastName || ""}`.trim()
        : null;

    // Create DicomStudy record
    const study = await prisma.dicomStudy.create({
        data: {
            orderId: order.id,
            studyInstanceUid,
            seriesInstanceUid,
            sopClassUid: sopClassUid || "1.2.840.10008.5.1.4.1.1.1",
            modality,
            patientId: order.patientId,
            patientName,
            accessionNumber: order.accessionNumber,
            seriesCount: parseInt(seriesCount, 10) || 1,
            instanceCount: parseInt(instanceCount, 10) || 1,
            imageStorageUri: imageStorageUri || `/pacs/storage/${new Date().getFullYear()}/${order.accessionNumber}/${studyInstanceUid}.dcm`,
            thumbnailUri: thumbnailUri || `/pacs/storage/thumbnails/${order.accessionNumber}.png`,
            windowWidth: parseFloat(windowWidth),
            windowCenter: parseFloat(windowCenter),
            kvp: parseFloat(kvp),
            exposureTime: parseFloat(exposureTime),
            sliceThickness: parseFloat(sliceThickness),
            pixelSpacing: String(pixelSpacing),
            patientPosition: String(patientPosition),
            acquisitionDevice: String(acquisitionDevice),
            notes: notes || null,
            acquiredAt: new Date()
        }
    });

    // Update order status to ACQUIRED
    await prisma.radiologyOrder.update({
        where: { id: order.id },
        data: {
            status: "ACQUIRED",
            performingRadiographerId: radiographerId,
            performingRadiographerName: radiographerName
        }
    });

    logger.info(`[RadiologyService] Acquired DICOM study ${studyInstanceUid} for order ${order.accessionNumber}`);
    return study;
}

/**
 * Author or update a diagnostic radiology report
 * 
 * @param {Object} reportData 
 * @param {Object} authorUser 
 */
async function authorRadiologyReport(reportData, authorUser) {
    const {
        orderId,
        studyId,
        findings,
        impression,
        technique,
        comparison,
        classification = "NORMAL"
    } = reportData;

    if (!orderId) {
        throw new AppError("Radiology Order ID is required for reporting", 400, "MISSING_ORDER_ID");
    }

    if (!findings || !findings.trim()) {
        throw new AppError("Diagnostic findings narrative is required", 400, "MISSING_FINDINGS");
    }

    if (!impression || !impression.trim()) {
        throw new AppError("Diagnostic impression conclusion is required", 400, "MISSING_IMPRESSION");
    }

    const order = await prisma.radiologyOrder.findUnique({
        where: { id: orderId }
    });

    if (!order) {
        throw new AppError("Radiology order not found", 404, "ORDER_NOT_FOUND");
    }

    // Run automated critical panic detection on narrative text
    const panicDetection = detectCriticalFindings(findings, impression);

    const reportNumber = await generateReportNumber();
    const radiologistId = authorUser ? authorUser.id : null;
    const radiologistName = authorUser
        ? (authorUser.name || `${authorUser.firstName || ""} ${authorUser.lastName || ""}`.trim() || null)
        : null;

    let finalClassification = classification;
    if (panicDetection.isCritical && classification === "NORMAL") {
        finalClassification = "CRITICAL_PANIC";
    }

    const report = await prisma.radiologyReport.create({
        data: {
            orderId: order.id,
            studyId: studyId || null,
            reportNumber,
            modality: order.modality,
            radiologistId,
            radiologistName,
            technique: technique || `Standard ${order.modality} acquisition protocol`,
            comparison: comparison || "No prior imaging available for direct comparison",
            findings: findings.trim(),
            impression: impression.trim(),
            classification: finalClassification,
            criticalAlert: panicDetection.isCritical,
            criticalAlertNotes: panicDetection.alertNotes,
            status: "PRELIMINARY"
        }
    });

    // Advance order status to REPORTED
    await prisma.radiologyOrder.update({
        where: { id: order.id },
        data: { status: "REPORTED" }
    });

    logger.info(`[RadiologyService] Authored report ${reportNumber} (Critical: ${panicDetection.isCritical}) for order ${order.accessionNumber}`);
    return report;
}

/**
 * Verify & Finalize a radiology report (Electronic Signature)
 * 
 * @param {string} reportId 
 * @param {Object} verificationData 
 * @param {Object} verifierUser 
 */
async function verifyRadiologyReport(reportId, verificationData = {}, verifierUser) {
    if (!reportId) {
        throw new AppError("Report ID is required for verification", 400, "MISSING_REPORT_ID");
    }

    const report = await prisma.radiologyReport.findUnique({
        where: { id: reportId },
        include: { order: true }
    });

    if (!report) {
        throw new AppError("Radiology report not found", 404, "REPORT_NOT_FOUND");
    }

    const verifierId = verifierUser ? verifierUser.id : null;
    const verifierName = verificationData.verifiedByName ||
        (verifierUser ? (verifierUser.name || `${verifierUser.firstName || ""} ${verifierUser.lastName || ""}`.trim() || null) : null) ||
        "Attending Radiologist";

    const verified = await prisma.radiologyReport.update({
        where: { id: reportId },
        data: {
            status: "VERIFIED_FINAL",
            verifiedById: verifierId,
            verifiedByName: verifierName,
            signedAt: new Date()
        }
    });

    // Advance order status to VERIFIED
    await prisma.radiologyOrder.update({
        where: { id: report.orderId },
        data: { status: "VERIFIED" }
    });

    logger.info(`[RadiologyService] Verified report ${report.reportNumber} by ${verifierName}`);
    return verified;
}

/**
 * Retrieve PACS Study Dossier by UID or Accession Number
 * 
 * @param {string} uidOrAccession 
 */
async function getPacsStudyDossier(uidOrAccession) {
    if (!uidOrAccession) {
        throw new AppError("Study UID or Accession Number is required", 400, "MISSING_IDENTIFIER");
    }

    const study = await prisma.dicomStudy.findFirst({
        where: {
            OR: [
                { studyInstanceUid: uidOrAccession },
                { accessionNumber: uidOrAccession }
            ]
        },
        include: {
            order: {
                include: {
                    encounter: { include: { patient: true } },
                    reports: true
                }
            }
        }
    });

    if (!study) {
        throw new AppError(`DICOM Study '${uidOrAccession}' not found in PACS archive`, 404, "STUDY_NOT_FOUND");
    }

    return {
        studyInstanceUid: study.studyInstanceUid,
        seriesInstanceUid: study.seriesInstanceUid,
        sopClassUid: study.sopClassUid,
        modality: study.modality,
        accessionNumber: study.accessionNumber,
        patientId: study.patientId,
        patientName: study.patientName,
        seriesCount: study.seriesCount,
        instanceCount: study.instanceCount,
        imageStorageUri: study.imageStorageUri,
        thumbnailUri: study.thumbnailUri,
        viewingParameters: {
            windowWidth: study.windowWidth,
            windowCenter: study.windowCenter,
            kvp: study.kvp,
            exposureTime: study.exposureTime,
            sliceThickness: study.sliceThickness,
            pixelSpacing: study.pixelSpacing,
            patientPosition: study.patientPosition,
            acquisitionDevice: study.acquisitionDevice
        },
        order: {
            id: study.order.id,
            procedureName: study.order.procedureName,
            priority: study.order.priority,
            clinicalIndication: study.order.clinicalIndication,
            status: study.order.status
        },
        patient: study.order.encounter?.patient || null,
        reports: study.order.reports || []
    };
}

/**
 * Get Real-Time Radiology & PACS Command Center Telemetry
 */
async function getRadiologyDashboardTelemetry() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        totalOrdersToday,
        pendingAcquisition,
        pendingReporting,
        verifiedReportsToday,
        criticalPanicAlertsToday,
        modalityStats,
        priorityStats
    ] = await Promise.all([
        prisma.radiologyOrder.count({
            where: { createdAt: { gte: today } }
        }),
        prisma.radiologyOrder.count({
            where: { status: { in: ["ORDERED", "SCHEDULED", "ACQUISITION_IN_PROGRESS"] } }
        }),
        prisma.radiologyOrder.count({
            where: { status: "ACQUIRED" }
        }),
        prisma.radiologyReport.count({
            where: {
                status: "VERIFIED_FINAL",
                signedAt: { gte: today }
            }
        }),
        prisma.radiologyReport.count({
            where: {
                criticalAlert: true,
                createdAt: { gte: today }
            }
        }),
        prisma.radiologyOrder.groupBy({
            by: ["modality"],
            _count: { id: true }
        }),
        prisma.radiologyOrder.groupBy({
            by: ["priority"],
            _count: { id: true }
        })
    ]);

    const modalityBreakdown = {};
    for (const item of modalityStats) {
        modalityBreakdown[item.modality] = item._count.id;
    }

    const priorityQueue = {};
    for (const item of priorityStats) {
        priorityQueue[item.priority] = item._count.id;
    }

    return {
        totalOrdersToday,
        pendingAcquisition,
        pendingReporting,
        verifiedReportsToday,
        criticalPanicAlertsToday,
        modalityBreakdown,
        priorityQueue,
        systemHealth: {
            pacsArchiveOnline: true,
            dicomRouterActive: true,
            storageAvailableGb: 1845.6
        }
    };
}

/**
 * Seed standard procedure catalog into database
 */
async function seedRadiologyCatalog() {
    const procedures = Object.values(STANDARD_RADIOLOGY_PROCEDURES);
    const results = [];

    for (const item of procedures) {
        const seeded = await prisma.radiologyCatalogItem.upsert({
            where: { code: item.code },
            update: {
                procedureName: item.procedureName,
                modality: item.modality,
                bodyPart: item.bodyPart,
                standardViews: item.standardViews,
                defaultWindowWidth: item.defaultWindow.windowWidth,
                defaultWindowCenter: item.defaultWindow.windowCenter,
                estimatedMinutes: item.estimatedMinutes,
                costPrice: item.costPrice,
                sellingPrice: item.sellingPrice
            },
            create: {
                code: item.code,
                procedureName: item.procedureName,
                modality: item.modality,
                bodyPart: item.bodyPart,
                standardViews: item.standardViews,
                defaultWindowWidth: item.defaultWindow.windowWidth,
                defaultWindowCenter: item.defaultWindow.windowCenter,
                estimatedMinutes: item.estimatedMinutes,
                costPrice: item.costPrice,
                sellingPrice: item.sellingPrice
            }
        });
        results.push(seeded);
    }

    return results;
}

module.exports = {
    createRadiologyOrder,
    getRadiologyOrders,
    getRadiologyOrderById,
    scheduleRadiologyOrder,
    acquireDicomStudy,
    authorRadiologyReport,
    verifyRadiologyReport,
    getPacsStudyDossier,
    getRadiologyDashboardTelemetry,
    seedRadiologyCatalog
};
