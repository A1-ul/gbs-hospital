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

        return res.status(201).json({
            success: true,
            data: result,
            requestId: req.requestId
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

        return res.status(200).json({
            success: true,
            data: result,
            requestId: req.requestId
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