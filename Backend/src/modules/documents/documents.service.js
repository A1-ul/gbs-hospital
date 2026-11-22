"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
DOCUMENT MANAGEMENT, FILE VERSIONING & RETENTION SERVICE
Medical Records, File Storage, Document Delivery, Retention Policy & Point-in-Time Recovery
LOCATION: Backend/src/modules/documents/documents.service.js
====================================================
*/

const crypto = require("crypto");
const prisma = require("../../core/database/prisma.client");
const { ensureDefaultHospitalId } = require("../../core/database/hospital-resolver");
const AppError = require("../../core/errors/app.error");

async function generateDocumentCode() {
    const year = new Date().getFullYear();
    const count = await prisma.hospitalDocument.count();
    return `DOC-${year}-${String(count + 1).padStart(6, "0")}`;
}

function computeContentChecksum(payload) {
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function getDocumentTelemetry() {
    const [totalActive, archivedDeleted, deliveredCount, multiVersionCount] = await Promise.all([
        prisma.hospitalDocument.count({ where: { isDeleted: false } }),
        prisma.hospitalDocument.count({ where: { isDeleted: true } }),
        prisma.hospitalDocument.count({ where: { deliveryStatus: "DELIVERED", isDeleted: false } }),
        prisma.hospitalDocument.count({ where: { versionNumber: { gt: 1 } } })
    ]);
    return {
        totalActive,
        archivedDeleted,
        deliveredCount,
        multiVersionCount,
        defaultRetentionYears: 7
    };
}

async function listDocuments({ category, patientId, includeDeleted = false, limit = 60 } = {}) {
    const where = {};
    if (category) where.category = String(category).toUpperCase();
    if (patientId) where.patientId = patientId;
    if (!(includeDeleted === true || includeDeleted === "true")) {
        where.isDeleted = false;
    }

    const documents = await prisma.hospitalDocument.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit) || 60, 150)
    });
    return { total: documents.length, documents };
}

async function createDocument(payload = {}, actor) {
    const {
        title,
        category = "MEDICAL_RECORD",
        fileName,
        mimeType = "application/pdf",
        fileSizeBytes = 0,
        patientId = null,
        retentionYears = 7,
        contentNotes = null
    } = payload;

    if (!title || !fileName) {
        throw new AppError("Document title and file name are required", 400, "MISSING_DOCUMENT_FIELDS");
    }

    const hospitalId = await ensureDefaultHospitalId();
    const documentCode = await generateDocumentCode();
    const years = Math.max(1, Math.min(Number(retentionYears) || 7, 50));
    const retentionExpiresAt = new Date();
    retentionExpiresAt.setFullYear(retentionExpiresAt.getFullYear() + years);

    const uploaderName = actor ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() || actor.email : "Hospital Staff";
    const checksum = computeContentChecksum({ title, fileName, contentNotes, ts: Date.now() });

    const created = await prisma.$transaction(async (tx) => {
        const doc = await tx.hospitalDocument.create({
            data: {
                documentCode,
                hospitalId,
                patientId,
                title: String(title).trim(),
                category: String(category).toUpperCase(),
                fileName: String(fileName).trim(),
                mimeType: String(mimeType).trim(),
                fileSizeBytes: Number(fileSizeBytes) || Buffer.byteLength(String(contentNotes || title)),
                storageChecksumSha256: checksum,
                versionNumber: 1,
                retentionYears: years,
                retentionExpiresAt,
                deliveryStatus: "STORED",
                uploadedById: actor?.id || null,
                uploadedByName: uploaderName,
                contentNotes: contentNotes ? String(contentNotes).trim() : null
            }
        });

        await tx.auditLog.create({
            data: {
                userId: actor?.id || null,
                role: actor?.role || null,
                hospitalId,
                action: "DOCUMENT_STORED",
                module: "DOCUMENT_MANAGEMENT",
                outcome: "SUCCESS",
                affectedRecord: doc.id,
                description: `[${documentCode}] Stored v1 "${doc.title}" (${doc.fileName}, Retention: ${years} yrs, SHA-256: ${checksum.slice(0, 12)})`
            }
        });

        return doc;
    });

    return created;
}

async function createNewVersion(parentId, payload = {}, actor) {
    const parent = await prisma.hospitalDocument.findUnique({ where: { id: parentId } });
    if (!parent) {
        throw new AppError("Parent document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    const rootId = parent.parentDocumentId || parent.id;
    const latestVersion = await prisma.hospitalDocument.findFirst({
        where: { OR: [{ id: rootId }, { parentDocumentId: rootId }] },
        orderBy: { versionNumber: "desc" }
    });

    const nextVersion = (latestVersion?.versionNumber || parent.versionNumber) + 1;
    const documentCode = await generateDocumentCode();
    const uploaderName = actor ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() || actor.email : "Hospital Staff";
    const checksum = computeContentChecksum({
        rootId,
        version: nextVersion,
        fileName: payload.fileName || parent.fileName,
        contentNotes: payload.contentNotes || ""
    });

    const doc = await prisma.hospitalDocument.create({
        data: {
            documentCode,
            hospitalId: parent.hospitalId,
            patientId: parent.patientId,
            title: payload.title ? String(payload.title).trim() : parent.title,
            category: parent.category,
            fileName: payload.fileName ? String(payload.fileName).trim() : parent.fileName,
            mimeType: payload.mimeType || parent.mimeType,
            fileSizeBytes: Number(payload.fileSizeBytes) || parent.fileSizeBytes,
            storageChecksumSha256: checksum,
            versionNumber: nextVersion,
            parentDocumentId: rootId,
            retentionYears: parent.retentionYears,
            retentionExpiresAt: parent.retentionExpiresAt,
            deliveryStatus: "STORED",
            uploadedById: actor?.id || null,
            uploadedByName: uploaderName,
            contentNotes: payload.contentNotes ? String(payload.contentNotes).trim() : parent.contentNotes
        }
    });

    await prisma.auditLog.create({
        data: {
            userId: actor?.id || null,
            role: actor?.role || null,
            hospitalId: parent.hospitalId,
            action: "DOCUMENT_VERSION_CREATED",
            module: "DOCUMENT_MANAGEMENT",
            outcome: "SUCCESS",
            affectedRecord: doc.id,
            description: `[${documentCode}] Created v${nextVersion} of "${doc.title}" (SHA-256: ${checksum.slice(0, 12)})`
        }
    });

    return doc;
}

async function deliverDocument(id, payload = {}, actor) {
    const existing = await prisma.hospitalDocument.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }
    const recipient = String(payload.deliveredTo || payload.recipient || "").trim();
    if (!recipient) {
        throw new AppError("Delivery recipient department or clinician is required", 400, "MISSING_RECIPIENT");
    }

    const updated = await prisma.hospitalDocument.update({
        where: { id },
        data: {
            deliveryStatus: "DELIVERED",
            deliveredTo: recipient,
            deliveredAt: new Date()
        }
    });

    await prisma.auditLog.create({
        data: {
            userId: actor?.id || null,
            role: actor?.role || null,
            hospitalId: existing.hospitalId,
            action: "DOCUMENT_DELIVERED",
            module: "DOCUMENT_MANAGEMENT",
            outcome: "SUCCESS",
            affectedRecord: updated.id,
            description: `[${existing.documentCode}] Delivered "${existing.title}" to ${recipient}`
        }
    });

    return updated;
}

async function archiveSoftDeleteDocument(id, actor) {
    const existing = await prisma.hospitalDocument.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    // Automated Deletion Control: Soft-delete only (recoverable under retention policy!)
    const updated = await prisma.hospitalDocument.update({
        where: { id },
        data: {
            isDeleted: true,
            deletedAt: new Date(),
            deliveryStatus: "ARCHIVED"
        }
    });

    await prisma.auditLog.create({
        data: {
            userId: actor?.id || null,
            role: actor?.role || null,
            hospitalId: existing.hospitalId,
            action: "DOCUMENT_SOFT_DELETED_RETENTION_PROTECTED",
            module: "DOCUMENT_MANAGEMENT",
            outcome: "SUCCESS",
            affectedRecord: updated.id,
            description: `[${existing.documentCode}] Soft-archived under ${existing.retentionYears}-year retention protection (recoverable)`
        }
    });

    return updated;
}

async function restoreDocument(id, actor) {
    const existing = await prisma.hospitalDocument.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    const updated = await prisma.hospitalDocument.update({
        where: { id },
        data: {
            isDeleted: false,
            deletedAt: null,
            deliveryStatus: "STORED"
        }
    });

    await prisma.auditLog.create({
        data: {
            userId: actor?.id || null,
            role: actor?.role || null,
            hospitalId: existing.hospitalId,
            action: "DOCUMENT_POINT_IN_TIME_RESTORED",
            module: "DOCUMENT_MANAGEMENT",
            outcome: "SUCCESS",
            affectedRecord: updated.id,
            description: `[${existing.documentCode}] Restored soft-deleted document "${existing.title}"`
        }
    });

    return updated;
}

module.exports = {
    getDocumentTelemetry,
    listDocuments,
    createDocument,
    createNewVersion,
    deliverDocument,
    archiveSoftDeleteDocument,
    restoreDocument
};
