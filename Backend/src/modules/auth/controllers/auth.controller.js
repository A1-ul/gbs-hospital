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
                        recipientRole: "ADMIN",
                        title: "New User Registration Awaiting Approval",
                        message: `${result.name || result.email} registered for role ${result.role} and is awaiting administrator approval.`,
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
            req.headers["user-agent"]
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

async function me(req, res, next) {
    try {
        const result = await service.getMe(req.user.id);

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
    me
};