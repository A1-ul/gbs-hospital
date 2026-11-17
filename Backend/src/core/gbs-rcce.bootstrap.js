"use strict";

/*
================================================================================
GBS CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE (GBS-RCCE)
HOSPITAL SYSTEM ADAPTER & BOOTSTRAP
LOCATION: Backend/src/core/gbs-rcce.bootstrap.js
================================================================================
Connects the reusable enterprise-framework/gbs-rcce engine to PostgreSQL via
Prisma and wires GBS Hospital domain response definitions and business rules.
================================================================================
*/

const path = require("path");
const { createGbsRcceEngine } = require(path.resolve(
    __dirname,
    "../../../enterprise-framework/gbs-rcce"
));
const prisma = require("./database/prisma.client");
const logger = require("./utils/logger");

// Hospital-domain response extensions registered on top of canonical GBS codes
const HOSPITAL_CUSTOM_RESPONSES = Object.freeze({
    PATIENT_REGISTERED: {
        code: "PATIENT_REGISTERED",
        httpStatus: 201,
        severity: "INFO",
        category: "PATIENT",
        message: "Patient registration completed successfully."
    },
    PATIENT_ADMITTED: {
        code: "PATIENT_ADMITTED",
        httpStatus: 201,
        severity: "INFO",
        category: "ADMISSIONS",
        message: "Patient admission completed successfully."
    },
    PRESCRIPTION_DISPENSED: {
        code: "PRESCRIPTION_DISPENSED",
        httpStatus: 200,
        severity: "INFO",
        category: "PHARMACY",
        message: "Medication dispensed and inventory updated successfully."
    },
    LAB_RESULTS_RELEASED: {
        code: "LAB_RESULTS_RELEASED",
        httpStatus: 200,
        severity: "INFO",
        category: "LABORATORY",
        message: "Laboratory results released successfully."
    },
    RADIOLOGY_REPORT_FINALIZED: {
        code: "RADIOLOGY_REPORT_FINALIZED",
        httpStatus: 200,
        severity: "INFO",
        category: "RADIOLOGY",
        message: "Radiology diagnostic report finalized successfully."
    },
    SURGERY_BOOKED: {
        code: "SURGERY_BOOKED",
        httpStatus: 201,
        severity: "INFO",
        category: "SURGERY",
        message: "Surgical procedure booked and operating theatre assigned."
    },
    EMERGENCY_DISPATCHED: {
        code: "EMERGENCY_DISPATCHED",
        httpStatus: 201,
        severity: "INFO",
        category: "EMERGENCY",
        message: "Emergency ambulance dispatched successfully."
    },
    CLAIM_SUBMITTED: {
        code: "CLAIM_SUBMITTED",
        httpStatus: 200,
        severity: "INFO",
        category: "CLAIMS",
        message: "Insurance claim submitted successfully."
    }
});

const safeDbWrite = async (fn) => {
    try {
        return await fn();
    } catch (err) {
        const msg = String(err?.message || "");
        if (
            process.env.NODE_ENV === "test" &&
            (msg.includes("not yet connected") || msg.includes("already been disconnected") || msg.includes("terminating connection"))
        ) {
            return null;
        }
        throw err;
    }
};

const prismaStorageAdapter = {
    async getLatestAuditHash() {
        try {
            const last = await prisma.auditLog.findFirst({
                where: { integrityHash: { not: null } },
                orderBy: { createdAt: "desc" },
                select: { integrityHash: true }
            });
            return last ? last.integrityHash : "GENESIS";
        } catch (_err) {
            return "GENESIS";
        }
    },

    async writeAudit(data) {
        return await safeDbWrite(() =>
            prisma.auditLog.create({
                data: {
                    userId: data.userId || null,
                    role: data.role || null,
                    tenantId: data.tenantId || null,
                    hospitalId: data.hospitalId || null,
                    action: data.action,
                    module: data.module,
                    description: data.description || null,
                    affectedRecord: data.affectedRecord || null,
                    outcome: data.outcome || "SUCCESS",
                    requestId: data.requestId || null,
                    responseCode: data.responseCode || null,
                    httpStatus: data.httpStatus || null,
                    method: data.method || null,
                    path: data.path || null,
                    ipAddress: data.ipAddress || null,
                    userAgent: data.userAgent || null,
                    previousHash: data.previousHash || null,
                    integrityHash: data.integrityHash || null,
                    metadata: data.metadata || undefined
                }
            })
        );
    },

    async writeEvent(data) {
        return await safeDbWrite(() => prisma.systemEvent.create({ data }));
    },

    async markEventProcessed(eventId) {
        return await safeDbWrite(() =>
            prisma.systemEvent.update({
                where: { id: eventId },
                data: { status: "PROCESSED", processedAt: new Date() }
            })
        );
    },

    async writeNotification(data) {
        return await safeDbWrite(() => prisma.systemNotification.create({ data }));
    },

    async writeErrorLog(data) {
        return await safeDbWrite(() => prisma.systemErrorLog.create({ data }));
    },

    async findIdempotencyRecord({ idempotencyKey, userId, method, path: reqPath }) {
        return await prisma.idempotencyRecord.findUnique({
            where: {
                idempotencyKey_userId_method_path: {
                    idempotencyKey,
                    userId,
                    method,
                    path: reqPath
                }
            }
        });
    },

    async saveIdempotencyRecord(data) {
        return await prisma.idempotencyRecord.upsert({
            where: {
                idempotencyKey_userId_method_path: {
                    idempotencyKey: data.idempotencyKey,
                    userId: data.userId,
                    method: data.method,
                    path: data.path
                }
            },
            update: {
                status: data.status,
                httpStatus: data.httpStatus,
                responseBody: data.responseBody,
                requestId: data.requestId,
                expiresAt: data.expiresAt
            },
            create: data
        });
    },

    async findActiveDeveloperGrant({ developerId, scope, tenantId = null }) {
        const now = new Date();
        const grant = await prisma.developerAccessGrant.findFirst({
            where: {
                developerId,
                status: "APPROVED",
                revokedAt: null,
                scope: { in: [scope, "FULL_DIAGNOSTIC_SUPPORT"] },
                AND: [
                    { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
                    ...(tenantId ? [{ OR: [{ tenantId: null }, { tenantId }] }] : [])
                ]
            },
            orderBy: { createdAt: "desc" }
        });
        return grant;
    },

    async recordDeveloperGrantUsage(grantId) {
        return await prisma.developerAccessGrant.update({
            where: { id: grantId },
            data: {
                accessCount: { increment: 1 },
                lastAccessedAt: new Date()
            }
        });
    }
};

const rcce = createGbsRcceEngine({
    applicationName: "GBS Hospital Management System",
    customResponses: HOSPITAL_CUSTOM_RESPONSES,
    storageAdapter: prismaStorageAdapter,
    logger
});

// Register reusable Hospital Business Rules
rcce.rules.registerRule("payment.amountPositive", ({ body }) =>
    rcce.rules.requirePositiveNumber(body, "amount", "Payment amount")
);

rcce.rules.registerRule("patient.registrationRequired", ({ body }) =>
    rcce.rules.requireFields(body, [
        { field: "firstName", label: "First name" },
        { field: "lastName", label: "Last name" }
    ])
);

rcce.rules.registerRule("tenant.registrationRequired", ({ body }) => {
    const normalized = {
        name: body?.name || body?.institutionName,
        adminEmail: body?.adminEmail || body?.administratorEmail
    };
    return rcce.rules.requireFields(normalized, [
        { field: "name", label: "Institution name" },
        { field: "adminEmail", label: "Administrator email" }
    ]);
});

module.exports = {
    rcce,
    prismaStorageAdapter,
    HOSPITAL_CUSTOM_RESPONSES
};
