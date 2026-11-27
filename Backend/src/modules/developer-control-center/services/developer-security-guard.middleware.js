"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
DEVELOPER CONTROL CENTER — ZERO-TRUST SECURITY GUARD MIDDLEWARE
CommonJS Only (Step 32 Strict Developer Platform Isolation)
LOCATION: Backend/src/modules/developer-control-center/services/developer-security-guard.middleware.js
================================================================================
Enforces absolute Developer-only authority on all hidden Developer Control
Center routes. Normal Hospital Administrators, Hospital Directors, and staff
are unconditionally blocked with HTTP 403 and audited to PostgreSQL.
*/

const prisma = require("../../../core/database/prisma.client");
const { rcce } = require("../../../core/gbs-rcce.bootstrap");
const { trackAuditWrite } = require("../../../core/middleware/rcce-audit.middleware");

async function developerSecurityGuard(req, res, next) {
    try {
        const actor = req.user;
        const fullPath = req.originalUrl ? req.originalUrl.split("?")[0] : req.path;

        if (!actor || !actor.id) {
            return res.status(401).json(
                rcce.response.buildEnvelope({
                    success: false,
                    code: "UNAUTHORIZED",
                    message: "Developer authentication is required.",
                    httpStatus: 401,
                    requestId: req.requestId
                })
            );
        }

        // Strict Step 32 Isolation: Reject all non-DEVELOPER roles (including ADMINISTRATOR & HOSPITAL_DIRECTOR) and any demo session
        if (actor.role !== "DEVELOPER" || actor.isDemoSession === true) {
            const auditPromise = rcce.audit.record({
                userId: actor.id,
                role: actor.role || "UNKNOWN",
                tenantId: actor.hospitalId || null,
                action: "DEVELOPER_ROUTE_UNAUTHORIZED_ATTEMPT",
                module: "DEVELOPER_SECURITY",
                affectedRecord: `${req.method} ${fullPath}`,
                outcome: "DENIED",
                requestId: req.requestId,
                responseCode: "FORBIDDEN_PERMISSION",
                httpStatus: 403,
                method: req.method,
                path: fullPath,
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
                description: `Blocked non-Developer role (${actor.role}) from hidden Developer Control Center endpoint ${req.method} ${fullPath}`
            });
            if (typeof trackAuditWrite === "function") {
                trackAuditWrite(auditPromise);
            }
            res.locals.rcceAuditRecorded = true;

            return res.status(403).json(
                rcce.response.buildEnvelope({
                    success: false,
                    code: "FORBIDDEN_PERMISSION",
                    message: "You do not have permission to perform this operation.",
                    httpStatus: 403,
                    requestId: req.requestId
                })
            );
        }

        // Inspect live Developer MFA verification record in PostgreSQL when strict enforcement is requested
        const enforceMfa = String(process.env.ENFORCE_STRICT_DEV_MFA || "false").toLowerCase() === "true";
        let mfaVerified = false;
        if (enforceMfa) {
            const mfaRecord = await prisma.systemConfiguration.findUnique({
                where: { configKey: `DEV_MFA_${actor.id}` }
            });
            const mfaVal = mfaRecord?.configValue || null;
            mfaVerified = Boolean(mfaVal && mfaVal.verified === true);
            if (!mfaVerified) {
                return res.status(403).json(
                    rcce.response.buildEnvelope({
                        success: false,
                        code: "DEVELOPER_MFA_REQUIRED",
                        message: "Verified 6-digit Developer MFA challenge is required to access this control center operation.",
                        httpStatus: 403,
                        requestId: req.requestId
                    })
                );
            }
        }

        req.developerSecurityContext = {
            verifiedRole: "DEVELOPER",
            mfaChecked: enforceMfa,
            mfaVerified,
            deviceFingerprint: req.headers["x-device-fingerprint"] || null
        };

        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    developerSecurityGuard
};
