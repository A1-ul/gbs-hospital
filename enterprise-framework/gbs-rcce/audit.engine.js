"use strict";

/*
================================================================================
GBS CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE (GBS-RCCE)
MODULE: Activity Tracking & Cryptographic Audit Engine
LOCATION: enterprise-framework/gbs-rcce/audit.engine.js
================================================================================
Captures both successful AND unsuccessful/unauthorized operations with:
  userId, role, tenantId/hospitalId, action, affectedRecord, timestamp,
  outcome, requestId, responseCode, httpStatus, ipAddress, and SHA-256 chain.
================================================================================
*/

const crypto = require("crypto");

function computeIntegrityHash(entry, previousHash = "GENESIS") {
    const canonical = JSON.stringify({
        previousHash,
        userId: entry.userId || null,
        role: entry.role || null,
        tenantId: entry.tenantId || null,
        action: entry.action,
        module: entry.module,
        affectedRecord: entry.affectedRecord || null,
        outcome: entry.outcome,
        requestId: entry.requestId || null,
        responseCode: entry.responseCode || null,
        httpStatus: entry.httpStatus || null,
        timestamp: entry.timestamp
    });
    return crypto.createHash("sha256").update(canonical).digest("hex");
}

function createAuditEngine({ storageAdapter, logger }) {
    let lastHash = "GENESIS";
    let hashHydrated = false;

    async function record(entry = {}) {
        const timestamp = new Date().toISOString();
        const normalized = {
            userId: entry.userId || null,
            role: entry.role || "ANONYMOUS",
            tenantId: entry.tenantId || entry.hospitalId || null,
            hospitalId: entry.hospitalId || entry.tenantId || null,
            action: String(entry.action || "UNKNOWN_ACTION").slice(0, 120),
            module: String(entry.module || "SYSTEM").slice(0, 64).toUpperCase(),
            description: entry.description || null,
            affectedRecord: entry.affectedRecord ? String(entry.affectedRecord).slice(0, 160) : null,
            outcome: entry.outcome || "SUCCESS",
            requestId: entry.requestId || null,
            responseCode: entry.responseCode || null,
            httpStatus: entry.httpStatus || null,
            method: entry.method || null,
            path: entry.path || null,
            ipAddress: entry.ipAddress || null,
            userAgent: entry.userAgent || null,
            metadata: entry.metadata || null,
            timestamp
        };

        try {
            if (!hashHydrated && storageAdapter && typeof storageAdapter.getLatestAuditHash === "function") {
                const latest = await storageAdapter.getLatestAuditHash();
                if (latest) lastHash = latest;
                hashHydrated = true;
            }
            const previousHash = lastHash;
            const integrityHash = computeIntegrityHash(normalized, previousHash);
            lastHash = integrityHash;

            const persistable = {
                ...normalized,
                previousHash,
                integrityHash
            };
            delete persistable.timestamp;

            if (storageAdapter && typeof storageAdapter.writeAudit === "function") {
                return await storageAdapter.writeAudit(persistable);
            }
            return persistable;
        } catch (err) {
            if (logger && typeof logger.error === "function") {
                logger.error(`[GBS-RCCE AuditEngine] Failed to write audit entry: ${err.message}`);
            }
            return null;
        }
    }

    async function verifyIntegrity(records = []) {
        let valid = true;
        let brokenAtId = null;
        for (const rec of records) {
            if (rec.integrityHash && !/^[a-f0-9]{64}$/.test(rec.integrityHash)) {
                valid = false;
                brokenAtId = rec.id;
                break;
            }
        }
        return {
            verifiedCount: records.length,
            integrityIntact: valid,
            brokenAtId
        };
    }

    return Object.freeze({
        record,
        verifyIntegrity,
        computeIntegrityHash
    });
}

module.exports = { createAuditEngine, computeIntegrityHash };
