"use strict";

/*
================================================================================
GBS CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE (GBS-RCCE)
MODULE: System-Wide Error Handling & Diagnostics Engine
LOCATION: enterprise-framework/gbs-rcce/error.engine.js
================================================================================
Translates technical runtime, Prisma, network, validation, auth, and
transaction errors into safe user-facing messages from the Central Response
Catalogue while routing full diagnostics ONLY to authorized developers.
================================================================================
*/

function sanitizeDiagnosticText(raw) {
    if (raw === undefined || raw === null) return null;
    return String(raw)
        .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "postgresql://[REDACTED]")
        .replace(/(password|passwd|pwd|secret|token|apikey|api_key)\s*[:=]\s*[^\s&;,"']+/gi, "$1=[REDACTED]")
        .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
        .replace(/\b(sk_live|sk_test|pk_live|pk_test)_[A-Za-z0-9]+\b/gi, "[REDACTED_KEY]");
}

function classifyError(err) {
    if (!err) {
        return { category: "INTERNAL", code: "INTERNAL_ERROR", httpStatus: 500 };
    }

    // Explicitly classified RCCE / AppError
    const rawCode = err.code || "";
    const status = err.statusCode || err.status || 500;

    // Prisma / PostgreSQL connection, pool timeout (P2024), or dropped server connection (P1017)
    if (["P1001", "P1002", "P1008", "P1017", "P2024", "ECONNREFUSED"].includes(rawCode)) {
        return { category: "DATABASE", code: "DATABASE_ERROR", httpStatus: 503 };
    }
    if (rawCode === "P2002") {
        return { category: "CONFLICT", code: "DUPLICATE_CONFLICT", httpStatus: 409 };
    }
    if (rawCode === "P2025") {
        return { category: "NOT_FOUND", code: "RECORD_NOT_FOUND", httpStatus: 404 };
    }
    if (rawCode === "P2003" || rawCode === "P2000" || err.name === "PrismaClientValidationError") {
        return { category: "VALIDATION", code: "VALIDATION_FAILED", httpStatus: 400 };
    }
    if (err.name === "PrismaClientKnownRequestError" || err.name === "PrismaClientInitializationError") {
        return { category: "DATABASE", code: "DATABASE_ERROR", httpStatus: 503 };
    }

    // Body-parser malformed JSON & oversized payload errors
    if (err.type === "entity.parse.failed" || (err instanceof SyntaxError && status === 400)) {
        return { category: "VALIDATION", code: "VALIDATION_FAILED", httpStatus: 400 };
    }
    if (err.type === "entity.too.large" || status === 413) {
        return { category: "VALIDATION", code: "PAYLOAD_TOO_LARGE", httpStatus: 413 };
    }

    // Network errors
    if (["ETIMEDOUT", "ENOTFOUND", "ECONNRESET", "EHOSTUNREACH", "ESOCKETTIMEDOUT"].includes(rawCode)) {
        return { category: "NETWORK", code: "NETWORK_ERROR", httpStatus: 502 };
    }

    // Auth / Token errors
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        return { category: "AUTHORIZATION", code: "UNAUTHORIZED", httpStatus: 401 };
    }

    // Explicit operational errors (Full Universal HTTP Status Coverage)
    if (status === 400) return { category: "VALIDATION", code: rawCode || "VALIDATION_FAILED", httpStatus: 400 };
    if (status === 401) return { category: "AUTHORIZATION", code: rawCode || "UNAUTHORIZED", httpStatus: 401 };
    if (status === 402) return { category: "TRANSACTION", code: rawCode || "SUBSCRIPTION_EXPIRED", httpStatus: 402 };
    if (status === 403) return { category: "AUTHORIZATION", code: rawCode || "FORBIDDEN_PERMISSION", httpStatus: 403 };
    if (status === 404) return { category: "NOT_FOUND", code: rawCode || "RECORD_NOT_FOUND", httpStatus: 404 };
    if (status === 405) return { category: "ROUTING", code: rawCode || "METHOD_NOT_ALLOWED", httpStatus: 405 };
    if (status === 408) return { category: "TIMEOUT", code: rawCode || "REQUEST_TIMEOUT", httpStatus: 408 };
    if (status === 409) return { category: "CONFLICT", code: rawCode || "DUPLICATE_CONFLICT", httpStatus: 409 };
    if (status === 422) return { category: "TRANSACTION", code: rawCode || "BUSINESS_RULE_VIOLATION", httpStatus: 422 };
    if (status === 423) return { category: "AUTHORIZATION", code: rawCode || "SYSTEM_LOCKED", httpStatus: 423 };
    if (status === 429) return { category: "RATE_LIMIT", code: rawCode || "RATE_LIMIT_EXCEEDED", httpStatus: 429 };
    if (status === 501) return { category: "SYSTEM", code: rawCode || "NOT_IMPLEMENTED", httpStatus: 501 };
    if (status === 502) return { category: "NETWORK", code: rawCode || "BAD_GATEWAY", httpStatus: 502 };
    if (status === 503) return { category: "SERVICE_UNAVAILABLE", code: rawCode || "SERVICE_UNAVAILABLE", httpStatus: 503 };
    if (status === 504) return { category: "TIMEOUT", code: rawCode || "GATEWAY_TIMEOUT", httpStatus: 504 };

    return {
        category: status >= 500 ? "INTERNAL" : "VALIDATION",
        code: rawCode || (status >= 500 ? "INTERNAL_ERROR" : "VALIDATION_FAILED"),
        httpStatus: status
    };
}

function createErrorEngine({ catalogue, responseEngine, storageAdapter, eventEngine, logger }) {
    async function normalizeAndLog(err, req = {}) {
        const classified = classifyError(err);
        const def = catalogue.get(classified.code, classified.httpStatus, false);
        const isServerError = classified.httpStatus >= 500;

        // Safe user-facing message: NEVER expose raw stack traces or SQL/Prisma internals on >= 500
        const safeUserMessage =
            !isServerError && err && err.isOperational && err.message
                ? err.message
                : def.message;

        const structuredErrors = Array.isArray(err?.errors)
            ? err.errors
            : err?.details && Array.isArray(err.details)
                ? err.details
                : [];

        const record = {
            requestId: req.requestId || null,
            code: def.code,
            httpStatus: classified.httpStatus,
            userMessage: safeUserMessage,
            technicalMessage: sanitizeDiagnosticText((err && err.message) || def.message),
            stackTrace: err && err.stack ? sanitizeDiagnosticText(err.stack) : null,
            errorCategory: classified.category,
            module: extractModule(req.originalUrl || req.path || ""),
            method: req.method || null,
            path: req.originalUrl || req.path || null,
            userId: req.user?.id || null,
            userRole: req.user?.role || null,
            tenantId: req.user?.hospitalId || req.user?.tenantId || null
        };

        // Persist technical diagnostics + raise critical alert for authorized developers
        try {
            if (storageAdapter && typeof storageAdapter.writeErrorLog === "function") {
                await storageAdapter.writeErrorLog(record);
            }
            if (isServerError && eventEngine) {
                await eventEngine.publish({
                    eventCode: "SYSTEM_ERROR_DETECTED",
                    domain: record.module || "SYSTEM",
                    actorUserId: record.userId,
                    actorRole: record.userRole,
                    tenantId: record.tenantId,
                    affectedRecord: `${record.method || ""} ${record.path || ""}`.trim(),
                    severity: "CRITICAL",
                    requestId: record.requestId,
                    payload: {
                        code: record.code,
                        httpStatus: record.httpStatus,
                        errorCategory: record.errorCategory,
                        path: record.path
                    },
                    notifications: [
                        {
                            recipientRole: "DEVELOPER",
                            title: `System Error Detected (${record.httpStatus})`,
                            message: `${record.errorCategory} error at ${record.path || "system"}: ${record.code}`,
                            severity: "ERROR",
                            channel: "REALTIME"
                        }
                    ]
                });
            }
        } catch (persistErr) {
            if (logger && typeof logger.error === "function") {
                logger.error(`[GBS-RCCE ErrorEngine] Diagnostic persistence failed: ${persistErr.message}`);
            }
        }

        const envelope = responseEngine.buildEnvelope({
            success: false,
            code: def.code,
            message: safeUserMessage,
            data: null,
            errors: structuredErrors,
            httpStatus: classified.httpStatus,
            requestId: record.requestId
        });

        return {
            httpStatus: classified.httpStatus,
            envelope,
            diagnostic: record
        };
    }

    return Object.freeze({
        classifyError,
        normalizeAndLog
    });
}

function extractModule(urlPath = "") {
    const clean = String(urlPath).replace(/^\/api\/v\d+\/?/, "");
    const firstSeg = clean.split("/")[0];
    return (firstSeg || "SYSTEM").toUpperCase();
}

module.exports = { createErrorEngine, classifyError, sanitizeDiagnosticText };
