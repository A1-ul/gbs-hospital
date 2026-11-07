"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
USER SERVICE - ENTERPRISE PRODUCTION HARDENED
Database-backed User Registry & Role Counts
CommonJS Only
LOCATION: src/modules/users/services/user.service.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");
const AppError = require("../../../core/errors/app.error");
const logger = require("../../../core/utils/logger");

/**
 * Automatically calculates the actual number of registered users
 * for every configured role directly from the PostgreSQL database.
 * No hardcoded, fake, or sample numbers.
 */
async function getRoleUserCounts() {
    // 1. Fetch all roles defined in database
    const roles = await prisma.role.findMany({
        orderBy: { name: "asc" }
    });

    // 2. Fetch aggregated user counts per role directly from database
    const counts = await Promise.all(
        roles.map(async (role) => {
            const total = await prisma.user.count({
                where: { roleId: role.id }
            });

            const active = await prisma.user.count({
                where: { roleId: role.id, active: true }
            });

            const inactive = await prisma.user.count({
                where: { roleId: role.id, active: false }
            });

            return {
                roleId: role.id,
                roleName: role.name,
                description: role.description,
                totalUsers: total,
                activeUsers: active,
                inactiveUsers: inactive,
                status: total > 0 ? "POPULATED" : "EMPTY"
            };
        })
    );

    const totalSystemUsers = counts.reduce((acc, curr) => acc + curr.totalUsers, 0);
    const totalActiveUsers = counts.reduce((acc, curr) => acc + curr.activeUsers, 0);
    const totalPendingUsers = counts.reduce((acc, curr) => acc + curr.inactiveUsers, 0);

    return {
        summary: {
            totalSystemUsers,
            totalActiveUsers,
            totalPendingUsers,
            totalConfiguredRoles: roles.length
        },
        roles: counts
    };
}

/**
 * Fetch database-backed list of users with optional filtering
 * for administrator cross-check and verification.
 */
async function getUsers({ role, active, search, limit = 50, offset = 0 }) {
    const where = {};

    if (role) {
        where.role = { name: role.trim().toUpperCase() };
    }

    if (active !== undefined && active !== null && active !== "") {
        where.active = active === "true" || active === true;
    }

    if (search) {
        const query = search.trim();
        where.OR = [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } }
        ];
    }

    const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                active: true,
                lastLogin: true,
                createdAt: true,
                role: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            take: Number(limit),
            skip: Number(offset)
        }),
        prisma.user.count({ where })
    ]);

    return {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
        users: users.map((u) => ({
            id: u.id,
            name: `${u.firstName} ${u.lastName}`,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            role: u.role.name,
            roleId: u.role.id,
            active: u.active,
            status: u.active ? "ACTIVE" : "PENDING_APPROVAL",
            lastLogin: u.lastLogin,
            createdAt: u.createdAt
        }))
    };
}

/**
 * Approve a pending user account.
 */
async function approveUser(userId, adminUserId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
    });

    if (!user) {
        throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (user.active === true) {
        return {
            id: user.id,
            email: user.email,
            active: true,
            message: "User account is already active"
        };
    }

    const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.user.update({
            where: { id: userId },
            data: { active: true },
            include: { role: true }
        });

        await tx.auditLog.create({
            data: {
                userId: adminUserId,
                action: "USER_ACCOUNT_APPROVED",
                module: "USER_MANAGEMENT",
                description: `Approved account ${user.email} with role ${user.role.name}`
            }
        });

        return res;
    });

    logger.info({
        message: "User account approved by administrator",
        approvedUserId: userId,
        adminUserId
    });

    return {
        id: updated.id,
        email: updated.email,
        name: `${updated.firstName} ${updated.lastName}`,
        role: updated.role.name,
        active: updated.active,
        status: "ACTIVE",
        message: "Account approved and activated successfully"
    };
}

/**
 * Toggle user active/inactive status.
 */
async function setUserStatus(userId, active, adminUserId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
    });

    if (!user) {
        throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.user.update({
            where: { id: userId },
            data: { active: Boolean(active) },
            include: { role: true }
        });

        await tx.auditLog.create({
            data: {
                userId: adminUserId,
                action: active ? "USER_ACCOUNT_ACTIVATED" : "USER_ACCOUNT_DEACTIVATED",
                module: "USER_MANAGEMENT",
                description: `Set active=${Boolean(active)} for account ${user.email} (Role: ${user.role.name})`
            }
        });

        return res;
    });

    return {
        id: updated.id,
        email: updated.email,
        active: updated.active,
        status: updated.active ? "ACTIVE" : "INACTIVE"
    };
}

module.exports = {
    getRoleUserCounts,
    getUsers,
    approveUser,
    setUserStatus
};
