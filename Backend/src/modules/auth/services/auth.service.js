"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
AUTH SERVICE - ENTERPRISE PRODUCTION HARDENED
CommonJS Only - RBAC & Audit Enabled
LOCATION: src/modules/auth/services/auth.service.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");
const { hashPassword, comparePassword } = require("../../../core/security/password");
const { generateToken } = require("../../../core/security/jwt");
const { isValidRole, normalizeRole } = require("../../../config/roles");
const AppError = require("../../../core/errors/app.error");
const logger = require("../../../core/utils/logger");

/**
 * Register a new user requesting an explicit role.
 * Compulsory role assignment; account remains inactive (pending review)
 * until approved by an authorized administrator.
 */
async function signup({ firstName, lastName, email, password, role, ipAddress }) {
    if (!firstName || !lastName || !email || !password || !role) {
        throw new AppError("All fields (firstName, lastName, email, password, role) are required", 400, "MISSING_REQUIRED_FIELDS");
    }

    const normalizedRoleName = normalizeRole(role);
    if (!isValidRole(normalizedRoleName)) {
        throw new AppError(`Invalid role requested: ${role}`, 400, "INVALID_ROLE");
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedRoleName === "DEVELOPER" && normalizedEmail !== "gabosei48@gmail.com") {
        throw new AppError("The DEVELOPER role is restricted exclusively to the platform landlord.", 403, "FORBIDDEN_DEVELOPER_ROLE");
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail }
    });

    if (existing) {
        throw new AppError("An account with this email already exists", 409, "USER_ALREADY_EXISTS");
    }

    // Lookup requested role
    const roleRecord = await prisma.role.findUnique({
        where: { name: normalizedRoleName }
    });

    if (!roleRecord) {
        throw new AppError(`Requested role not configured in database: ${normalizedRoleName}`, 400, "ROLE_NOT_CONFIGURED");
    }

    const hashedPassword = await hashPassword(password);

    // Create user in transaction with initial AuditLog
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
                action: "USER_SIGNUP_REQUESTED",
                module: "AUTH",
                description: `Signup requested with role ${roleRecord.name} (IP: ${ipAddress || 'unknown'})`,
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
        message: "Registration submitted successfully. Your account is pending administrator review and activation."
    };
}

/**
 * Authenticate user credentials and return JWT if active.
 */
async function login(email, password, ipAddress, userAgent) {
    if (!email || !password) {
        throw new AppError("Email and password are required", 400, "INVALID_CREDENTIALS");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
            role: {
                include: {
                    permissions: true
                }
            }
        }
    });

    if (!user) {
        throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
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

    const tokenPayload = {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role.name,
        permissions
    };

    const token = generateToken(tokenPayload);

    // Update lastLogin and write audit record
    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });

        await tx.auditLog.create({
            data: {
                userId: user.id,
                action: "USER_LOGIN_SUCCESS",
                module: "AUTH",
                description: `Login success for role ${user.role.name}`,
                ipAddress: ipAddress || null
            }
        });
    });

    logger.info({
        message: "User login successful",
        userId: user.id,
        role: user.role.name
    });

    return {
        token,
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
    getMe
};