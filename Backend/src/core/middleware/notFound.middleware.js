"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
404 NOT FOUND & 405 METHOD NOT ALLOWED MIDDLEWARE (EXPRESS 5 COMPATIBLE)
CommonJS Only
LOCATION: Backend/src/core/middleware/notFound.middleware.js
================================================================================
Inspects registered Express router layers when no handler matched the request:
- If the exact path exists for other HTTP method(s), sets RFC-compliant `Allow`
  header and returns HTTP 405 METHOD_NOT_ALLOWED.
- Otherwise returns HTTP 404 ROUTE_NOT_FOUND.
*/

const AppError = require("../errors/app.error");

function collectAllowedMethods(stack, remainingPath, allowedSet) {
    if (!Array.isArray(stack)) return;
    const normalizedPath = remainingPath.startsWith("/") ? remainingPath : `/${remainingPath}`;

    for (const layer of stack) {
        if (!layer || typeof layer.match !== "function") continue;

        if (layer.route && layer.route.methods) {
            // Skip catch-all non-API SPA fallback regex when inspecting API paths
            if (layer.route.path instanceof RegExp) continue;
            if (layer.match(normalizedPath)) {
                for (const [m, enabled] of Object.entries(layer.route.methods)) {
                    if (enabled && m !== "_all") {
                        allowedSet.add(m.toUpperCase());
                    }
                }
            }
        } else if (layer.handle && Array.isArray(layer.handle.stack)) {
            if (layer.match(normalizedPath)) {
                const matchedPrefix = typeof layer.path === "string" ? layer.path : "";
                const subPath =
                    matchedPrefix && normalizedPath.startsWith(matchedPrefix)
                        ? normalizedPath.slice(matchedPrefix.length) || "/"
                        : normalizedPath;
                collectAllowedMethods(layer.handle.stack, subPath, allowedSet);
            }
        }
    }
}

module.exports = function notFoundMiddleware(req, res, next) {
    const cleanPath = String(req.originalUrl || req.path || "/").split("?")[0];
    const reqMethod = String(req.method || "GET").toUpperCase();

    try {
        const rootRouter = req.app && (req.app.router || req.app._router);
        if (rootRouter && Array.isArray(rootRouter.stack) && cleanPath.startsWith("/api/")) {
            const allowedSet = new Set();
            collectAllowedMethods(rootRouter.stack, cleanPath, allowedSet);
            if (allowedSet.size > 0 && !allowedSet.has(reqMethod)) {
                const allowList = Array.from(allowedSet).sort().join(", ");
                res.setHeader("Allow", allowList);
                return next(
                    new AppError(
                        `HTTP method ${reqMethod} is not allowed on ${cleanPath}. Allowed methods: ${allowList}`,
                        405,
                        "METHOD_NOT_ALLOWED"
                    )
                );
            }
        }
    } catch (_inspectErr) {
        // Safely fall through to standard 404 if router introspection encounters an unexpected layer
    }

    return next(
        new AppError(
            "API endpoint not found",
            404,
            "ROUTE_NOT_FOUND"
        )
    );
};
