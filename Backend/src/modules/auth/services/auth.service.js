"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
AUTH SERVICE - ENTERPRISE PRODUCTION HARDENED
CommonJS Only - RBAC, Session Persistence, Password Reset,
Developer MFA/Device Security & Audit Enabled
LOCATION: src/modules/auth/services/auth.service.js
====================================================
*/

const crypto = require("crypto");
const prisma = require("../../../core/database/prisma.client");
const { hashPassword, comparePassword } = require("../../../core/security/password");
const { generateToken } = require("../../../core/security/jwt");
const { isValidRole, normalizeRole } = require("../../../config/roles");
const { environment } = require("../../../config/environment");
const AppError = require("../../../core/errors/app.error");
const logger = require("../../../core/utils/logger");

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MFA_CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function sha256(value) {
    return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

function getRootDeveloperEmail() {
    return (process.env.DEVELOPER_ROOT_EMAIL || environment.DEVELOPER_ROOT_EMAIL || "gabosei48@gmail.com")
        .trim()
        .toLowerCase();
}

function getRootDeveloperEnvPassword() {
    return String(process.env.DEVELOPER_ROOT_PASSWORD || environment.DEVELOPER_ROOT_PASSWORD || "").trim();
}

/**
 * Register a new user requesting an explicit role.
 * Compulsory role assignment; account remains inactive (pending review)
 * until approved by an authorized administrator.
 */
async function signup({ firstName, lastName, email, password, role, ipAddress }) {
    if (!firstName || !lastName || !email || !password || !role) {
        throw new AppError(
            "All fields (firstName, lastName, email, password, role) are required",
            400,
            "MISSING_REQUIRED_FIELDS"
        );
    }

    if (String(password).length < 8) {
        throw new AppError("Password must be at least 8 characters long", 400, "WEAK_PASSWORD");
    }

    const normalizedRoleName = normalizeRole(role);
    if (!isValidRole(normalizedRoleName)) {
        throw new AppError(`Invalid role requested: ${role}`, 400, "INVALID_ROLE");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const rootDevEmail = getRootDeveloperEmail();

    if (normalizedRoleName === "DEVELOPER" && normalizedEmail !== rootDevEmail) {
        throw new AppError(
            "The DEVELOPER role is restricted exclusively to the platform landlord.",
            403,
            "FORBIDDEN_DEVELOPER_ROLE"
        );
    }

    const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail }
    });

    if (existing) {
        throw new AppError("An account with this email already exists", 409, "USER_ALREADY_EXISTS");
    }

    const roleRecord = await prisma.role.findUnique({
        where: { name: normalizedRoleName }
    });

    if (!roleRecord) {
        throw new AppError(
            `Requested role not configured in database: ${normalizedRoleName}`,
            400,
            "ROLE_NOT_CONFIGURED"
        );
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                roleId: roleRecord.id,
                active: false // Compulsory admin approval required
            },
            include: {
                role: true
            }
        });

        await tx.auditLog.create({
            data: {
                userId: user.id,
                role: roleRecord.name,
                action: "USER_SIGNUP_REQUESTED",
                module: "AUTH",
                description: `Signup requested with role ${roleRecord.name} (IP: ${ipAddress || "unknown"})`,
                ipAddress: ipAddress || null
            }
        });

        return user;
    });

    logger.info({
        message: "New user registration submitted",
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role.name,
        active: newUser.active
    });

    return {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role.name,
        active: newUser.active,
        status: "PENDING_APPROVAL",
        message:
            "Registration submitted successfully. Your account is pending administrator review and activation."
    };
}

/**
 * Authenticate user credentials, persist real DB Session, and return JWT if active.
 */
async function login(email, password, ipAddress, userAgent, deviceFingerprint = null) {
    if (!email || !password) {
        throw new AppError("Email and password are required", 400, "INVALID_CREDENTIALS");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = String(password).trim();

    let user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
            role: {
                include: {
                    permissions: true
                }
            }
        }
    });

    // Environment-driven Root Developer auto-bootstrap safeguard (ZERO hardcoded passwords in source)
    const rootDevEmail = getRootDeveloperEmail();
    const rootDevEnvPassword = getRootDeveloperEnvPassword();
    if (
        normalizedEmail === rootDevEmail &&
        rootDevEnvPassword &&
        trimmedPassword === rootDevEnvPassword &&
        !user
    ) {
        let devRole = await prisma.role.findUnique({
            where: { name: "DEVELOPER" },
            include: { permissions: true }
        });
        if (!devRole) {
            devRole = await prisma.role.create({
                data: {
                    name: "DEVELOPER",
                    description: "Root Developer & Landlord Control Center"
                },
                include: { permissions: true }
            });
        }
        const hashedDevPassword = await hashPassword(rootDevEnvPassword);
        user = await prisma.user.create({
            data: {
                firstName: "Gabriel",
                lastName: "Osei",
                email: normalizedEmail,
                password: hashedDevPassword,
                roleId: devRole.id,
                active: true
            },
            include: {
                role: {
                    include: {
                        permissions: true
                    }
                }
            }
        });
    }

    if (!user) {
        throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const valid = await comparePassword(trimmedPassword, user.password);
    if (!valid) {
        try {
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    role: user.role?.name || null,
                    action: "USER_LOGIN_FAILED",
                    module: "AUTH",
                    outcome: "DENIED",
                    description: `Failed login attempt for ${user.email}`,
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null
                }
            });
        } catch (_e) {}
        throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    if (user.active === false) {
        throw new AppError(
            "Your account is pending administrator review and activation. Please contact your hospital administrator.",
            403,
            "ACCOUNT_PENDING_APPROVAL"
        );
    }

    const permissions = user.role.permissions.map((p) => p.name);
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const tokenPayload = {
        id: user.id,
        sessionId,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role.name,
        permissions
    };

    const token = generateToken(tokenPayload);
    const tokenDigest = sha256(token);

    await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
    });

    await prisma.session.create({
        data: {
            id: sessionId,
            userId: user.id,
            token: tokenDigest,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            expiresAt
        }
    });

    try {
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                role: user.role.name,
                action: user.role.name === "DEVELOPER" ? "DEVELOPER_LOGIN_VERIFIED" : "USER_LOGIN_SUCCESS",
                module: user.role.name === "DEVELOPER" ? "DEVELOPER_SECURITY" : "AUTH",
                outcome: "SUCCESS",
                description:
                    user.role.name === "DEVELOPER"
                        ? `Developer session ${sessionId} authenticated (Device: ${deviceFingerprint || "standard-browser"}, IP: ${ipAddress || "unknown"})`
                        : `Login success for role ${user.role.name}`,
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
                metadata: {
                    sessionId,
                    deviceFingerprint: deviceFingerprint || null,
                    securityEvent: user.role.name === "DEVELOPER" ? "DEVELOPER_SESSION_OPENED" : "USER_SESSION_OPENED"
                }
            }
        });
    } catch (_auditErr) {}

    logger.info({
        message: "User login successful",
        userId: user.id,
        role: user.role.name
    });

    return {
        token,
        sessionId,
        expiresAt,
        user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role.name,
            permissions
        }
    };
}

/**
 * Revoke current session (Sign Out) in PostgreSQL.
 */
async function logout({ userId, sessionId, ipAddress, userAgent }) {
    if (sessionId) {
        await prisma.session.deleteMany({
            where: { id: sessionId, userId }
        });
    }

    await prisma.auditLog.create({
        data: {
            userId,
            action: "USER_LOGOUT",
            module: "AUTH",
            outcome: "SUCCESS",
            description: `User signed out cleanly (Session: ${sessionId || "stateless"})`,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null
        }
    });

    return {
        signedOut: true,
        sessionId: sessionId || null,
        message: "You have been signed out securely."
    };
}

/**
 * List active sessions for the authenticated user.
 */
async function listSessions(userId) {
    const sessions = await prisma.session.findMany({
        where: {
            userId,
            expiresAt: { gt: new Date() }
        },
        select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            expiresAt: true,
            createdAt: true
        },
        orderBy: { createdAt: "desc" }
    });
    return { totalActiveSessions: sessions.length, sessions };
}

/**
 * Revoke a specific session owned by the user (or any session by Admin/Developer).
 */
async function revokeSession({ sessionId, actor }) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
        throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
    }

    const isOwner = session.userId === actor.id;
    const isAdminOrDev = ["DEVELOPER", "ADMINISTRATOR", "HOSPITAL_DIRECTOR"].includes(actor.role);
    if (!isOwner && !isAdminOrDev) {
        throw new AppError("You do not have permission to revoke this session.", 403, "FORBIDDEN_PERMISSION");
    }

    await prisma.session.delete({ where: { id: sessionId } });

    await prisma.auditLog.create({
        data: {
            userId: actor.id,
            role: actor.role,
            action: "USER_SESSION_REVOKED",
            module: "AUTH",
            outcome: "SUCCESS",
            affectedRecord: sessionId,
            description: `Revoked session ${sessionId} for user ${session.userId}`
        }
    });

    return { revoked: true, sessionId };
}

/**
 * Initiate Password Reset (Forgot Password).
 * Stores single-use SHA-256 token hash in PostgreSQL SystemConfiguration (15-min TTL).
 * Truthfully discloses SMTP delivery status without faking outbound email.
 */
async function requestPasswordReset({ email, ipAddress }) {
    if (!email) {
        throw new AppError("Email address is required", 400, "MISSING_EMAIL");
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { role: true }
    });

    const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

    if (!user) {
        return {
            accepted: true,
            emailDeliveryStatus: smtpConfigured ? "QUEUED" : "SMTP_NOT_CONFIGURED",
            message:
                "If an account exists for that email, password reset instructions have been processed."
        };
    }

    const rawResetCode = crypto.randomBytes(4).toString("hex").toUpperCase(); // 8-char secure recovery token
    const tokenHash = sha256(rawResetCode);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
    const configKey = `PWD_RESET_${user.id}`;

    await prisma.systemConfiguration.upsert({
        where: { configKey },
        update: {
            category: "AUTH_RECOVERY",
            configValue: {
                userId: user.id,
                email: user.email,
                tokenHash,
                expiresAt,
                used: false,
                requestedIp: ipAddress || null
            },
            updatedById: user.id,
            updatedByRole: user.role?.name || null
        },
        create: {
            configKey,
            category: "AUTH_RECOVERY",
            description: `Password reset token for ${user.email}`,
            configValue: {
                userId: user.id,
                email: user.email,
                tokenHash,
                expiresAt,
                used: false,
                requestedIp: ipAddress || null
            },
            updatedById: user.id,
            updatedByRole: user.role?.name || null
        }
    });

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role?.name || null,
            action: "PASSWORD_RESET_REQUESTED",
            module: "AUTH",
            outcome: "SUCCESS",
            ipAddress: ipAddress || null,
            description: `Password reset requested for ${user.email} (SMTP configured: ${smtpConfigured})`
        }
    });

    return {
        accepted: true,
        emailDeliveryStatus: smtpConfigured ? "SMTP_CONFIGURED_READY" : "SMTP_NOT_CONFIGURED",
        expiresAt,
        // Only surface dev/test verification code in non-production environments; never in production!
        ...(environment.IS_PRODUCTION ? {} : { devVerificationToken: rawResetCode }),
        message: smtpConfigured
            ? "Password reset code generated and queued for email delivery."
            : "Password reset request recorded in PostgreSQL. Outbound SMTP email delivery is not configured on this server; contact your Hospital Administrator to complete recovery."
    };
}

/**
 * Complete Password Reset using single-use recovery code and revoke all existing sessions.
 */
async function resetPassword({ email, resetToken, newPassword, ipAddress }) {
    if (!email || !resetToken || !newPassword) {
        throw new AppError(
            "Email, reset token, and new password are required",
            400,
            "MISSING_REQUIRED_FIELDS"
        );
    }

    if (String(newPassword).length < 8) {
        throw new AppError("New password must be at least 8 characters long", 400, "WEAK_PASSWORD");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { role: true }
    });

    if (!user) {
        throw new AppError("Invalid or expired password reset token", 400, "INVALID_RESET_TOKEN");
    }

    const configKey = `PWD_RESET_${user.id}`;
    const record = await prisma.systemConfiguration.findUnique({ where: { configKey } });
    const val = record?.configValue || null;

    if (
        !val ||
        val.used === true ||
        !val.expiresAt ||
        new Date(val.expiresAt) <= new Date() ||
        val.tokenHash !== sha256(String(resetToken).trim().toUpperCase())
    ) {
        throw new AppError("Invalid or expired password reset token", 400, "INVALID_RESET_TOKEN");
    }

    const hashedPassword = await hashPassword(String(newPassword));

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        await tx.session.deleteMany({ where: { userId: user.id } });

        await tx.systemConfiguration.update({
            where: { configKey },
            data: {
                configValue: {
                    ...val,
                    used: true,
                    usedAt: new Date().toISOString()
                },
                updatedById: user.id,
                updatedByRole: user.role?.name || null
            }
        });

        await tx.auditLog.create({
            data: {
                userId: user.id,
                role: user.role?.name || null,
                action: "PASSWORD_RESET_COMPLETED",
                module: "AUTH",
                outcome: "SUCCESS",
                ipAddress: ipAddress || null,
                description: `Password reset completed and all prior sessions revoked for ${user.email}`
            }
        });
    });

    return {
        reset: true,
        message: "Password updated successfully. Please sign in with your new password."
    };
}

/**
 * Developer MFA & Device Verification Challenge (Permanent Developer Security Standard).
 */
async function requestDeveloperMfaChallenge({ actor, deviceFingerprint, ipAddress, userAgent }) {
    if (!actor || actor.role !== "DEVELOPER") {
        throw new AppError("Developer authority required", 403, "FORBIDDEN_DEVELOPER_ONLY");
    }

    const mfaCode = String(crypto.randomInt(100000, 999999));
    const challengeId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + MFA_CHALLENGE_TTL_MS).toISOString();
    const configKey = `DEV_MFA_${actor.id}`;

    await prisma.systemConfiguration.upsert({
        where: { configKey },
        update: {
            category: "DEVELOPER_MFA",
            configValue: {
                challengeId,
                codeHash: sha256(mfaCode),
                deviceFingerprint: deviceFingerprint || "unknown-device",
                expiresAt,
                verified: false,
                ipAddress: ipAddress || null
            },
            updatedById: actor.id,
            updatedByRole: actor.role || "DEVELOPER"
        },
        create: {
            configKey,
            category: "DEVELOPER_MFA",
            description: `Developer MFA challenge for ${actor.email}`,
            configValue: {
                challengeId,
                codeHash: sha256(mfaCode),
                deviceFingerprint: deviceFingerprint || "unknown-device",
                expiresAt,
                verified: false,
                ipAddress: ipAddress || null
            },
            updatedById: actor.id,
            updatedByRole: actor.role || "DEVELOPER"
        }
    });

    await prisma.auditLog.create({
        data: {
            userId: actor.id,
            role: actor.role,
            action: "DEVELOPER_MFA_CHALLENGE_ISSUED",
            module: "DEVELOPER_SECURITY",
            outcome: "SUCCESS",
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            description: `Developer MFA challenge issued (${challengeId}) for device ${deviceFingerprint || "unknown-device"}`
        }
    });

    const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    return {
        challengeId,
        expiresAt,
        deliveryStatus: smtpConfigured ? "EMAIL_DISPATCH_READY" : "AUTHENTICATOR_VERIFICATION_READY",
        ...(environment.IS_PRODUCTION ? {} : { devMfaCode: mfaCode })
    };
}

async function verifyDeveloperMfaChallenge({ actor, code, deviceFingerprint, ipAddress, userAgent }) {
    if (!actor || actor.role !== "DEVELOPER") {
        throw new AppError("Developer authority required", 403, "FORBIDDEN_DEVELOPER_ONLY");
    }

    const configKey = `DEV_MFA_${actor.id}`;
    const record = await prisma.systemConfiguration.findUnique({ where: { configKey } });
    const val = record?.configValue || null;

    if (
        !val ||
        val.verified === true ||
        !val.expiresAt ||
        new Date(val.expiresAt) <= new Date() ||
        val.codeHash !== sha256(String(code || "").trim())
    ) {
        await prisma.auditLog.create({
            data: {
                userId: actor.id,
                role: actor.role,
                action: "DEVELOPER_MFA_VERIFICATION_FAILED",
                module: "DEVELOPER_SECURITY",
                outcome: "DENIED",
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
                description: `Invalid or expired Developer MFA verification attempt`
            }
        });
        throw new AppError("Invalid or expired MFA verification code", 401, "INVALID_MFA_CODE");
    }

    await prisma.systemConfiguration.update({
        where: { configKey },
        data: {
            configValue: {
                ...val,
                verified: true,
                verifiedAt: new Date().toISOString(),
                deviceFingerprint: deviceFingerprint || val.deviceFingerprint
            },
            updatedById: actor.id,
            updatedByRole: actor.role || "DEVELOPER"
        }
    });

    await prisma.auditLog.create({
        data: {
            userId: actor.id,
            role: actor.role,
            action: "DEVELOPER_MFA_DEVICE_VERIFIED",
            module: "DEVELOPER_SECURITY",
            outcome: "SUCCESS",
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            description: `Developer MFA and device (${deviceFingerprint || val.deviceFingerprint}) verified cleanly.`
        }
    });

    return {
        mfaVerified: true,
        deviceVerified: true,
        deviceFingerprint: deviceFingerprint || val.deviceFingerprint,
        verifiedAt: new Date().toISOString()
    };
}

/**
 * Supervised Non-Developer Training Demo Session (strictly gated by DEMO_MODE_ENABLED=true).
 * NEVER issues a DEVELOPER session and NEVER exposes passwords to the frontend.
 */
async function startDemoSession({ role, ipAddress, userAgent }) {
    const demoAllowed =
        process.env.DEMO_MODE_ENABLED !== undefined
            ? String(process.env.DEMO_MODE_ENABLED).toLowerCase() === "true"
            : environment.DEMO_MODE_ENABLED;

    if (!demoAllowed) {
        throw new AppError(
            "Training demo sessions are disabled in this production environment. Please sign in with your verified credentials.",
            403,
            "DEMO_MODE_DISABLED"
        );
    }

    const normalizedRole = normalizeRole(role);
    if (!normalizedRole || !isValidRole(normalizedRole)) {
        throw new AppError("Invalid hospital role specified for training session.", 400, "INVALID_ROLE");
    }

    if (normalizedRole === "DEVELOPER") {
        throw new AppError(
            "Developer Control Center cannot be accessed via demo sessions. Permanent credentials and MFA are mandatory.",
            403,
            "FORBIDDEN_DEVELOPER_DEMO"
        );
    }

    const user = await prisma.user.findFirst({
        where: {
            active: true,
            role: { name: normalizedRole }
        },
        include: {
            role: {
                include: {
                    permissions: true
                }
            }
        },
        orderBy: { createdAt: "asc" }
    });

    if (!user) {
        throw new AppError(
            `No active training account is configured for role ${normalizedRole}.`,
            404,
            "DEMO_ACCOUNT_NOT_AVAILABLE"
        );
    }

    const permissions = user.role.permissions.map((p) => p.name);
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4-hour training session

    const token = generateToken({
        id: user.id,
        sessionId,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role.name,
        permissions,
        isDemoSession: true
    });

    await prisma.$transaction(async (tx) => {
        await tx.session.create({
            data: {
                id: sessionId,
                userId: user.id,
                token: sha256(token),
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
                expiresAt
            }
        });

        await tx.auditLog.create({
            data: {
                userId: user.id,
                role: user.role.name,
                action: "DEMO_TRAINING_SESSION_STARTED",
                module: "AUTH",
                outcome: "SUCCESS",
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
                description: `Supervised training demo session started for role ${user.role.name}`
            }
        });
    });

    return {
        token,
        sessionId,
        isDemoSession: true,
        expiresAt,
        user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role.name,
            permissions,
            isDemoSession: true
        }
    };
}

/**
 * Retrieve authenticated user profile from database.
 */
async function getMe(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            role: {
                include: {
                    permissions: true
                }
            }
        }
    });

    if (!user) {
        throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role.name,
        active: user.active,
        permissions: user.role.permissions.map((p) => p.name),
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
    };
}

module.exports = {
    signup,
    login,
    logout,
    listSessions,
    revokeSession,
    requestPasswordReset,
    resetPassword,
    requestDeveloperMfaChallenge,
    verifyDeveloperMfaChallenge,
    startDemoSession,
    getMe
};
