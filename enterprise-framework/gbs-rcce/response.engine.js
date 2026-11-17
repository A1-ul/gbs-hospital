"use strict";

/*
================================================================================
GBS CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE (GBS-RCCE)
MODULE: Central System Response Engine
LOCATION: enterprise-framework/gbs-rcce/response.engine.js
================================================================================
Guarantees one standardized response contract across all APIs:
  {
    success: boolean,
    code: string,
    message: string,
    data: any,
    errors: Array|null,
    timestamp: string,
    requestId: string
  }
Preserves auxiliary domain keys (e.g. pagination, count, error) cleanly without
breaking legacy consumers, while strictly preventing success=true on failures.
================================================================================
*/

function createResponseEngine({ catalogue }) {
    function buildEnvelope(options = {}) {
        const {
            success: rawSuccess = true,
            code: rawCode = null,
            message: rawMessage = null,
            data = null,
            errors = null,
            httpStatus = rawSuccess ? 200 : 500,
            requestId = null,
            timestamp = new Date().toISOString(),
            extra = {}
        } = options;

        // Hard safety rule: NEVER report success=true when status >= 400
        const success = Boolean(rawSuccess) && Number(httpStatus) < 400;
        const resolvedDef = catalogue.get(rawCode, httpStatus, success);
        const code = rawCode || resolvedDef.code;
        const message = rawMessage && String(rawMessage).trim()
            ? String(rawMessage).trim()
            : resolvedDef.message;

        const normalizedErrors = Array.isArray(errors)
            ? errors
            : errors && typeof errors === "object"
                ? [errors]
                : [];

        const envelope = {
            success,
            code,
            message,
            data: success ? (data === undefined ? null : data) : (data === undefined ? null : data),
            errors: success ? [] : normalizedErrors,
            timestamp,
            requestId: requestId || null
        };

        if (!success && !extra.error) {
            envelope.error = {
                code,
                message,
                requestId: requestId || null
            };
        }

        // Preserve non-conflicting metadata (e.g., pagination, count, totals)
        if (extra && typeof extra === "object") {
            for (const [k, v] of Object.entries(extra)) {
                if (v !== undefined && !(k in envelope)) {
                    envelope[k] = v;
                } else if (k === "error" && v !== undefined && !success) {
                    envelope.error = v;
                }
            }
        }

        return envelope;
    }

    function expressMiddleware() {
        return function gbsRcceResponseMiddleware(req, res, next) {
            const originalJson = res.json.bind(res);
            res._rcceWrapped = false;

            res.rcceSuccess = function rcceSuccess(code = "SUCCESS", data = null, options = {}) {
                const def = catalogue.get(code, options.httpStatus || 200, true);
                const status = options.httpStatus || def.httpStatus || 200;
                const envelope = buildEnvelope({
                    success: true,
                    code: def.code,
                    message: options.message || def.message,
                    data,
                    httpStatus: status,
                    requestId: req.requestId || res.getHeader("X-Request-ID") || null,
                    timestamp: new Date().toISOString(),
                    extra: options.extra || {}
                });
                res.locals.rcceEnvelope = envelope;
                res._rcceWrapped = true;
                return res.status(status).json(envelope);
            };

            res.rcceError = function rcceError(code = "INTERNAL_ERROR", errors = [], options = {}) {
                const def = catalogue.get(code, options.httpStatus || 500, false);
                const status = options.httpStatus || def.httpStatus || 500;
                const envelope = buildEnvelope({
                    success: false,
                    code: def.code,
                    message: options.message || def.message,
                    data: options.data || null,
                    errors,
                    httpStatus: status,
                    requestId: req.requestId || res.getHeader("X-Request-ID") || null,
                    timestamp: new Date().toISOString(),
                    extra: options.extra || {}
                });
                res.locals.rcceEnvelope = envelope;
                res._rcceWrapped = true;
                return res.status(status).json(envelope);
            };

            // Auto-standardize any legacy controller JSON payload cleanly
            res.json = function wrappedJson(payload) {
                if (res._rcceWrapped) {
                    if (payload && typeof payload === "object" && !res.locals.rcceEnvelope) {
                        res.locals.rcceEnvelope = payload;
                    }
                    return originalJson(payload);
                }

                // Skip non-API or already binary/primitive/array payloads if needed, but wrap objects cleanly
                if (payload && typeof payload === "object" && !Array.isArray(payload)) {
                    const statusCode = res.statusCode || 200;
                    const inferredSuccess =
                        typeof payload.success === "boolean"
                            ? payload.success && statusCode < 400
                            : statusCode < 400;

                    const explicitCode =
                        payload.code ||
                        (payload.error && payload.error.code) ||
                        null;

                    const resolvedDef = catalogue.get(explicitCode, statusCode, inferredSuccess);

                    const {
                        success: _s,
                        code: _c,
                        message: _m,
                        data: _d,
                        errors: _errs,
                        timestamp: _ts,
                        requestId: _rid,
                        ...rest
                    } = payload;

                    const envelope = buildEnvelope({
                        success: inferredSuccess,
                        code: resolvedDef.code,
                        message: payload.message || (payload.error && payload.error.message) || resolvedDef.message,
                        data: payload.data !== undefined ? payload.data : (inferredSuccess ? (Object.keys(rest).length ? null : null) : null),
                        errors: payload.errors || (!inferredSuccess && payload.error ? [payload.error] : []),
                        httpStatus: statusCode,
                        requestId: payload.requestId || req.requestId || res.getHeader("X-Request-ID") || null,
                        timestamp: payload.timestamp || new Date().toISOString(),
                        extra: rest
                    });

                    // Capture outcome metadata for audit/idempotency layers
                    res.locals.rcceEnvelope = envelope;
                    res._rcceWrapped = true;
                    return originalJson(envelope);
                }

                return originalJson(payload);
            };

            next();
        };
    }

    return Object.freeze({
        buildEnvelope,
        expressMiddleware
    });
}

module.exports = { createResponseEngine };
