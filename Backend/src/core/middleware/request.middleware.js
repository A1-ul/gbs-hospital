"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
REQUEST TRACKING MIDDLEWARE
Production Hardened • CommonJS Only
LOCATION: Backend/src/core/middleware/request.middleware.js
====================================================
*/

const logger = require("../utils/logger");
const metricsService = require("../monitoring/metrics.service");

let uuidGenerator;

try {
    const uuid = require("uuid");
    uuidGenerator = uuid.v4;
} catch (_error) {
    uuidGenerator = function fallbackUuid() {
        return (
            Date.now().toString(36) +
            Math.random().toString(36).substring(2)
        );
    };
}

module.exports = function requestMiddleware(app) {
    if (!app || typeof app.use !== "function") {
        throw new Error("Express application instance required");
    }

    app.use(function requestTrackingHandler(req, res, next) {
        const start = Date.now();

        try {
            // Preserve existing requestId from app.js so Morgan, Winston, RCCE, and AuditLog share one unified ID
            if (!req.requestId || typeof req.requestId !== "string") {
                req.requestId = uuidGenerator();
            }

            if (!req.requestTime) {
                req.requestTime = new Date().toISOString();
            }

            if (!res.headersSent) {
                res.setHeader("X-Request-ID", req.requestId);
            }

            res.on("finish", function onResponseFinish() {
                const duration = Date.now() - start;

                try {
                    metricsService.increment("http.requests_total", 1);
                    metricsService.observe("http.response_time_ms", duration);
                    if (res.statusCode >= 500) {
                        metricsService.increment("http.requests_failed_5xx", 1);
                    } else if (res.statusCode >= 400) {
                        metricsService.increment("http.requests_failed_4xx", 1);
                    }
                } catch (_mErr) {
                    // Never interrupt response completion on metric recording failure
                }

                logger.info({
                    message: "HTTP Request Completed",
                    requestId: req.requestId,
                    method: req.method,
                    url: req.originalUrl,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`
                });
            });

            next();
        } catch (error) {
            logger.error({
                message: "Request middleware failure",
                requestId: req.requestId || null,
                error: {
                    message: error.message
                }
            });

            next(error);
        }
    });
};
