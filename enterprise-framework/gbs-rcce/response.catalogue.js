"use strict";

/*
================================================================================
GBS CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE (GBS-RCCE)
MODULE: Central Response Catalogue (Product-Agnostic & Extensible)
LOCATION: enterprise-framework/gbs-rcce/response.catalogue.js
================================================================================
Standardizes every operation code, HTTP status, severity, and exact
user-facing message across all GBS applications (Hospital, School, Exam,
Real Estate, Company Management, and future GBS products).
================================================================================
*/

const DEFAULT_RESPONSE_CATALOGUE = Object.freeze({
    // Generic Success Operations
    SUCCESS: {
        code: "SUCCESS",
        httpStatus: 200,
        severity: "INFO",
        category: "GENERAL",
        message: "Operation completed successfully."
    },
    CREATED: {
        code: "CREATED",
        httpStatus: 201,
        severity: "INFO",
        category: "GENERAL",
        message: "Record created successfully."
    },
    RECORD_UPDATED: {
        code: "RECORD_UPDATED",
        httpStatus: 200,
        severity: "INFO",
        category: "GENERAL",
        message: "Your information has been updated successfully."
    },
    RECORD_DELETED: {
        code: "RECORD_DELETED",
        httpStatus: 200,
        severity: "INFO",
        category: "GENERAL",
        message: "Record removed successfully."
    },

    // Registration, Admission & Approval Workflows
    REGISTRATION_SUCCESS: {
        code: "REGISTRATION_SUCCESS",
        httpStatus: 201,
        severity: "INFO",
        category: "REGISTRATION",
        message: "Registration completed successfully."
    },
    REGISTRATION_FAILED: {
        code: "REGISTRATION_FAILED",
        httpStatus: 400,
        severity: "WARNING",
        category: "REGISTRATION",
        message: "Registration could not be completed. Please review the information and try again."
    },
    ADMISSION_COMPLETED: {
        code: "ADMISSION_COMPLETED",
        httpStatus: 201,
        severity: "INFO",
        category: "ADMISSION",
        message: "Admission completed successfully."
    },
    PENDING_APPROVAL: {
        code: "PENDING_APPROVAL",
        httpStatus: 202,
        severity: "INFO",
        category: "APPROVAL",
        message: "Your request has been submitted and is awaiting approval."
    },
    REQUEST_SUBMITTED: {
        code: "REQUEST_SUBMITTED",
        httpStatus: 201,
        severity: "INFO",
        category: "APPROVAL",
        message: "Your request has been submitted and is awaiting approval."
    },
    REQUEST_APPROVED: {
        code: "REQUEST_APPROVED",
        httpStatus: 200,
        severity: "INFO",
        category: "APPROVAL",
        message: "Request has been approved successfully."
    },
    REQUEST_REJECTED: {
        code: "REQUEST_REJECTED",
        httpStatus: 200,
        severity: "WARNING",
        category: "APPROVAL",
        message: "Request has been rejected."
    },

    // Financial & Payment Operations
    PAYMENT_RECEIVED: {
        code: "PAYMENT_RECEIVED",
        httpStatus: 200,
        severity: "INFO",
        category: "PAYMENT",
        message: "Payment received successfully."
    },
    PAYMENT_REJECTED: {
        code: "PAYMENT_REJECTED",
        httpStatus: 422,
        severity: "WARNING",
        category: "PAYMENT",
        message: "Payment could not be processed. Please verify the payment details and try again."
    },
    INVOICE_CREATED: {
        code: "INVOICE_CREATED",
        httpStatus: 201,
        severity: "INFO",
        category: "PAYMENT",
        message: "Invoice generated successfully."
    },

    // Reporting & Notifications
    REPORT_GENERATED: {
        code: "REPORT_GENERATED",
        httpStatus: 200,
        severity: "INFO",
        category: "REPORTING",
        message: "Report generated successfully."
    },

    // Validation & Business Rule Failures
    VALIDATION_MISSING_INFO: {
        code: "VALIDATION_MISSING_INFO",
        httpStatus: 400,
        severity: "WARNING",
        category: "VALIDATION",
        message: "Some required information is missing."
    },
    VALIDATION_FAILED: {
        code: "VALIDATION_FAILED",
        httpStatus: 400,
        severity: "WARNING",
        category: "VALIDATION",
        message: "Some submitted information is invalid. Please check your entries and try again."
    },
    BUSINESS_RULE_VIOLATION: {
        code: "BUSINESS_RULE_VIOLATION",
        httpStatus: 422,
        severity: "WARNING",
        category: "BUSINESS_RULE",
        message: "This operation cannot be completed because a required business rule was not met."
    },
    OPERATION_INCOMPLETE: {
        code: "OPERATION_INCOMPLETE",
        httpStatus: 422,
        severity: "WARNING",
        category: "TRANSACTION",
        message: "The operation could not be completed. No partial changes were saved."
    },

    // Authentication, Authorization & Developer Privacy Controls
    DEMO_TRIAL_LIMIT_REACHED: {
        code: "DEMO_TRIAL_LIMIT_REACHED",
        httpStatus: 403,
        severity: "WARNING",
        category: "DEMO_QUOTA",
        message: "Demo trial limit reached (10/10 entries). Sign up or sign in with a verified account for unlimited production operations."
    },
    UNAUTHORIZED: {
        code: "UNAUTHORIZED",
        httpStatus: 401,
        severity: "WARNING",
        category: "AUTH",
        message: "Authentication is required to perform this operation."
    },
    INVALID_CREDENTIALS: {
        code: "INVALID_CREDENTIALS",
        httpStatus: 401,
        severity: "WARNING",
        category: "AUTH",
        message: "Invalid login credentials. Please verify your email and password."
    },
    FORBIDDEN_PERMISSION: {
        code: "FORBIDDEN_PERMISSION",
        httpStatus: 403,
        severity: "WARNING",
        category: "AUTHZ",
        message: "You do not have permission to perform this operation."
    },
    SENSITIVE_ACCESS_RESTRICTED: {
        code: "SENSITIVE_ACCESS_RESTRICTED",
        httpStatus: 403,
        severity: "WARNING",
        category: "PRIVACY",
        message: "Access to private user or clinical information requires an explicit approved access grant."
    },
    ACCOUNT_SUSPENDED: {
        code: "ACCOUNT_SUSPENDED",
        httpStatus: 403,
        severity: "WARNING",
        category: "AUTH",
        message: "Your account is currently suspended or pending approval. Please contact an administrator."
    },
    SUBSCRIPTION_EXPIRED: {
        code: "SUBSCRIPTION_EXPIRED",
        httpStatus: 402,
        severity: "CRITICAL",
        category: "TENANT",
        message: "Facility subscription has expired. Please renew your subscription to continue."
    },
    SYSTEM_LOCKED: {
        code: "SYSTEM_LOCKED",
        httpStatus: 423,
        severity: "CRITICAL",
        category: "TENANT",
        message: "System operations are currently locked by authorized administration."
    },

    // Lookup & Conflict Responses
    RECORD_NOT_FOUND: {
        code: "RECORD_NOT_FOUND",
        httpStatus: 404,
        severity: "WARNING",
        category: "LOOKUP",
        message: "No matching record was found."
    },
    ROUTE_NOT_FOUND: {
        code: "ROUTE_NOT_FOUND",
        httpStatus: 404,
        severity: "WARNING",
        category: "LOOKUP",
        message: "The requested service endpoint was not found."
    },
    DUPLICATE_SUBMISSION: {
        code: "DUPLICATE_SUBMISSION",
        httpStatus: 409,
        severity: "WARNING",
        category: "IDEMPOTENCY",
        message: "A duplicate request was detected. The original operation has already been processed."
    },
    DUPLICATE_CONFLICT: {
        code: "DUPLICATE_CONFLICT",
        httpStatus: 409,
        severity: "WARNING",
        category: "CONFLICT",
        message: "A record with this unique information already exists."
    },
    TRANSACTION_IN_PROGRESS: {
        code: "TRANSACTION_IN_PROGRESS",
        httpStatus: 409,
        severity: "WARNING",
        category: "IDEMPOTENCY",
        message: "This operation is already in progress. Please wait for it to finish."
    },

    // Infrastructure, Network, Database & Service Availability Errors
    NETWORK_ERROR: {
        code: "NETWORK_ERROR",
        httpStatus: 502,
        severity: "ERROR",
        category: "NETWORK",
        message: "A network communication error occurred. Please check your connection and try again."
    },
    DATABASE_ERROR: {
        code: "DATABASE_ERROR",
        httpStatus: 503,
        severity: "CRITICAL",
        category: "DATABASE",
        message: "A temporary data storage issue prevented this operation. Please try again shortly."
    },
    TRANSACTION_FAILED: {
        code: "TRANSACTION_FAILED",
        httpStatus: 500,
        severity: "ERROR",
        category: "TRANSACTION",
        message: "The transaction could not be completed. Please try again or contact support."
    },
    SERVICE_UNAVAILABLE: {
        code: "SERVICE_UNAVAILABLE",
        httpStatus: 503,
        severity: "CRITICAL",
        category: "SYSTEM",
        message: "The service is temporarily unavailable due to maintenance or high load. Please try again shortly."
    },
    MAINTENANCE_MODE: {
        code: "MAINTENANCE_MODE",
        httpStatus: 503,
        severity: "WARNING",
        category: "SYSTEM",
        message: "The system is undergoing authorized maintenance. Please try again shortly."
    },
    INTERNAL_ERROR: {
        code: "INTERNAL_ERROR",
        httpStatus: 500,
        severity: "ERROR",
        category: "SYSTEM",
        message: "An unexpected system error occurred. Technical teams have been notified."
    }
});

// Maps legacy HTTP codes / module error codes to canonical catalogue keys
const CODE_ALIASES = Object.freeze({
    MISSING_CREDENTIALS: "VALIDATION_MISSING_INFO",
    MISSING_REQUIRED_FIELDS: "VALIDATION_MISSING_INFO",
    MISSING_FIELDS: "VALIDATION_MISSING_INFO",
    VALIDATION_ERROR: "VALIDATION_FAILED",
    ACCESS_DENIED: "FORBIDDEN_PERMISSION",
    INSUFFICIENT_PERMISSION: "FORBIDDEN_PERMISSION",
    INSUFFICIENT_ROLE_AUTHORITY: "FORBIDDEN_PERMISSION",
    FORBIDDEN: "FORBIDDEN_PERMISSION",
    NOT_FOUND: "RECORD_NOT_FOUND",
    PATIENT_NOT_FOUND: "RECORD_NOT_FOUND",
    USER_NOT_FOUND: "RECORD_NOT_FOUND",
    TENANT_NOT_FOUND: "RECORD_NOT_FOUND",
    BILL_NOT_FOUND: "RECORD_NOT_FOUND",
    ADMISSION_NOT_FOUND: "RECORD_NOT_FOUND",
    DUPLICATE_RECORD: "DUPLICATE_CONFLICT",
    CONFLICT: "DUPLICATE_CONFLICT",
    IDEMPOTENCY_CONFLICT: "DUPLICATE_SUBMISSION",
    ACCOUNT_INACTIVE: "ACCOUNT_SUSPENDED",
    ACCOUNT_PENDING_APPROVAL: "PENDING_APPROVAL",
    TENANT_LOCKED: "SYSTEM_LOCKED",
    SUBSCRIPTION_LOCKED: "SUBSCRIPTION_EXPIRED",
    DB_CONNECTION_FAILED: "DATABASE_ERROR"
});

function createResponseCatalogue(customEntries = {}) {
    const catalogue = { ...DEFAULT_RESPONSE_CATALOGUE };
    for (const [key, value] of Object.entries(customEntries)) {
        if (value && typeof value === "object") {
            catalogue[key] = Object.freeze({
                code: value.code || key,
                httpStatus: value.httpStatus || 200,
                severity: value.severity || "INFO",
                category: value.category || "CUSTOM",
                message: value.message || "Operation completed."
            });
        }
    }

    function inferCodeFromStatus(httpStatus = 200, success = true) {
        if (success) {
            if (httpStatus === 201) return "CREATED";
            if (httpStatus === 202) return "PENDING_APPROVAL";
            return "SUCCESS";
        }
        if (httpStatus === 400) return "VALIDATION_FAILED";
        if (httpStatus === 401) return "UNAUTHORIZED";
        if (httpStatus === 402) return "SUBSCRIPTION_EXPIRED";
        if (httpStatus === 403) return "FORBIDDEN_PERMISSION";
        if (httpStatus === 404) return "RECORD_NOT_FOUND";
        if (httpStatus === 409) return "DUPLICATE_CONFLICT";
        if (httpStatus === 422) return "BUSINESS_RULE_VIOLATION";
        if (httpStatus === 423) return "SYSTEM_LOCKED";
        if (httpStatus === 502) return "NETWORK_ERROR";
        if (httpStatus === 503) return "SERVICE_UNAVAILABLE";
        return "INTERNAL_ERROR";
    }

    function get(code, fallbackStatus = 200, success = true) {
        if (code && catalogue[code]) {
            return catalogue[code];
        }
        if (code && CODE_ALIASES[code] && catalogue[CODE_ALIASES[code]]) {
            return {
                ...catalogue[CODE_ALIASES[code]],
                code // preserve specific code while using canonical message/status defaults
            };
        }
        const inferredKey = inferCodeFromStatus(fallbackStatus, success);
        const inferred = catalogue[inferredKey] || catalogue.INTERNAL_ERROR;
        return {
            ...inferred,
            code: code || inferred.code
        };
    }

    return Object.freeze({
        entries: catalogue,
        get,
        inferCodeFromStatus,
        list: () => Object.values(catalogue)
    });
}

module.exports = {
    DEFAULT_RESPONSE_CATALOGUE,
    CODE_ALIASES,
    createResponseCatalogue
};
