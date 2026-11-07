"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ENTERPRISE TENANT ACCESS & SAFETY GUARD MIDDLEWARE
Patient Safety Emergency Bypass Enforced
LOCATION: src/modules/tenant-management/tenant-access.middleware.js
====================================================
*/

const prisma = require("../../core/database/prisma.client");
const { calculateCountdown } = require("./helpers/countdown.engine");
const { hasDeveloperAccess } = require("../../config/roles");
const logger = require("../../core/utils/logger");

/**
 * Tenant Access Guard
 * Verifies that the tenant associated with the current user or request
 * is approved, active, and has an active subscription.
 *
 * CRITICAL SAFETY REQUIREMENT:
 * If an institution is expired or locked, emergency clinical workflows
 * (ER triage, emergency prescriptions, trauma care) must NEVER be blocked.
 * The system grants instant audited bypass for emergency endpoints or headers.
 */
async function tenantAccessGuard(req, res, next) {
    try {
        const user = req.user;

        // If no user context (e.g. public routes), continue
        if (!user) {
            return next();
        }

        // Developer / Super Admin have absolute system bypass
        if (hasDeveloperAccess(user.role)) {
            return next();
        }

        // Determine tenant identifier or hospital ID
        const hospitalId = user.hospitalId || req.headers["x-hospital-id"] || req.query.hospitalId;
        const tenantHeader = req.headers["x-tenant-id"];

        let tenant = null;

        if (tenantHeader) {
            tenant = await prisma.tenant.findFirst({
                where: {
                    OR: [
                        { id: tenantHeader },
                        { tenantId: tenantHeader }
                    ]
                },
                include: {
                    subscriptions: {
                        orderBy: { endsAt: "desc" },
                        take: 1
                    }
                }
            });
        } else if (hospitalId) {
            const hospital = await prisma.hospital.findUnique({
                where: { id: hospitalId },
                include: {
                    tenant: {
                        include: {
                            subscriptions: {
                                orderBy: { endsAt: "desc" },
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

        // If no tenant is bound yet (e.g. initial onboarding phase), allow through
        if (!tenant) {
            return next();
        }

        req.tenant = tenant;

        // Check Emergency Bypass Criteria
        const isEmergencyPath = req.path.includes("/emergency") || req.path.includes("/triage") || req.path.includes("/clinical/trauma");
        const hasEmergencyHeader = req.headers["x-emergency-override"] === "true";
        const isEmergencyBypass = isEmergencyPath || hasEmergencyHeader;

        // 1. Check Tenant Approval & Lock Status
        if (tenant.status === "PENDING") {
            return res.status(403).json({
                success: false,
                error: "TENANT_PENDING_APPROVAL",
                message: "Institution account is pending review and provisioning by GBS Developer Administration.",
                tenantId: tenant.tenantId
            });
        }

        if (tenant.status === "LOCKED" || tenant.status === "SUSPENDED" || tenant.status === "TERMINATED") {
            if (isEmergencyBypass) {
                // Log Patient Safety Emergency Bypass in Audit Trail
                try {
                    await prisma.auditLog.create({
                        data: {
                            userId: user.id,
                            action: "PATIENT_SAFETY_EMERGENCY_BYPASS",
                            module: "TENANT_ACCESS",
                            description: `Emergency clinical bypass invoked for locked tenant ${tenant.name} (${tenant.tenantId}) on ${req.method} ${req.originalUrl}. Emergency Reason: ${req.headers["x-emergency-reason"] || "Clinical Emergency Override"}`
                        }
                    });
                } catch (auditErr) {
                    logger.error("Failed to log emergency bypass audit", auditErr);
                }

                res.setHeader("X-Tenant-Emergency-Access", "ACTIVE_AUDITED");
                res.setHeader("X-Tenant-Lock-Status", tenant.status);
                return next();
            }

            return res.status(403).json({
                success: false,
                error: "TENANT_ACCESS_LOCKED",
                message: `Institution access is currently ${tenant.status.toLowerCase()}. ${tenant.lockReason || "Please contact GBS Developer Administration."}`,
                tenantId: tenant.tenantId,
                status: tenant.status,
                lockReason: tenant.lockReason
            });
        }

        // 2. Check Subscription & Realtime Countdown Status
        const activeSub = tenant.subscriptions && tenant.subscriptions[0];
        if (activeSub) {
            const countdown = calculateCountdown(activeSub, tenant.systemLocked);

            // Attach realtime subscription telemetry headers
            res.setHeader("X-Tenant-Subscription-Tier", activeSub.plan || activeSub.tier || "STANDARD");
            res.setHeader("X-Tenant-Days-Remaining", countdown.remainingDays);
            res.setHeader("X-Tenant-Warning-Tier", countdown.warningTier);

            if (countdown.isExpired) {
                if (isEmergencyBypass) {
                    try {
                        await prisma.auditLog.create({
                            data: {
                                userId: user.id,
                                action: "PATIENT_SAFETY_EMERGENCY_BYPASS_EXPIRED",
                                module: "TENANT_ACCESS",
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

                return res.status(403).json({
                    success: false,
                    error: "SUBSCRIPTION_EXPIRED",
                    message: "Institution subscription has expired. Please contact GBS Developer Administration to renew license.",
                    tenantId: tenant.tenantId,
                    expiredAt: activeSub.endsAt,
                    countdown
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
