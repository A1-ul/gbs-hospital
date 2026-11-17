"use strict";

/*
================================================================================
GBS CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE (GBS-RCCE)
MODULE: Duplicate-Submission & Idempotency Protection Engine
LOCATION: enterprise-framework/gbs-rcce/idempotency.engine.js
================================================================================
Prevents duplicate payments, duplicate admissions, duplicate registrations,
and double-click mutations via cryptographic payload fingerprinting +
X-Idempotency-Key / Idempotency-Key tracking.
================================================================================
*/

const crypto = require("crypto");

function stableStringify(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(",")}]`;
    }
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

function hashPayload(payload = {}) {
    const clean = { ...(payload || {}) };
    delete clean.idempotencyKey;
    return crypto.createHash("sha256").update(stableStringify(clean)).digest("hex");
}

function createIdempotencyEngine({
    storageAdapter,
    catalogue,
    responseEngine,
    auditEngine,
    defaultTtlMs = 24 * 60 * 60 * 1000,
    logger
}) {
    // In-memory lock & rapid-replay cache (backed permanently by PostgreSQL IdempotencyRecord)
    const inFlightLocks = new Set();
    const memorySnapshotCache = new Map();

    function extractKey(req) {
        return (
            req.headers["x-idempotency-key"] ||
            req.headers["idempotency-key"] ||
            (req.body && req.body.idempotencyKey) ||
            null
        );
    }

    function middleware(options = {}) {
        const sensitiveMethods = options.methods || ["POST", "PUT", "PATCH"];

        return async function gbsRcceIdempotencyMiddleware(req, res, next) {
            if (!sensitiveMethods.includes(String(req.method).toUpperCase())) {
                return next();
            }

            const key = extractKey(req);
            if (!key) {
                return next();
            }

            const userId =
                (req.user && req.user.id) ||
                (req.headers && req.headers["x-gbs-actor-id"]) ||
                (() => {
                    try {
                        const auth = req.headers && req.headers.authorization;
                        if (!auth || !auth.startsWith("Bearer ")) return null;
                        const parts = auth.slice(7).split(".");
                        if (parts.length !== 3) return null;
                        const decoded = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
                        return decoded && decoded.id ? `jwt:${decoded.id}` : null;
                    } catch (_e) {
                        return null;
                    }
                })() ||
                "ANONYMOUS";
            const method = String(req.method).toUpperCase();
            const path = (req.originalUrl || req.path || "").split("?")[0];
            const payloadHash = hashPayload(req.body || {});
            const lockTuple = `${key}::${userId}::${method}::${path}`;

            if (inFlightLocks.has(lockTuple)) {
                const def = catalogue.get("TRANSACTION_IN_PROGRESS", 409, false);
                return res.status(409).json(
                    responseEngine.buildEnvelope({
                        success: false,
                        code: def.code,
                        message: def.message,
                        httpStatus: 409,
                        requestId: req.requestId
                    })
                );
            }

            try {
                let existing = memorySnapshotCache.get(lockTuple) || null;
                if (!existing && storageAdapter && typeof storageAdapter.findIdempotencyRecord === "function") {
                    existing = await storageAdapter.findIdempotencyRecord({
                        idempotencyKey: String(key),
                        userId: String(userId),
                        method,
                        path
                    });
                }

                if (existing && new Date(existing.expiresAt) > new Date()) {
                    if (existing.payloadHash !== payloadHash) {
                        const def = catalogue.get("DUPLICATE_SUBMISSION", 409, false);
                        if (auditEngine) {
                            await auditEngine.record({
                                userId: req.user?.id || null,
                                role: req.user?.role || "ANONYMOUS",
                                tenantId: req.user?.hospitalId || null,
                                action: "IDEMPOTENCY_KEY_MISMATCH_REJECTED",
                                module: "IDEMPOTENCY",
                                affectedRecord: `${method} ${path}`,
                                outcome: "DENIED",
                                requestId: req.requestId,
                                responseCode: def.code,
                                httpStatus: 409,
                                method,
                                path,
                                ipAddress: req.ip
                            });
                        }
                        return res.status(409).json(
                            responseEngine.buildEnvelope({
                                success: false,
                                code: def.code,
                                message: "Duplicate request rejected: idempotency key already used with different details.",
                                httpStatus: 409,
                                requestId: req.requestId
                            })
                        );
                    }

                    // Replay preserved transaction result cleanly without re-executing mutation
                    res.setHeader("X-Idempotency-Replayed", "true");
                    if (auditEngine) {
                        await auditEngine.record({
                            userId: req.user?.id || null,
                            role: req.user?.role || "ANONYMOUS",
                            tenantId: req.user?.hospitalId || null,
                            action: "IDEMPOTENCY_DUPLICATE_PREVENTED",
                            module: "IDEMPOTENCY",
                            affectedRecord: `${method} ${path}`,
                            outcome: "DUPLICATE_REPLAY",
                            requestId: req.requestId,
                            responseCode: "DUPLICATE_SUBMISSION",
                            httpStatus: existing.httpStatus,
                            method,
                            path,
                            ipAddress: req.ip
                        });
                    }

                    const cachedBody =
                        existing.responseBody && typeof existing.responseBody === "object"
                            ? { ...existing.responseBody, idempotentReplay: true }
                            : existing.responseBody;
                    res._rcceWrapped = true;
                    return res.status(existing.httpStatus || 200).json(cachedBody);
                }
            } catch (lookupErr) {
                if (logger) {
                    logger.warn(`[GBS-RCCE Idempotency] Lookup error: ${lookupErr.message}`);
                }
            }

            inFlightLocks.add(lockTuple);

            // Intercept final JSON body to store idempotency snapshot immediately + persist to DB
            const prevJson = res.json.bind(res);
            res.json = function captureIdempotentResponse(body) {
                inFlightLocks.delete(lockTuple);
                const status = res.statusCode || 200;
                const snapshot = res.locals.rcceEnvelope || body;

                if (status < 500) {
                    const record = {
                        idempotencyKey: String(key),
                        userId: String(userId),
                        method,
                        path,
                        payloadHash,
                        status: "COMPLETED",
                        httpStatus: status,
                        responseBody: snapshot,
                        requestId: req.requestId || null,
                        expiresAt: new Date(Date.now() + defaultTtlMs)
                    };
                    memorySnapshotCache.set(lockTuple, record);
                    if (memorySnapshotCache.size > 1000) {
                        const oldestKey = memorySnapshotCache.keys().next().value;
                        memorySnapshotCache.delete(oldestKey);
                    }
                    if (storageAdapter && typeof storageAdapter.saveIdempotencyRecord === "function") {
                        storageAdapter.saveIdempotencyRecord(record).catch((saveErr) => {
                            if (logger) {
                                logger.warn(`[GBS-RCCE Idempotency] Save snapshot failed: ${saveErr.message}`);
                            }
                        });
                    }
                }
                return prevJson(body);
            };

            res.on("close", () => {
                inFlightLocks.delete(lockTuple);
            });

            return next();
        };
    }

    return Object.freeze({
        hashPayload,
        extractKey,
        middleware
    });
}

module.exports = { createIdempotencyEngine, hashPayload };
