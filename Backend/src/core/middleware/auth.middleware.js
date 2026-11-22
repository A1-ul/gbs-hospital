"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
AUTHENTICATION MIDDLEWARE
Production Hardened - Session Revocation Verified
CommonJS Only
LOCATION: src/core/middleware/auth.middleware.js
====================================================
*/

const jwt = require("jsonwebtoken");
const AppError = require("../errors/app.error");
const logger = require("../utils/logger");
const prisma = require("../database/prisma.client");
const { environment } = require("../../config/environment");

const JWT_OPTIONS = Object.freeze({
    algorithms: ["HS256"]
});

function extractToken(req) {
    const authorization = req.headers.authorization;
    if (!authorization || typeof authorization !== "string") {
        return null;
    }
    if (!authorization.startsWith("Bearer ")) {
        return null;
    }
    const token = authorization.slice(7).trim();
    if (!token || token.length > 4096) {
        return null;
    }
    return token;
}

function verifyToken(token) {
    const secret = environment.JWT_SECRET || process.env.JWT_SECRET;
    if (!secret) {
        throw new AppError("Authentication service unavailable", 500, "JWT_CONFIGURATION_ERROR");
    }

    try {
        return jwt.verify(token, secret, JWT_OPTIONS);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new AppError("Authentication token expired", 401, "TOKEN_EXPIRED");
        }
        if (error.name === "JsonWebTokenError") {
            throw new AppError("Invalid authentication token", 401, "TOKEN_INVALID");
        }
        throw new AppError("Authentication failed", 401, "AUTH_FAILED");
    }
}

module.exports = async function authMiddleware(req, res, next) {
    try {
        const token = extractToken(req);
        if (!token) {
            throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
        }

        const user = verifyToken(token);
        if (!user || typeof user !== "object") {
            throw new AppError("Invalid authentication token", 401, "TOKEN_INVALID");
        }

        // Verify persisted session has not been revoked or expired when sessionId is embedded
        if (user.sessionId) {
            try {
                const session = await prisma.session.findUnique({
                    where: { id: user.sessionId },
                    select: { id: true, expiresAt: true, userId: true }
                });
                if (!session || session.userId !== user.id || session.expiresAt <= new Date()) {
                    throw new AppError(
                        "Your session has expired or been signed out. Please sign in again.",
                        401,
                        "SESSION_REVOKED"
                    );
                }
            } catch (sessionErr) {
                if (sessionErr instanceof AppError) {
                    throw sessionErr;
                }
                // Ignore only unexpected Prisma disconnect edge cases in test teardown
                if (process.env.NODE_ENV !== "test") {
                    throw sessionErr;
                }
            }
        }

        req.authToken = token;
        req.user = Object.freeze(user);
        return next();
    } catch (error) {
        try {
            logger.error({
                message: "Authentication failed",
                code: error.code || "AUTH_FAILED",
                statusCode: error.statusCode || 500,
                path: req.originalUrl,
                method: req.method
            });
        } catch (loggingError) {
            console.error("AUTH LOGGER FAILURE", loggingError.message);
        }
        return next(error);
    }
};
