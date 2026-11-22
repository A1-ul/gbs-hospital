"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ENTERPRISE TENANT ACCESS & SAFETY GUARD MIDDLEWARE
Patient Safety Emergency Bypass Enforced
LOCATION: src/modules/tenant-management/tenant-access.middleware.js
====================================================
*/

const jwt = require("jsonwebtoken");
const prisma = require("../../core/database/prisma.client");
const { environment } = require("../../config/environment");
const { calculateCountdown } = require("./helpers/countdown.engine");
const { hasDeveloperAccess } = require("../../config/roles");
const logger = require("../../core/utils/logger");

function resolveRequestActor(req) {
    if (req.user && typeof req.user === "object") {
        return req.user;
    }
    try {
        const authHeader = req.headers && req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        const secret = environment?.JWT_SECRET || process.env.JWT_SECRET;
        if (!secret) return null;
        return jwt.verify(authHeader.slice(7).trim(), secret, { algorithms: ["HS256"] });
    } catch (_err) {
        return null;
    }
}

const TENANT_BYPASS_PREFIXES = [
    "/health",
    "/auth",
    "/tenants/register",
    "/tenants/developer",
    "/developer",
    "/rcce/developer"
];

const EMERGENCY_CLINICAL_PATH_TOKENS = [
    "/emergency",
    "/ambulance",
    "/ems",
    "/triage",
    "/blood-bank",
    "/transfusion",
    "/icu",
    "/clinical/trauma"
];

/**
 * Tenant Access Guard
 * Verifies that the tenant associated with the current user or request
 * is approved, active, unlocked, and has an active subscription.
 *
 * CRITICAL PATIENT SAFETY GUARDRAIL:
 * If an institution is expired or locked, emergency clinical workflows
 * (ER triage, ambulance dispatch, ICU, blood bank, emergency prescriptions, trauma care)
 * must NEVER be blocked. The system grants instant audited bypass for emergency
 * endpoints or explicit emergency override headers.
 */
async function tenantAccessGuard(req, res, next) {
    try {
        const cleanPath = String(req.path || "").split("?")[0];
        if (TENANT_BYPASS_PREFIXES.some((prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`))) {
            return next();
        }

        const user = resolveRequestActor(req);

        // If no user context (e.g. unauthenticated public route), let route auth handle it
        if (!user) {
            return next();
        }

        // Permanent Developer role has platform-wide authority bypass
        if (hasDeveloperAccess(user.role)) {
            return next();
        }

        const hospitalId = user.hospitalId || req.headers["x-hospital-id"] || req.query.hospitalId;
        const tenantHeader = user.tenantId || req.headers["x-tenant-id"];

        let tenant = null;

        if (tenantHeader) {
            tenant = await prisma.tenant.findFirst({
                where: {
                    OR: [
                        { id: String(tenantHeader) },
                        { tenantId: String(tenantHeader) },
                        { tenantCode: String(tenantHeader) }
                    ]
                },
                include: {
                    subscriptions: {
                        orderBy: { createdAt: "desc" },
                        take: 1
                    }
                }
            });
        } else if (hospitalId) {
            const hospital = await prisma.hospital.findUnique({
                where: { id: String(hospitalId) },
                include: {
                    tenant: {
                        include: {
                            subscriptions: {
                                orderBy: { createdAt: "desc" },
                                take: 1
                            }
                        }
                    }
                }
            });
            if (hospital) {
                tenant = hospital.tenant;
            }
        }

        // If user/request is not scoped to a tenant record yet, allow normal auth/RBAC to govern
        if (!tenant) {
            return next();
        }

        req.tenant = tenant;

        const isEmergencyPath = EMERGENCY_CLINICAL_PATH_TOKENS.some((tok) => cleanPath.includes(tok));
        const hasEmergencyHeader = String(req.headers["x-emergency-override"] || "").toLowerCase() === "true";
        const isEmergencyBypass = isEmergencyPath || hasEmergencyHeader;

        // 1. Check Tenant Approval & Lock/Suspension Status
        if (tenant.status === "PENDING" || tenant.status === "VERIFICATION_REQUIRED") {
            return res.status(403).json({
                success: false,
                code: "TENANT_PENDING_APPROVAL",
                message: "Institution account is pending review and provisioning by GBS Developer Administration.",
                data: {
                    tenantId: tenant.tenantId,
                    status: tenant.status
                }
            });
        }

        const isTenantBlocked =
            Boolean(tenant.systemLocked) ||
            ["LOCKED", "SUSPENDED", "TERMINATED", "CANCELLED", "ARCHIVED"].includes(tenant.status);

        if (isTenantBlocked) {
            if (isEmergencyBypass) {
                try {
                    await prisma.auditLog.create({
                        data: {
                            userId: user.id || null,
                            role: user.role || null,
                            tenantId: tenant.id,
                            hospitalId: tenant.hospitalId || null,
                            action: "PATIENT_SAFETY_EMERGENCY_BYPASS",
                            module: "TENANT_ACCESS",
                            outcome: "SUCCESS",
                            requestId: req.requestId || null,
                            method: req.method,
                            path: req.originalUrl,
                            description: `Emergency clinical bypass invoked for locked tenant ${tenant.name} (${tenant.tenantId}) on ${req.method} ${req.originalUrl}. Emergency Reason: ${req.headers["x-emergency-reason"] || "Clinical Emergency Override"}`
                        }
                    });
                } catch (auditErr) {
                    logger.error("Failed to log emergency bypass audit", auditErr);
                }

                res.setHeader("X-Tenant-Emergency-Access", "ACTIVE_AUDITED");
                res.setHeader("X-Tenant-Lock-Status", tenant.systemLocked ? "LOCKED" : tenant.status);
                return next();
            }

            return res.status(423).json({
                success: false,
                code: "SYSTEM_LOCKED",
                message: `Institution access is currently ${tenant.systemLocked ? "locked" : tenant.status.toLowerCase()}. ${tenant.lockReason || "Please contact GBS Developer Administration."}`,
                data: {
                    tenantId: tenant.tenantId,
                    status: tenant.status,
                    systemLocked: Boolean(tenant.systemLocked),
                    lockReason: tenant.lockReason || null,
                    emergencyBypassSupported: true
                }
            });
        }

        // 2. Check Subscription & Authoritative Realtime Countdown Status
        const activeSub = tenant.subscriptions && tenant.subscriptions[0];
        if (activeSub) {
            const countdown = calculateCountdown(activeSub, tenant.systemLocked);

            res.setHeader("X-Tenant-Subscription-Tier", activeSub.plan || "STANDARD");
            res.setHeader("X-Tenant-Days-Remaining", String(countdown.remainingDays));
            res.setHeader("X-Tenant-Warning-Tier", countdown.warningTier);

            if (countdown.isLocked) {
                if (isEmergencyBypass) {
                    try {
                        await prisma.auditLog.create({
                            data: {
                                userId: user.id || null,
                                role: user.role || null,
                                tenantId: tenant.id,
                                hospitalId: tenant.hospitalId || null,
                                action: "PATIENT_SAFETY_EMERGENCY_BYPASS_EXPIRED",
                                module: "TENANT_ACCESS",
                                outcome: "SUCCESS",
                                requestId: req.requestId || null,
                                method: req.method,
                                path: req.originalUrl,
                                description: `Emergency clinical bypass invoked for expired subscription of tenant ${tenant.name} (${tenant.tenantId}) on ${req.method} ${req.originalUrl}`
                            }
                        });
                    } catch (auditErr) {
                        logger.error("Failed to log expired subscription bypass audit", auditErr);
                    }

                    res.setHeader("X-Tenant-Emergency-Access", "ACTIVE_AUDITED");
                    res.setHeader("X-Tenant-Subscription-Status", "EXPIRED_EMERGENCY_BYPASS");
                    return next();
                }

                return res.status(402).json({
                    success: false,
                    code: "SUBSCRIPTION_EXPIRED",
                    message: "Institution subscription has expired. Please renew your license or contact GBS Developer Administration. Emergency clinical care remains accessible.",
                    data: {
                        tenantId: tenant.tenantId,
                        expiredAt: activeSub.subscriptionEndDate || activeSub.trialEndDate,
                        countdown,
                        emergencyBypassSupported: true
                    }
                });
            }
        }

        return next();
    } catch (error) {
        logger.error("Error in tenantAccessGuard", error);
        return next(error);
    }
}

module.exports = {
    tenantAccessGuard
};
