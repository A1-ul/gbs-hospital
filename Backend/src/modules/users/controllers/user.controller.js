"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
USER CONTROLLER - ENTERPRISE PRODUCTION HARDENED
CommonJS Only
LOCATION: src/modules/users/controllers/user.controller.js
====================================================
*/

const service = require("../services/user.service");
const membershipCardService = require("../../patients/services/membership-card.service");
const AppError = require("../../../core/errors/app.error");
const { rcce } = require("../../../core/gbs-rcce.bootstrap");

/**
 * Returns actual registered user counts per role directly from the DB.
 * Triggered on demand when administrator clicks dropdown.
 */
async function getRoleUserCounts(req, res, next) {
    try {
        const result = await service.getRoleUserCounts();

        return res.status(200).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Returns database-backed list of users for administrator cross-check.
 */
async function getUsers(req, res, next) {
    try {
        const { role, active, search, limit, offset, includePrivate } = req.query;

        let applyDeveloperRedaction = false;
        if (req.user && req.user.role === "DEVELOPER") {
            if (includePrivate === "true") {
                const access = await rcce.control.authorizeSensitiveAccess({
                    actor: req.user,
                    scope: rcce.CONSTANTS.SENSITIVE_SCOPES.USER_PII_READ,
                    affectedRecord: "USERS_DIRECTORY_UNMASKED",
                    requestId: req.requestId,
                    ipAddress: req.ip
                });
                if (!access.allowed) {
                    throw new AppError(access.message, access.httpStatus, access.code);
                }
            } else {
                applyDeveloperRedaction = true;
            }
        }

        const result = await service.getUsers({
            role,
            active,
            search,
            limit,
            offset
        });

        if (applyDeveloperRedaction && result && Array.isArray(result.users)) {
            result.users = result.users.map((u) => rcce.helpers.redactPrivateUserFields(u));
            res.setHeader("X-GBS-Privacy-Redacted", "true");
        }

        return res.rcceSuccess("SUCCESS", result, {
            httpStatus: 200
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Approve a pending user account.
 */
async function approveUser(req, res, next) {
    try {
        const { id } = req.params;
        const adminUserId = req.user.id;

        const result = await service.approveUser(id, adminUserId);

        try {
            await rcce.events.publish({
                eventCode: "USER_APPROVED",
                domain: "USERS",
                actorUserId: adminUserId,
                actorRole: req.user.role,
                affectedRecord: result.id || id,
                severity: "INFO",
                requestId: req.requestId,
                notifications: [
                    {
                        recipientUserId: result.id || id,
                        title: "Account Approved",
                        message: "Your hospital system account has been approved and activated.",
                        severity: "SUCCESS",
                        affectedRecord: result.id || id
                    }
                ]
            });
        } catch (_pubErr) {}

        return res.rcceSuccess("REQUEST_APPROVED", result, {
            httpStatus: 200
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update user active/inactive status.
 */
async function setUserStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { active } = req.body;
        const adminUserId = req.user.id;

        const result = await service.setUserStatus(id, active, adminUserId);

        if (active === false) {
            rcce.events.publish({
                eventCode: "ACCOUNT_SUSPENDED",
                domain: "USERS",
                actorUserId: adminUserId,
                actorRole: req.user.role,
                affectedRecord: id,
                severity: "WARNING",
                requestId: req.requestId,
                asyncDelivery: true,
                notifications: [
                    {
                        recipientUserId: id,
                        recipientRole: "ADMIN",
                        title: "User Account Suspended",
                        message: `Account ${id} has been deactivated by administrator.`,
                        severity: "WARNING",
                        affectedRecord: id
                    }
                ]
            }).catch(() => {});
        }

        return res.rcceSuccess("RECORD_UPDATED", result, {
            httpStatus: 200
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Generate Official Hospital Membership ID Card for an Accepted/Active Hospital Member
 * GET /api/v1/users/:id/membership-card
 */
async function getUserMembershipCard(req, res, next) {
    try {
        const card = await membershipCardService.generateUserMembershipCard(
            req.params.id,
            req.user,
            req.requestId
        );
        return res.rcceSuccess("MEMBERSHIP_CARD_GENERATED", card, {
            httpStatus: 200,
            message: `Official Hospital Membership ID Card ${card.cardSerial} generated for ${card.member.fullName}.`
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getRoleUserCounts,
    getUsers,
    approveUser,
    setUserStatus,
    getUserMembershipCard
};
