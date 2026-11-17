"use strict";

/*
================================================================================
GBS CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE (GBS-RCCE)
PACKAGE ENTRYPOINT & FACTORY
LOCATION: enterprise-framework/gbs-rcce/index.js
================================================================================
Reusable across:
  - GBS Hospital Management System
  - GBS School Management System
  - GBS Examination System
  - GBS Real Estate Management System
  - GBS Company Management System
  - Every future GBS product
================================================================================
*/

const {
    DEFAULT_RESPONSE_CATALOGUE,
    CODE_ALIASES,
    createResponseCatalogue
} = require("./response.catalogue");
const { createResponseEngine } = require("./response.engine");
const { createBusinessRulesEngine, RcceRuleError } = require("./business-rules.engine");
const { createAuditEngine, computeIntegrityHash } = require("./audit.engine");
const { createEventNotificationEngine, CANONICAL_EVENTS } = require("./event-notification.engine");
const { createIdempotencyEngine, hashPayload } = require("./idempotency.engine");
const {
    createControlEngine,
    SENSITIVE_SCOPES,
    maskEmail,
    maskPhone,
    redactPrivateUserFields,
    redactPrivatePatientFields
} = require("./control.engine");
const { createErrorEngine, classifyError } = require("./error.engine");

function createGbsRcceEngine(options = {}) {
    const {
        applicationName = "GBS Application",
        customResponses = {},
        storageAdapter = null,
        logger = console,
        idempotencyTtlMs = 24 * 60 * 60 * 1000
    } = options;

    const catalogue = createResponseCatalogue(customResponses);
    const responseEngine = createResponseEngine({ catalogue });
    const rulesEngine = createBusinessRulesEngine({ catalogue });
    const auditEngine = createAuditEngine({ storageAdapter, logger });
    const eventEngine = createEventNotificationEngine({ storageAdapter, logger });
    const idempotencyEngine = createIdempotencyEngine({
        storageAdapter,
        catalogue,
        responseEngine,
        auditEngine,
        defaultTtlMs: idempotencyTtlMs,
        logger
    });
    const controlEngine = createControlEngine({
        storageAdapter,
        auditEngine,
        eventEngine,
        catalogue
    });
    const errorEngine = createErrorEngine({
        catalogue,
        responseEngine,
        storageAdapter,
        eventEngine,
        logger
    });

    return Object.freeze({
        applicationName,
        catalogue,
        response: responseEngine,
        rules: rulesEngine,
        audit: auditEngine,
        events: eventEngine,
        notifications: eventEngine,
        idempotency: idempotencyEngine,
        control: controlEngine,
        errors: errorEngine,
        CONSTANTS: Object.freeze({
            CANONICAL_EVENTS,
            SENSITIVE_SCOPES
        }),
        helpers: Object.freeze({
            maskEmail,
            maskPhone,
            redactPrivateUserFields,
            redactPrivatePatientFields,
            computeIntegrityHash,
            hashPayload,
            classifyError,
            RcceRuleError
        })
    });
}

module.exports = {
    createGbsRcceEngine,
    DEFAULT_RESPONSE_CATALOGUE,
    CODE_ALIASES,
    CANONICAL_EVENTS,
    SENSITIVE_SCOPES,
    RcceRuleError,
    maskEmail,
    maskPhone,
    redactPrivateUserFields,
    redactPrivatePatientFields,
    computeIntegrityHash,
    hashPayload,
    classifyError
};
