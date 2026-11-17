"use strict";

/*
================================================================================
GBS CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE (GBS-RCCE)
MODULE: Central Business Rules Engine
LOCATION: enterprise-framework/gbs-rcce/business-rules.engine.js
================================================================================
Provides backend-enforced, composable validation & operational guards so no
frontend flag or ad-hoc controller logic can bypass business integrity rules.
================================================================================
*/

class RcceRuleError extends Error {
    constructor(code, message, httpStatus = 422, errors = [], details = null) {
        super(message);
        this.name = "RcceRuleError";
        this.code = code;
        this.statusCode = httpStatus;
        this.errors = Array.isArray(errors) ? errors : [];
        this.details = details;
        this.isOperational = true;
    }
}

function createBusinessRulesEngine({ catalogue }) {
    const ruleRegistry = new Map();

    function registerRule(ruleName, validatorFn) {
        if (!ruleName || typeof validatorFn !== "function") {
            throw new Error("registerRule requires a valid ruleName and validator function.");
        }
        ruleRegistry.set(ruleName, validatorFn);
    }

    function requireFields(payload = {}, requiredFields = []) {
        const errors = [];
        for (const fieldSpec of requiredFields) {
            const field = typeof fieldSpec === "string" ? fieldSpec : fieldSpec.field;
            const label = (typeof fieldSpec === "object" && fieldSpec.label) || field;
            const val = payload ? payload[field] : undefined;
            if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
                errors.push({
                    field,
                    code: "VALIDATION_MISSING_INFO",
                    message: `${label} is required.`
                });
            }
        }
        if (errors.length > 0) {
            const def = catalogue.get("VALIDATION_MISSING_INFO", 400, false);
            return {
                valid: false,
                code: def.code,
                httpStatus: 400,
                message: def.message,
                errors
            };
        }
        return { valid: true, errors: [] };
    }

    function requirePositiveNumber(payload = {}, field, label = field) {
        const num = Number(payload ? payload[field] : NaN);
        if (!Number.isFinite(num) || num <= 0) {
            const def = catalogue.get("VALIDATION_FAILED", 400, false);
            return {
                valid: false,
                code: def.code,
                httpStatus: 400,
                message: `${label} must be a positive number greater than zero.`,
                errors: [{ field, code: "INVALID_NUMBER", message: `${label} must be greater than 0.` }]
            };
        }
        return { valid: true, errors: [] };
    }

    function requireValidTransition(currentStatus, nextStatus, transitionMap = {}) {
        const allowed = transitionMap[currentStatus] || [];
        if (!allowed.includes(nextStatus)) {
            return {
                valid: false,
                code: "BUSINESS_RULE_VIOLATION",
                httpStatus: 422,
                message: `Cannot transition status from ${currentStatus} to ${nextStatus}.`,
                errors: [
                    {
                        field: "status",
                        code: "INVALID_STATE_TRANSITION",
                        message: `Allowed next states from ${currentStatus}: ${allowed.join(", ") || "none"}.`
                    }
                ]
            };
        }
        return { valid: true, errors: [] };
    }

    function verifyRecordOwnership({ actor, ownerId, privilegedRoles = [] }) {
        if (!actor || !actor.id) {
            const def = catalogue.get("UNAUTHORIZED", 401, false);
            return { valid: false, code: def.code, httpStatus: 401, message: def.message, errors: [] };
        }
        if (privilegedRoles.includes(actor.role)) {
            return { valid: true, errors: [] };
        }
        if (ownerId && String(ownerId) === String(actor.id)) {
            return { valid: true, errors: [] };
        }
        const def = catalogue.get("FORBIDDEN_PERMISSION", 403, false);
        return {
            valid: false,
            code: def.code,
            httpStatus: 403,
            message: def.message,
            errors: [{ field: "ownership", code: "OWNERSHIP_REQUIRED", message: def.message }]
        };
    }

    async function evaluate(checks = [], context = {}) {
        const errors = [];
        for (const check of checks) {
            let outcome = null;
            if (typeof check === "string") {
                const fn = ruleRegistry.get(check);
                if (!fn) continue;
                outcome = await fn(context);
            } else if (typeof check === "function") {
                outcome = await check(context);
            } else if (check && typeof check === "object") {
                outcome = check;
            }

            if (outcome && outcome.valid === false) {
                if (Array.isArray(outcome.errors) && outcome.errors.length > 0) {
                    errors.push(...outcome.errors);
                } else {
                    errors.push({
                        field: outcome.field || "general",
                        code: outcome.code || "BUSINESS_RULE_VIOLATION",
                        message: outcome.message
                    });
                }
                if (outcome.stopOnFail !== false) {
                    return {
                        valid: false,
                        code: outcome.code || "BUSINESS_RULE_VIOLATION",
                        httpStatus: outcome.httpStatus || 422,
                        message: outcome.message || catalogue.get(outcome.code, 422, false).message,
                        errors
                    };
                }
            }
        }

        if (errors.length > 0) {
            const def = catalogue.get("VALIDATION_FAILED", 400, false);
            return {
                valid: false,
                code: def.code,
                httpStatus: 400,
                message: def.message,
                errors
            };
        }

        return { valid: true, code: "SUCCESS", httpStatus: 200, message: "Rules passed.", errors: [] };
    }

    async function enforce(checks = [], context = {}) {
        const res = await evaluate(checks, context);
        if (!res.valid) {
            throw new RcceRuleError(res.code, res.message, res.httpStatus, res.errors);
        }
        return res;
    }

    return Object.freeze({
        RcceRuleError,
        registerRule,
        requireFields,
        requirePositiveNumber,
        requireValidTransition,
        verifyRecordOwnership,
        evaluate,
        enforce
    });
}

module.exports = { createBusinessRulesEngine, RcceRuleError };
