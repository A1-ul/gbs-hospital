"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PERMISSION AUTHORIZATION MIDDLEWARE (UNIFIED REGISTRY)
PRODUCTION HARDENED — COMMONJS ONLY
LOCATION: Backend/src/core/security/permission.middleware.js
====================================================
*/

const AppError = require("../errors/app.error");
const logger = require("../utils/logger");
const { hasPermission, normalizePermission } = require("./permissions");

function authorizePermission(permission) {
    const canonicalPermission = normalizePermission(permission);
    if (!canonicalPermission) {
        throw new Error("Permission name is required");
    }

    return function (req, res, next) {
        try {
            if (!req.user) {
                return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
            }

            if (req.user.role === "DEVELOPER") {
                return next();
            }

            const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
            if (!hasPermission(permissions, canonicalPermission)) {
                logger.warn({
                    message: "Permission denied",
                    permission: canonicalPermission,
                    user: req.user.id || null,
                    role: req.user.role || null,
                    path: req.originalUrl
                });

                return next(
                    new AppError(
                        "Permission denied",
                        403,
                        "INSUFFICIENT_PERMISSION",
                        { required: canonicalPermission }
                    )
                );
            }

            return next();
        } catch (error) {
            logger.error({
                message: "Permission middleware failed",
                error: { message: error.message }
            });
            return next(error);
        }
    };
}

module.exports = authorizePermission;
