"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
AUTH CONTROLLER - ENTERPRISE PRODUCTION HARDENED
CommonJS Only
LOCATION: src/modules/auth/controllers/auth.controller.js
====================================================
*/

const service = require("../services/auth.service");
const logger = require("../../../core/utils/logger");
const { rcce } = require("../../../core/gbs-rcce.bootstrap");

async function signup(req, res, next) {
    try {
        const { firstName, lastName, email, password, role } = req.body;

        const result = await service.signup({
            firstName,
            lastName,
            email,
            password,
            role,
            ipAddress: req.ip || req.connection?.remoteAddress
        });

        try {
            await rcce.events.publish({
                eventCode: "USER_REGISTERED",
                domain: "AUTH",
                actorUserId: result.id,
                actorRole: result.role,
                affectedRecord: result.id,
                severity: "INFO",
                requestId: req.requestId,
                notifications: [
                    {
                        recipientRole: "ADMINISTRATOR",
                        title: "New User Registration Awaiting Approval",
                        message: `${result.firstName} ${result.lastName} (${result.email}) registered for role ${result.role} and is awaiting administrator approval.`,
                        severity: "INFO",
                        affectedRecord: result.id
                    }
                ]
            });
        } catch (_pubErr) {
            // Non-blocking notification failure
        }

        return res.rcceSuccess("PENDING_APPROVAL", result, {
            httpStatus: 201,
            message: "Your request has been submitted and is awaiting approval."
        });
    } catch (error) {
        logger.warn({
            message: "User signup failed",
            email: req.body?.email,
            role: req.body?.role,
            error: error.message,
            requestId: req.requestId
        });
        next(error);
    }
}

async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        const result = await service.login(
            email,
            password,
            req.ip || req.connection?.remoteAddress,
            req.headers["user-agent"],
            req.headers["x-device-fingerprint"] || req.body?.deviceFingerprint || null
        );

        return res.rcceSuccess("SUCCESS", result, {
            httpStatus: 200,
            message: "Authentication completed successfully."
        });
    } catch (error) {
        logger.warn({
            message: "User login failed",
            email: req.body?.email,
            error: error.message,
            requestId: req.requestId
        });
        next(error);
    }
}

async function logout(req, res, next) {
    try {
        const result = await service.logout({
            userId: req.user.id,
            sessionId: req.user.sessionId || null,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers["user-agent"]
        });
        return res.rcceSuccess("SUCCESS", result, {
            httpStatus: 200,
            message: result.message
        });
    } catch (error) {
        next(error);
    }
}

async function listSessions(req, res, next) {
    try {
        const result = await service.listSessions(req.user.id);
        return res.rcceSuccess("SUCCESS", result, { httpStatus: 200 });
    } catch (error) {
        next(error);
    }
}

async function revokeSession(req, res, next) {
    try {
        const result = await service.revokeSession({
            sessionId: req.params.sessionId,
            actor: req.user
        });
        return res.rcceSuccess("RECORD_UPDATED", result, { httpStatus: 200 });
    } catch (error) {
        next(error);
    }
}

async function forgotPassword(req, res, next) {
    try {
        const result = await service.requestPasswordReset({
            email: req.body?.email,
            ipAddress: req.ip || req.connection?.remoteAddress
        });
        return res.rcceSuccess("SUCCESS", result, {
            httpStatus: 200,
            message: result.message
        });
    } catch (error) {
        next(error);
    }
}

async function resetPassword(req, res, next) {
    try {
        const result = await service.resetPassword({
            email: req.body?.email,
            resetToken: req.body?.resetToken || req.body?.token,
            newPassword: req.body?.newPassword || req.body?.password,
            ipAddress: req.ip || req.connection?.remoteAddress
        });
        return res.rcceSuccess("RECORD_UPDATED", result, {
            httpStatus: 200,
            message: result.message
        });
    } catch (error) {
        next(error);
    }
}

async function developerMfaChallenge(req, res, next) {
    try {
        const result = await service.requestDeveloperMfaChallenge({
            actor: req.user,
            deviceFingerprint: req.headers["x-device-fingerprint"] || req.body?.deviceFingerprint,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers["user-agent"]
        });
        return res.rcceSuccess("SUCCESS", result, {
            httpStatus: 200,
            message: "Developer MFA verification challenge generated."
        });
    } catch (error) {
        next(error);
    }
}

async function developerMfaVerify(req, res, next) {
    try {
        const result = await service.verifyDeveloperMfaChallenge({
            actor: req.user,
            code: req.body?.code || req.headers["x-developer-mfa-code"],
            deviceFingerprint: req.headers["x-device-fingerprint"] || req.body?.deviceFingerprint,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers["user-agent"]
        });
        return res.rcceSuccess("SUCCESS", result, {
            httpStatus: 200,
            message: "Developer MFA and device verification completed."
        });
    } catch (error) {
        next(error);
    }
}

async function startDemoSession(req, res, next) {
    try {
        const result = await service.startDemoSession({
            role: req.body?.role,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers["user-agent"]
        });
        return res.rcceSuccess("SUCCESS", result, {
            httpStatus: 200,
            message: `Supervised training demo session ready for ${result.user.role}.`
        });
    } catch (error) {
        next(error);
    }
}

async function demoQuota(req, res, next) {
    try {
        const result = await service.getDemoQuota(req.user);
        return res.rcceSuccess("SUCCESS", result, {
            httpStatus: 200,
            message: result.isDemoSession
                ? `Demo trial quota: ${result.entriesUsed}/${result.maxEntries} entries used.`
                : "Unlimited production account active."
        });
    } catch (error) {
        next(error);
    }
}

async function me(req, res, next) {
    try {
        const result = await service.getMe(req.user.id, req.user);
        return res.status(200).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    signup,
    login,
    logout,
    listSessions,
    revokeSession,
    forgotPassword,
    resetPassword,
    developerMfaChallenge,
    developerMfaVerify,
    startDemoSession,
    demoQuota,
    me
};
