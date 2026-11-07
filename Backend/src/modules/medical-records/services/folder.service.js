"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MEDICAL FOLDER ARCHIVE & PHYSICAL TRACKING SERVICE
FOLDER_RETRIEVER Role Workflow & Chain of Custody
LOCATION: src/modules/medical-records/services/folder.service.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");
const AppError = require("../../../core/errors/app.error");
const logger = require("../../../core/utils/logger");

/**
 * Request Physical Medical Folder Retrieval
 * Triggered by Doctors, OPD Nurses, or Receptionists
 */
async function requestFolderRetrieval(data, requestingUserId) {
    const {
        patientId,
        folderId,
        destinationDepartment,
        priority = "ROUTINE",
        notes,
        requestingRole = "DOCTOR"
    } = data;

    if ((!patientId && !folderId) || !destinationDepartment) {
        throw new AppError("Patient ID or Folder ID, and Destination Department are required", 400, "MISSING_REQUIRED_FIELDS");
    }

    const whereFolder = folderId ? { id: folderId } : { patientId };
    const folder = await prisma.medicalFolder.findUnique({
        where: whereFolder,
        include: {
            patient: {
                select: { id: true, firstName: true, lastName: true, patientNumber: true, phone: true }
            }
        }
    });

    if (!folder) {
        throw new AppError("Physical medical folder not found for this patient", 404, "FOLDER_NOT_FOUND");
    }

    const normalizedPriority = ["EMERGENCY", "URGENT", "ROUTINE"].includes(priority.toUpperCase())
        ? priority.toUpperCase()
        : "ROUTINE";

    const request = await prisma.$transaction(async (tx) => {
        // Create Retrieval Request
        const retReq = await tx.folderRetrievalRequest.create({
            data: {
                folderId: folder.id,
                patientId: folder.patientId,
                requestedById: requestingUserId,
                requestedByRole: requestingRole,
                destinationDepartment: destinationDepartment.trim(),
                priority: normalizedPriority,
                status: "PENDING",
                notes: notes ? notes.trim() : null
            }
        });

        // Update folder status
        await tx.medicalFolder.update({
            where: { id: folder.id },
            data: {
                status: "REQUESTED",
                currentDepartment: destinationDepartment.trim()
            }
        });

        // Movement audit log
        await tx.folderMovementLog.create({
            data: {
                folderId: folder.id,
                performedById: requestingUserId,
                performedByRole: requestingRole,
                action: "REQUESTED",
                fromLocation: folder.shelfLocation,
                toLocation: destinationDepartment.trim(),
                notes: `Retrieval requested by ${requestingRole} for ${destinationDepartment}. Priority: ${normalizedPriority}.`
            }
        });

        return retReq;
    });

    logger.info({
        message: "Physical folder retrieval requested",
        requestId: request.id,
        folderNumber: folder.folderNumber,
        shelfLocation: folder.shelfLocation,
        priority: normalizedPriority
    });

    return {
        requestId: request.id,
        folderNumber: folder.folderNumber,
        barcode: folder.barcode,
        shelfLocation: folder.shelfLocation,
        archiveZone: folder.archiveZone,
        patient: {
            mrn: folder.patient.patientNumber,
            fullName: `${folder.patient.firstName} ${folder.patient.lastName}`
        },
        destinationDepartment: request.destinationDepartment,
        priority: request.priority,
        status: request.status,
        requestedAt: request.requestedAt,
        message: "Folder retrieval request dispatched to Folder Retriever queue."
    };
}

/**
 * Real-time Physical Folder Retrieval Queue for FOLDER_RETRIEVER Role
 * Ordered by Priority: EMERGENCY > URGENT > ROUTINE, then by requestedAt ASC
 */
async function getRetrievalQueue(hospitalId, filterStatus = "PENDING") {
    const where = {};
    if (filterStatus) {
        where.status = filterStatus;
    }

    if (hospitalId) {
        where.folder = { hospitalId };
    }

    const requests = await prisma.folderRetrievalRequest.findMany({
        where,
        include: {
            folder: {
                select: {
                    id: true,
                    folderNumber: true,
                    barcode: true,
                    shelfLocation: true,
                    archiveZone: true,
                    status: true,
                    currentDepartment: true
                }
            },
            patient: {
                select: {
                    id: true,
                    patientNumber: true,
                    firstName: true,
                    lastName: true,
                    gender: true,
                    dateOfBirth: true,
                    phone: true
                }
            }
        },
        orderBy: [
            { requestedAt: "asc" }
        ]
    });

    // Sort by clinical priority priority: EMERGENCY (1) > URGENT (2) > ROUTINE (3)
    const priorityWeight = { EMERGENCY: 1, URGENT: 2, ROUTINE: 3 };
    const sorted = requests.sort((a, b) => {
        const weightA = priorityWeight[a.priority] || 4;
        const weightB = priorityWeight[b.priority] || 4;
        if (weightA !== weightB) return weightA - weightB;
        return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
    });

    return sorted.map((r) => ({
        requestId: r.id,
        priority: r.priority,
        status: r.status,
        destinationDepartment: r.destinationDepartment,
        requestedByRole: r.requestedByRole,
        requestedAt: r.requestedAt,
        notes: r.notes,
        folder: {
            id: r.folder.id,
            folderNumber: r.folder.folderNumber,
            barcode: r.folder.barcode,
            shelfLocation: r.folder.shelfLocation,
            archiveZone: r.folder.archiveZone,
            currentStatus: r.folder.status
        },
        patient: {
            id: r.patient.id,
            mrn: r.patient.patientNumber,
            fullName: `${r.patient.firstName} ${r.patient.lastName}`,
            gender: r.patient.gender,
            phone: r.patient.phone
        }
    }));
}

/**
 * Mark Folder Retrieved from Shelf by FOLDER_RETRIEVER
 */
async function markFolderRetrieved(requestId, retrieverUserId) {
    const request = await prisma.folderRetrievalRequest.findUnique({
        where: { id: requestId },
        include: { folder: true }
    });

    if (!request) {
        throw new AppError("Retrieval request not found", 404, "REQUEST_NOT_FOUND");
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
        const retReq = await tx.folderRetrievalRequest.update({
            where: { id: requestId },
            data: {
                status: "RETRIEVING",
                retrievedById: retrieverUserId,
                retrievedAt: now
            }
        });

        await tx.medicalFolder.update({
            where: { id: request.folderId },
            data: {
                status: "RETRIEVING",
                currentHolderId: retrieverUserId,
                lastCheckedOutAt: now
            }
        });

        await tx.folderMovementLog.create({
            data: {
                folderId: request.folderId,
                performedById: retrieverUserId,
                performedByRole: "FOLDER_RETRIEVER",
                action: "CHECKED_OUT",
                fromLocation: request.folder.shelfLocation,
                toLocation: "IN_TRANSIT",
                notes: `Retrieved from shelf ${request.folder.shelfLocation} by retriever. In transit to ${request.destinationDepartment}.`
            }
        });

        return retReq;
    });

    return {
        requestId: updated.id,
        folderId: request.folderId,
        status: "RETRIEVING",
        shelfLocation: request.folder.shelfLocation,
        retrievedAt: updated.retrievedAt,
        message: "Physical folder pulled from shelf. Status set to RETRIEVING / IN_TRANSIT."
    };
}

/**
 * Mark Folder Delivered to Destination Clinic / Doctor
 */
async function markFolderDelivered(requestId, retrieverUserId) {
    const request = await prisma.folderRetrievalRequest.findUnique({
        where: { id: requestId },
        include: { folder: true }
    });

    if (!request) {
        throw new AppError("Retrieval request not found", 404, "REQUEST_NOT_FOUND");
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
        const retReq = await tx.folderRetrievalRequest.update({
            where: { id: requestId },
            data: {
                status: "DELIVERED",
                deliveredAt: now
            }
        });

        const newFolderStatus = request.destinationDepartment.toUpperCase().includes("OPD")
            ? "AT_OPD"
            : "WITH_DOCTOR";

        await tx.medicalFolder.update({
            where: { id: request.folderId },
            data: {
                status: newFolderStatus,
                currentDepartment: request.destinationDepartment
            }
        });

        await tx.folderMovementLog.create({
            data: {
                folderId: request.folderId,
                performedById: retrieverUserId,
                performedByRole: "FOLDER_RETRIEVER",
                action: "DELIVERED",
                fromLocation: "IN_TRANSIT",
                toLocation: request.destinationDepartment,
                notes: `Physical file hand-delivered to ${request.destinationDepartment}.`
            }
        });

        return retReq;
    });

    return {
        requestId: updated.id,
        folderId: request.folderId,
        status: "DELIVERED",
        destinationDepartment: request.destinationDepartment,
        deliveredAt: updated.deliveredAt,
        message: `Physical folder delivered to ${request.destinationDepartment}.`
    };
}

/**
 * Return Physical Folder Back to Archive Shelf
 */
async function returnFolderToArchive(folderIdentifier, { returnNotes, newShelfLocation } = {}, returnerUserId) {
    const folder = await prisma.medicalFolder.findFirst({
        where: {
            OR: [
                { id: folderIdentifier },
                { folderNumber: folderIdentifier },
                { barcode: folderIdentifier }
            ]
        }
    });

    if (!folder) {
        throw new AppError("Medical folder not found", 404, "FOLDER_NOT_FOUND");
    }

    const finalShelf = newShelfLocation ? newShelfLocation.trim() : folder.shelfLocation;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
        // Update folder back to archive
        const updatedFolder = await tx.medicalFolder.update({
            where: { id: folder.id },
            data: {
                status: "IN_ARCHIVE",
                shelfLocation: finalShelf,
                currentDepartment: null,
                currentHolderId: null,
                lastReturnedAt: now
            }
        });

        // Close any open retrieval request for this folder
        await tx.folderRetrievalRequest.updateMany({
            where: {
                folderId: folder.id,
                status: { in: ["PENDING", "RETRIEVING", "DELIVERED"] }
            },
            data: {
                status: "RETURNED",
                returnedAt: now
            }
        });

        // Record return to shelf movement log
        await tx.folderMovementLog.create({
            data: {
                folderId: folder.id,
                performedById: returnerUserId || "SYSTEM",
                performedByRole: "FOLDER_RETRIEVER",
                action: "RETURNED_TO_SHELF",
                fromLocation: folder.currentDepartment || "CLINIC",
                toLocation: finalShelf,
                notes: returnNotes || `Folder securely filed back into shelf slot ${finalShelf}.`
            }
        });

        return updatedFolder;
    });

    return {
        folderId: result.id,
        folderNumber: result.folderNumber,
        shelfLocation: result.shelfLocation,
        status: result.status,
        lastReturnedAt: result.lastReturnedAt,
        message: `Physical medical folder re-shelved at ${result.shelfLocation}. Archive inventory restored.`
    };
}

/**
 * Complete Physical Folder Audit Trail & Chain of Custody
 */
async function getFolderAuditTrail(folderIdentifier) {
    const folder = await prisma.medicalFolder.findFirst({
        where: {
            OR: [
                { id: folderIdentifier },
                { folderNumber: folderIdentifier },
                { barcode: folderIdentifier }
            ]
        },
        include: {
            patient: {
                select: { id: true, patientNumber: true, firstName: true, lastName: true, phone: true }
            },
            movementLogs: {
                orderBy: { createdAt: "desc" }
            },
            retrievalRequests: {
                orderBy: { requestedAt: "desc" }
            }
        }
    });

    if (!folder) {
        throw new AppError("Medical folder not found", 404, "FOLDER_NOT_FOUND");
    }

    return {
        folder: {
            id: folder.id,
            folderNumber: folder.folderNumber,
            barcode: folder.barcode,
            shelfLocation: folder.shelfLocation,
            archiveZone: folder.archiveZone,
            status: folder.status,
            currentDepartment: folder.currentDepartment,
            lastCheckedOutAt: folder.lastCheckedOutAt,
            lastReturnedAt: folder.lastReturnedAt
        },
        patient: folder.patient,
        chainOfCustodyLogs: folder.movementLogs,
        retrievalHistory: folder.retrievalRequests
    };
}

/**
 * Folder Retriever Role Dashboard Summary
 * Real metrics derived 100% from PostgreSQL database
 */
async function getFolderRetrieverDashboardSummary(hospitalId) {
    const where = hospitalId ? { hospitalId } : {};

    const [
        totalFolders,
        inArchive,
        checkedOut,
        pendingRequests,
        emergencyRequests
    ] = await Promise.all([
        prisma.medicalFolder.count({ where }),
        prisma.medicalFolder.count({ where: { ...where, status: "IN_ARCHIVE" } }),
        prisma.medicalFolder.count({ where: { ...where, status: { not: "IN_ARCHIVE" } } }),
        prisma.folderRetrievalRequest.count({ where: { status: "PENDING" } }),
        prisma.folderRetrievalRequest.count({ where: { status: "PENDING", priority: "EMERGENCY" } })
    ]);

    return {
        statistics: {
            totalFolders,
            inArchive,
            inCirculation: checkedOut,
            pendingRetrievalRequests: pendingRequests,
            emergencyAlerts: emergencyRequests
        },
        dashboardRoleTheme: {
            role: "FOLDER_RETRIEVER",
            themeTitle: "Medical Records Archive & Physical File Management",
            avatarUrl: "/assets/images/roles/folder_retriever_avatar.png",
            bannerImageUrl: "/assets/images/dashboards/medical_archive_hero.jpg",
            accentColor: "amber"
        }
    };
}

module.exports = {
    requestFolderRetrieval,
    getRetrievalQueue,
    markFolderRetrieved,
    markFolderDelivered,
    returnFolderToArchive,
    getFolderAuditTrail,
    getFolderRetrieverDashboardSummary
};
