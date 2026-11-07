"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ENTERPRISE TENANT MANAGEMENT & ONBOARDING SERVICE
Absolute Developer Authority - Automated Provisioning
Real-Time Countdown & Facility GPS Telemetry
LOCATION: src/modules/tenant-management/tenant-management.service.js
====================================================
*/

const prisma = require("../../core/database/prisma.client");
const { hashPassword } = require("../../core/security/password");
const { generateTenantIdentifiers, generateSubscriptionIdentifier } = require("./helpers/tenant-id.generator");
const { calculateCountdown } = require("./helpers/countdown.engine");
const AppError = require("../../core/errors/app.error");
const logger = require("../../core/utils/logger");

/**
 * Register a new Institution.
 * Sets status to PENDING awaiting Developer review and approval.
 */
async function registerTenant(data) {
    const {
        name,
        type = "GENERAL_HOSPITAL",
        country,
        region,
        city,
        address,
        latitude,
        longitude,
        officialEmail,
        officialPhone,
        website,
        registrationNumber,
        licenseNumber,
        taxId,
        logoUrl,
        representativeName,
        representativePosition,
        representativeEmail,
        representativePhone,
        adminName,
        adminEmail,
        adminPhone,
        adminPassword
    } = data;

    if (!name || !country || !officialEmail || !officialPhone || !adminEmail || !adminPassword) {
        throw new AppError("Institution name, country, official email/phone, and administrator credentials are required", 400, "MISSING_REQUIRED_FIELDS");
    }

    const normalizedEmail = officialEmail.trim().toLowerCase();
    const normalizedAdminEmail = adminEmail.trim().toLowerCase();

    // Check email uniqueness
    const existingTenant = await prisma.tenant.findUnique({
        where: { officialEmail: normalizedEmail }
    });
    if (existingTenant) {
        throw new AppError("An institution with this official email already exists", 409, "TENANT_ALREADY_EXISTS");
    }

    const existingAdmin = await prisma.user.findUnique({
        where: { email: normalizedAdminEmail }
    });
    if (existingAdmin) {
        throw new AppError("An account with this administrator email already exists", 409, "ADMIN_EMAIL_ALREADY_EXISTS");
    }

    // Generate unique sequential enterprise identifiers
    const { tenantId, tenantCode, institutionId } = await generateTenantIdentifiers();

    // Hash admin password for automated provisioning upon developer approval
    const hashedPassword = await hashPassword(adminPassword);

    const tenant = await prisma.$transaction(async (tx) => {
        const createdTenant = await tx.tenant.create({
            data: {
                tenantId,
                tenantCode,
                institutionId,
                name: name.trim(),
                type,
                country: country.trim(),
                region: region || null,
                city: city || null,
                address: address || null,
                latitude: latitude ? Number(latitude) : null,
                longitude: longitude ? Number(longitude) : null,
                officialEmail: normalizedEmail,
                officialPhone: officialPhone.trim(),
                website: website || null,
                registrationNumber: registrationNumber || null,
                licenseNumber: licenseNumber || null,
                taxId: taxId || null,
                logoUrl: logoUrl || null,
                status: "PENDING",
                systemLocked: false,
                representativeName: representativeName || null,
                representativePosition: representativePosition || null,
                representativeEmail: representativeEmail || null,
                representativePhone: representativePhone || null
            }
        });

        // Lookup Super Admin role
        let superAdminRole = await tx.role.findUnique({ where: { name: "SUPER_ADMIN" } });
        if (!superAdminRole) {
            superAdminRole = await tx.role.findFirst({ where: { name: "ADMINISTRATOR" } });
        }

        // Stage administrator account in pending status
        const [firstName, ...lastNameParts] = (adminName || "Tenant Admin").split(" ");
        await tx.user.create({
            data: {
                firstName: firstName || "Tenant",
                lastName: lastNameParts.join(" ") || "Admin",
                email: normalizedAdminEmail,
                password: hashedPassword,
                roleId: superAdminRole.id,
                active: false // Inactive until Developer approves the tenant
            }
        });

        // Audit Log
        await tx.auditLog.create({
            data: {
                action: "TENANT_REGISTRATION_SUBMITTED",
                module: "TENANT_MANAGEMENT",
                description: `Institution ${createdTenant.name} (${createdTenant.tenantId}) registered. Awaiting Developer approval.`
            }
        });

        return createdTenant;
    });

    logger.info({
        message: "New tenant registered",
        tenantId: tenant.tenantId,
        tenantCode: tenant.tenantCode,
        name: tenant.name
    });

    return {
        id: tenant.id,
        tenantId: tenant.tenantId,
        tenantCode: tenant.tenantCode,
        institutionId: tenant.institutionId,
        name: tenant.name,
        status: tenant.status,
        systemLocked: tenant.systemLocked,
        message: "Institution registered successfully. Awaiting Lead Developer review and automated provisioning."
    };
}

/**
 * Approve Tenant and run Automated Provisioning.
 * Strictly under Developer Authority!
 */
async function approveAndProvisionTenant(tenantIdentifier, options = {}, developerUserId) {
    const tenant = await prisma.tenant.findFirst({
        where: {
            OR: [
                { id: tenantIdentifier },
                { tenantId: tenantIdentifier },
                { tenantCode: tenantIdentifier }
            ]
        },
        include: {
            subscriptions: true
        }
    });

    if (!tenant) {
        throw new AppError("Tenant not found", 404, "TENANT_NOT_FOUND");
    }

    if (tenant.status === "ACTIVE_TRIAL" || tenant.status === "ACTIVE_PAID") {
        return {
            tenantId: tenant.tenantId,
            status: tenant.status,
            message: "Tenant is already active and provisioned"
        };
    }

    const trialDays = options.trialDays || 30;
    const now = new Date();
    const trialEndDate = new Date(now.getTime() + trialDays * 86400 * 1000);
    const subscriptionId = await generateSubscriptionIdentifier();

    const provisioned = await prisma.$transaction(async (tx) => {
        // 1. Create Hospital Profile
        const hospital = await tx.hospital.create({
            data: {
                name: tenant.name,
                code: tenant.tenantCode,
                registrationNumber: tenant.registrationNumber || `${tenant.tenantCode}-REG`,
                email: tenant.officialEmail,
                phone: tenant.officialPhone,
                website: tenant.website,
                address: tenant.address,
                city: tenant.city,
                country: tenant.country,
                logo: tenant.logoUrl,
                timezone: options.timezone || "UTC",
                active: true
            }
        });

        // 2. Update Tenant with Hospital ID and Active Status
        const updatedTenant = await tx.tenant.update({
            where: { id: tenant.id },
            data: {
                status: "ACTIVE_TRIAL",
                systemLocked: false,
                hospitalId: hospital.id
            }
        });

        // 3. Create Subscription Record (30-day trial)
        const subscription = await tx.tenantSubscription.create({
            data: {
                subscriptionId,
                tenantId: tenant.id,
                plan: options.plan || "ENTERPRISE_TRIAL",
                status: "ACTIVE_TRIAL",
                trialStartDate: now,
                trialEndDate,
                price: 0.0,
                currency: "USD",
                billingCycle: "MONTHLY",
                autoRenew: false
            }
        });

        // 4. Activate staged Administrator account
        const stagedAdmin = await tx.user.findFirst({
            where: {
                email: tenant.officialEmail
            }
        });
        if (stagedAdmin) {
            await tx.user.update({
                where: { id: stagedAdmin.id },
                data: { active: true }
            });
        }

        // 5. Create Default Hospital Departments
        const defaultDepartments = [
            { name: "Emergency Care Unit", code: "EMERGENCY" },
            { name: "General Outpatient (OPD)", code: "OPD" },
            { name: "General Surgery & Operating Theatre", code: "SURGERY" },
            { name: "Pharmacy & Formulary", code: "PHARMACY" },
            { name: "Clinical Pathology & Laboratory", code: "LAB" },
            { name: "Radiology & Diagnostic Imaging", code: "RADIOLOGY" },
            { name: "Inpatient Wards & ICU", code: "INPATIENT" },
            { name: "Pediatrics & Child Health", code: "PEDIATRICS" },
            { name: "Obstetrics & Gynecology", code: "OBGYN" }
        ];

        for (const dept of defaultDepartments) {
            await tx.hospitalDepartment.create({
                data: {
                    hospitalId: hospital.id,
                    name: dept.name,
                    code: `${tenant.tenantCode}-${dept.code}`,
                    active: true
                }
            });
        }

        // 6. Record Initial Location Ping if coordinates available
        if (tenant.latitude && tenant.longitude) {
            await tx.tenantLocationPing.create({
                data: {
                    tenantId: tenant.id,
                    latitude: tenant.latitude,
                    longitude: tenant.longitude,
                    status: "ONLINE"
                }
            });
        }

        // 7. Audit Log
        await tx.auditLog.create({
            data: {
                userId: developerUserId || null,
                action: "TENANT_PROVISIONED_BY_DEVELOPER",
                module: "TENANT_MANAGEMENT",
                description: `Developer approved and provisioned institution ${tenant.name} (${tenant.tenantId}) with hospital ID ${hospital.id}`
            }
        });

        return {
            tenant: updatedTenant,
            hospital,
            subscription
        };
    });

    const countdown = calculateCountdown(provisioned.subscription, provisioned.tenant.systemLocked);

    logger.info({
        message: "Tenant provisioned successfully",
        tenantId: provisioned.tenant.tenantId,
        hospitalId: provisioned.hospital.id
    });

    return {
        tenantId: provisioned.tenant.tenantId,
        tenantCode: provisioned.tenant.tenantCode,
        institutionId: provisioned.tenant.institutionId,
        name: provisioned.tenant.name,
        status: provisioned.tenant.status,
        hospital: {
            id: provisioned.hospital.id,
            name: provisioned.hospital.name,
            code: provisioned.hospital.code
        },
        subscription: {
            subscriptionId: provisioned.subscription.subscriptionId,
            plan: provisioned.subscription.plan,
            status: provisioned.subscription.status,
            trialEndDate: provisioned.subscription.trialEndDate
        },
        countdown,
        message: "Tenant approved, provisioned, and activated with full enterprise defaults."
    };
}

/**
 * Developer Tenant Registration Console Telemetry
 * All metrics derived directly from PostgreSQL database.
 */
async function getDeveloperConsoleSummary() {
    const totalTenants = await prisma.tenant.count();
    const activeTenants = await prisma.tenant.count({
        where: {
            status: { in: ["ACTIVE_TRIAL", "ACTIVE_PAID"] },
            systemLocked: false
        }
    });
    const trialTenants = await prisma.tenant.count({
        where: { status: "ACTIVE_TRIAL" }
    });
    const paidTenants = await prisma.tenant.count({
        where: { status: "ACTIVE_PAID" }
    });
    const suspendedTenants = await prisma.tenant.count({
        where: { status: "SUSPENDED" }
    });
    const cancelledTenants = await prisma.tenant.count({
        where: { status: "CANCELLED" }
    });
    const lockedTenants = await prisma.tenant.count({
        where: { systemLocked: true }
    });
    const unverifiedTenants = await prisma.tenant.count({
        where: { status: { in: ["PENDING", "VERIFICATION_REQUIRED"] } }
    });

    // Calculate expiring within 7 days
    const sevenDaysFromNow = new Date(Date.now() + 7 * 86400 * 1000);
    const expiringTenants = await prisma.tenantSubscription.count({
        where: {
            status: { in: ["ACTIVE_TRIAL", "ACTIVE_PAID"] },
            trialEndDate: { lte: sevenDaysFromNow, gte: new Date() }
        }
    });

    const expiredTenants = await prisma.tenantSubscription.count({
        where: {
            trialEndDate: { lt: new Date() }
        }
    });

    return {
        totalTenants,
        activeTenants,
        trialTenants,
        paidTenants,
        expiringTenants,
        expiredTenants,
        suspendedTenants,
        cancelledTenants,
        lockedTenants,
        unverifiedTenants
    };
}

/**
 * List all tenants with live countdown telemetry
 */
async function getTenants({ status, search, limit = 50, offset = 0 }) {
    const where = {};
    if (status) where.status = status;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { tenantId: { contains: search, mode: "insensitive" } },
            { tenantCode: { contains: search, mode: "insensitive" } },
            { officialEmail: { contains: search, mode: "insensitive" } }
        ];
    }

    const [tenants, totalCount] = await Promise.all([
        prisma.tenant.findMany({
            where,
            include: {
                subscriptions: {
                    orderBy: { createdAt: "desc" },
                    take: 1
                },
                hospital: {
                    select: { id: true, name: true, code: true }
                }
            },
            orderBy: { createdAt: "desc" },
            take: Number(limit),
            skip: Number(offset)
        }),
        prisma.tenant.count({ where })
    ]);

    const enriched = tenants.map((t) => {
        const activeSub = t.subscriptions[0] || null;
        const countdown = calculateCountdown(activeSub, t.systemLocked);

        return {
            id: t.id,
            tenantId: t.tenantId,
            tenantCode: t.tenantCode,
            institutionId: t.institutionId,
            name: t.name,
            type: t.type,
            country: t.country,
            city: t.city,
            officialEmail: t.officialEmail,
            officialPhone: t.officialPhone,
            status: t.status,
            systemLocked: t.systemLocked,
            lockReason: t.lockReason,
            hospital: t.hospital,
            subscription: activeSub
                ? {
                    subscriptionId: activeSub.subscriptionId,
                    plan: activeSub.plan,
                    status: activeSub.status,
                    trialEndDate: activeSub.trialEndDate
                }
                : null,
            countdown,
            createdAt: t.createdAt
        };
    });

    return {
        total: totalCount,
        tenants: enriched
    };
}

/**
 * Retrieve single tenant with complete telemetry
 */
async function getTenantById(tenantIdentifier) {
    const tenant = await prisma.tenant.findFirst({
        where: {
            OR: [
                { id: tenantIdentifier },
                { tenantId: tenantIdentifier },
                { tenantCode: tenantIdentifier }
            ]
        },
        include: {
            subscriptions: {
                orderBy: { createdAt: "desc" }
            },
            hospital: true,
            locationPings: {
                orderBy: { recordedAt: "desc" },
                take: 1
            }
        }
    });

    if (!tenant) {
        throw new AppError("Tenant not found", 404, "TENANT_NOT_FOUND");
    }

    const activeSub = tenant.subscriptions[0] || null;
    const countdown = calculateCountdown(activeSub, tenant.systemLocked);

    return {
        ...tenant,
        activeSubscription: activeSub,
        countdown,
        lastLocationPing: tenant.locationPings[0] || null
    };
}

/**
 * Lock tenant system access
 */
async function lockTenant(tenantIdentifier, reason = "Subscription expired or administrative lock", developerUserId) {
    const tenant = await prisma.tenant.findFirst({
        where: {
            OR: [{ id: tenantIdentifier }, { tenantId: tenantIdentifier }]
        }
    });

    if (!tenant) throw new AppError("Tenant not found", 404, "TENANT_NOT_FOUND");

    const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.tenant.update({
            where: { id: tenant.id },
            data: {
                systemLocked: true,
                lockReason: reason,
                lockedAt: new Date()
            }
        });

        await tx.auditLog.create({
            data: {
                userId: developerUserId || null,
                action: "TENANT_SYSTEM_LOCKED",
                module: "TENANT_MANAGEMENT",
                description: `Tenant ${tenant.name} (${tenant.tenantId}) locked. Reason: ${reason}`
            }
        });

        return res;
    });

    return {
        tenantId: updated.tenantId,
        systemLocked: updated.systemLocked,
        lockReason: updated.lockReason,
        message: "Tenant system successfully locked"
    };
}

/**
 * Unlock tenant system access
 */
async function unlockTenant(tenantIdentifier, developerUserId) {
    const tenant = await prisma.tenant.findFirst({
        where: {
            OR: [{ id: tenantIdentifier }, { tenantId: tenantIdentifier }]
        }
    });

    if (!tenant) throw new AppError("Tenant not found", 404, "TENANT_NOT_FOUND");

    const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.tenant.update({
            where: { id: tenant.id },
            data: {
                systemLocked: false,
                lockReason: null,
                lockedAt: null
            }
        });

        await tx.auditLog.create({
            data: {
                userId: developerUserId || null,
                action: "TENANT_SYSTEM_UNLOCKED",
                module: "TENANT_MANAGEMENT",
                description: `Tenant ${tenant.name} (${tenant.tenantId}) unlocked by Developer.`
            }
        });

        return res;
    });

    return {
        tenantId: updated.tenantId,
        systemLocked: updated.systemLocked,
        message: "Tenant system access successfully restored"
    };
}

/**
 * Extend trial or paid subscription
 */
async function extendSubscription(tenantIdentifier, { days = 30, plan = "ACTIVE_PAID" }, developerUserId) {
    const tenant = await prisma.tenant.findFirst({
        where: {
            OR: [{ id: tenantIdentifier }, { tenantId: tenantIdentifier }]
        },
        include: {
            subscriptions: {
                orderBy: { createdAt: "desc" },
                take: 1
            }
        }
    });

    if (!tenant) throw new AppError("Tenant not found", 404, "TENANT_NOT_FOUND");

    const activeSub = tenant.subscriptions[0];
    const now = new Date();
    const currentExpiry = activeSub ? new Date(activeSub.trialEndDate).getTime() : now.getTime();
    const baseDate = Math.max(now.getTime(), currentExpiry);
    const newExpiry = new Date(baseDate + Number(days) * 86400 * 1000);

    const updated = await prisma.$transaction(async (tx) => {
        let sub;
        if (activeSub) {
            sub = await tx.tenantSubscription.update({
                where: { id: activeSub.id },
                data: {
                    trialEndDate: newExpiry,
                    status: plan === "ACTIVE_PAID" ? "ACTIVE_PAID" : "ACTIVE_TRIAL",
                    plan: plan === "ACTIVE_PAID" ? "ENTERPRISE_PAID" : activeSub.plan
                }
            });
        } else {
            const subscriptionId = await generateSubscriptionIdentifier();
            sub = await tx.tenantSubscription.create({
                data: {
                    subscriptionId,
                    tenantId: tenant.id,
                    plan: "ENTERPRISE_PAID",
                    status: "ACTIVE_PAID",
                    trialStartDate: now,
                    trialEndDate: newExpiry
                }
            });
        }

        await tx.tenant.update({
            where: { id: tenant.id },
            data: {
                systemLocked: false,
                status: plan === "ACTIVE_PAID" ? "ACTIVE_PAID" : "ACTIVE_TRIAL"
            }
        });

        await tx.auditLog.create({
            data: {
                userId: developerUserId || null,
                action: "TENANT_SUBSCRIPTION_EXTENDED",
                module: "TENANT_MANAGEMENT",
                description: `Extended subscription by ${days} days for tenant ${tenant.tenantId}. New expiry: ${newExpiry.toISOString()}`
            }
        });

        return sub;
    });

    return {
        tenantId: tenant.tenantId,
        subscriptionId: updated.subscriptionId,
        status: updated.status,
        newExpiry: updated.trialEndDate,
        message: `Subscription successfully extended by ${days} days.`
    };
}

/**
 * Live Facility GPS Tracking
 * Exclusively visible to Developer!
 */
async function getLiveTenantLocations() {
    const tenants = await prisma.tenant.findMany({
        where: {
            status: { not: "ARCHIVED" }
        },
        select: {
            id: true,
            tenantId: true,
            tenantCode: true,
            name: true,
            country: true,
            city: true,
            latitude: true,
            longitude: true,
            status: true,
            systemLocked: true,
            locationPings: {
                orderBy: { recordedAt: "desc" },
                take: 1
            },
            subscriptions: {
                orderBy: { createdAt: "desc" },
                take: 1
            }
        }
    });

    return tenants.map((t) => {
        const lastPing = t.locationPings[0] || null;
        const sub = t.subscriptions[0] || null;
        const countdown = calculateCountdown(sub, t.systemLocked);

        return {
            tenantId: t.tenantId,
            tenantCode: t.tenantCode,
            name: t.name,
            location: {
                latitude: lastPing ? lastPing.latitude : t.latitude,
                longitude: lastPing ? lastPing.longitude : t.longitude,
                country: t.country,
                city: t.city
            },
            onlineStatus: lastPing ? lastPing.status : "OFFLINE",
            systemLocked: t.systemLocked,
            subscriptionStatus: t.status,
            warningTier: countdown.warningTier,
            formattedCountdown: countdown.formattedCountdown
        };
    });
}

/**
 * Record a location ping for a tenant facility
 */
async function recordLocationPing(tenantIdentifier, { latitude, longitude, status = "ONLINE" }) {
    const tenant = await prisma.tenant.findFirst({
        where: {
            OR: [{ id: tenantIdentifier }, { tenantId: tenantIdentifier }]
        }
    });

    if (!tenant) throw new AppError("Tenant not found", 404, "TENANT_NOT_FOUND");

    const ping = await prisma.tenantLocationPing.create({
        data: {
            tenantId: tenant.id,
            latitude: Number(latitude),
            longitude: Number(longitude),
            status
        }
    });

    return {
        id: ping.id,
        tenantId: tenant.tenantId,
        latitude: ping.latitude,
        longitude: ping.longitude,
        status: ping.status,
        recordedAt: ping.recordedAt
    };
}

/**
 * Developer messaging to tenant or broadcast to all tenants
 */
async function sendMessageToTenant({ tenantIdentifier, title, message, priority = "NORMAL" }, developerUserId) {
    if (!title || !message) {
        throw new AppError("Title and message are required", 400, "MISSING_MESSAGE_CONTENT");
    }

    let tenantDbId = null;
    let targetDesc = "ALL_TENANTS (Broadcast)";

    if (tenantIdentifier) {
        const tenant = await prisma.tenant.findFirst({
            where: {
                OR: [{ id: tenantIdentifier }, { tenantId: tenantIdentifier }]
            }
        });
        if (!tenant) throw new AppError("Tenant not found", 404, "TENANT_NOT_FOUND");
        tenantDbId = tenant.id;
        targetDesc = `${tenant.name} (${tenant.tenantId})`;
    }

    const msg = await prisma.tenantMessage.create({
        data: {
            tenantId: tenantDbId,
            senderId: developerUserId,
            senderRole: "DEVELOPER",
            title: title.trim(),
            message: message.trim(),
            priority
        }
    });

    await prisma.auditLog.create({
        data: {
            userId: developerUserId,
            action: "DEVELOPER_TENANT_MESSAGE_SENT",
            module: "TENANT_MANAGEMENT",
            description: `Developer sent message "${title}" to ${targetDesc}`
        }
    });

    return {
        id: msg.id,
        target: targetDesc,
        title: msg.title,
        content: msg.message,
        priority: msg.priority,
        createdAt: msg.createdAt,
        message: "Message successfully transmitted to tenant console."
    };
}

/**
 * Retrieve messages for a tenant
 */
async function getTenantMessages(tenantIdentifier) {
    const tenant = await prisma.tenant.findFirst({
        where: {
            OR: [{ id: tenantIdentifier }, { tenantId: tenantIdentifier }]
        }
    });

    if (!tenant) throw new AppError("Tenant not found", 404, "TENANT_NOT_FOUND");

    const messages = await prisma.tenantMessage.findMany({
        where: {
            OR: [
                { tenantId: tenant.id },
                { tenantId: null } // Broadcasts
            ]
        },
        orderBy: { createdAt: "desc" }
    });

    return messages;
}

/**
 * Initiate Video Call Session between Developer and Tenant Admin
 */
async function initiateVideoCall(arg1, arg2, arg3) {
    let tenantIdentifier;
    let channelName;
    let developerUserId;

    if (typeof arg1 === "object" && arg1 !== null) {
        tenantIdentifier = arg1.tenantIdentifier || arg1.tenantId;
        channelName = arg1.channelName;
        developerUserId = arg2;
    } else {
        tenantIdentifier = arg1;
        developerUserId = arg2;
        channelName = arg3;
    }

    const tenant = await prisma.tenant.findFirst({
        where: {
            OR: [{ id: tenantIdentifier }, { tenantId: tenantIdentifier }]
        }
    });

    if (!tenant) throw new AppError("Tenant not found", 404, "TENANT_NOT_FOUND");

    const channel = channelName || `call-${tenant.tenantId}-${Date.now()}`;

    const session = await prisma.videoCallSession.upsert({
        where: { channelName: channel },
        update: {
            status: "INITIATED",
            startedAt: new Date()
        },
        create: {
            channelName: channel,
            tenantId: tenant.id,
            developerUserId,
            status: "INITIATED"
        }
    });

    await prisma.auditLog.create({
        data: {
            userId: developerUserId,
            action: "DEVELOPER_VIDEO_CALL_INITIATED",
            module: "TENANT_MANAGEMENT",
            description: `Developer initiated video call channel ${channel} with tenant ${tenant.name} (${tenant.tenantId})`
        }
    });

    return {
        id: session.id,
        channelName: session.channelName,
        tenantId: tenant.tenantId,
        status: session.status,
        startedAt: session.startedAt,
        message: "Video call session initialized. WebRTC signaling ready."
    };
}

/**
 * Update Tenant Lifecycle Status (Reject, Request Verification, Activate, Suspend, Archive, Restore)
 * Strictly under Developer Authority
 */
async function updateTenantLifecycleStatus(tenantIdentifier, { action, reason }, developerUserId) {
    const tenant = await prisma.tenant.findFirst({
        where: {
            OR: [
                { id: tenantIdentifier },
                { tenantId: tenantIdentifier },
                { tenantCode: tenantIdentifier }
            ]
        }
    });

    if (!tenant) {
        throw new AppError("Tenant not found", 404, "TENANT_NOT_FOUND");
    }

    const actionMap = {
        REJECT: { status: "CANCELLED", systemLocked: true, auditAction: "TENANT_REGISTRATION_REJECTED" },
        REQUEST_VERIFICATION: { status: "VERIFICATION_REQUIRED", systemLocked: false, auditAction: "TENANT_VERIFICATION_REQUESTED" },
        ACTIVATE: { status: "ACTIVE_PAID", systemLocked: false, auditAction: "TENANT_ACCOUNT_ACTIVATED" },
        SUSPEND: { status: "SUSPENDED", systemLocked: true, auditAction: "TENANT_ACCOUNT_SUSPENDED" },
        ARCHIVE: { status: "ARCHIVED", systemLocked: true, auditAction: "TENANT_ACCOUNT_ARCHIVED" },
        RESTORE: { status: "ACTIVE_TRIAL", systemLocked: false, auditAction: "TENANT_ACCOUNT_RESTORED" }
    };

    const normalizedAction = String(action || "").toUpperCase();
    const spec = actionMap[normalizedAction];
    if (!spec) {
        throw new AppError(`Unsupported tenant lifecycle action: ${action}`, 400, "INVALID_LIFECYCLE_ACTION");
    }

    const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.tenant.update({
            where: { id: tenant.id },
            data: {
                status: spec.status,
                systemLocked: spec.systemLocked,
                lockReason: spec.systemLocked ? (reason || `Developer lifecycle action: ${normalizedAction}`) : null,
                lockedAt: spec.systemLocked ? new Date() : null
            }
        });

        await tx.auditLog.create({
            data: {
                userId: developerUserId || null,
                action: spec.auditAction,
                module: "TENANT_MANAGEMENT",
                description: `Developer executed ${normalizedAction} on tenant ${tenant.name} (${tenant.tenantId}). ${reason ? `Notes: ${reason}` : ""}`
            }
        });

        return res;
    });

    return {
        id: updated.id,
        tenantId: updated.tenantId,
        name: updated.name,
        status: updated.status,
        systemLocked: updated.systemLocked,
        lockReason: updated.lockReason,
        message: `Tenant ${updated.tenantId} status updated to ${updated.status}.`
    };
}

module.exports = {
    registerTenant,
    approveAndProvisionTenant,
    getDeveloperConsoleSummary,
    getTenants,
    getTenantById,
    lockTenant,
    unlockTenant,
    extendSubscription,
    getLiveTenantLocations,
    recordLocationPing,
    sendMessageToTenant,
    getTenantMessages,
    initiateVideoCall,
    updateTenantLifecycleStatus
};
