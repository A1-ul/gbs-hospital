"use strict";

/*
================================================================================
GBS CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE (GBS-RCCE)
MODULE: User & Developer Control Engine
LOCATION: enterprise-framework/gbs-rcce/control.engine.js
================================================================================
Connects all regular users and the Developer Control Interface via strict
role permissions and explicit, audited sensitive-access grants.
Developer status alone NEVER grants unrestricted access to private user info.
================================================================================
*/

const SENSITIVE_SCOPES = Object.freeze({
    USER_PII_READ: "USER_PII_READ",
    PATIENT_RECORDS_READ: "PATIENT_RECORDS_READ",
    FINANCIAL_DETAILS_READ: "FINANCIAL_DETAILS_READ",
    FULL_DIAGNOSTIC_SUPPORT: "FULL_DIAGNOSTIC_SUPPORT"
});

function maskEmail(email = "") {
    const str = String(email || "");
    const atIdx = str.indexOf("@");
    if (atIdx <= 1) return "***@***";
    return `${str.slice(0, 2)}***${str.slice(atIdx)}`;
}

function maskPhone(phone = "") {
    const str = String(phone || "");
    if (str.length <= 4) return "****";
    return `${"*".repeat(Math.max(4, str.length - 4))}${str.slice(-4)}`;
}

function redactPrivateUserFields(user = {}) {
    if (!user || typeof user !== "object") return user;
    const redacted = {
        id: user.id,
        name: user.name ? `${String(user.name).split(" ")[0]} [REDACTED]` : "[REDACTED]",
        email: maskEmail(user.email),
        role: user.role,
        active: user.active,
        status: user.status,
        department: user.department || null,
        hospitalId: user.hospitalId || null,
        lastLogin: user.lastLogin || null,
        createdAt: user.createdAt || null,
        privacyRedacted: true
    };
    if ("phone" in user) {
        redacted.phone = user.phone ? maskPhone(user.phone) : null;
    }
    return redacted;
}

function redactPrivatePatientFields(patient = {}) {
    if (!patient || typeof patient !== "object") return patient;
    return {
        id: patient.id,
        mrn: patient.mrn,
        patientCode: patient.patientCode || patient.mrn || null,
        firstName: patient.firstName ? `${String(patient.firstName)[0]}***` : "***",
        lastName: patient.lastName ? `${String(patient.lastName)[0]}***` : "***",
        gender: patient.gender || null,
        phone: patient.phone ? maskPhone(patient.phone) : null,
        email: patient.email ? maskEmail(patient.email) : null,
        hospitalId: patient.hospitalId || null,
        status: patient.status || "ACTIVE",
        createdAt: patient.createdAt || null,
        privacyRedacted: true
    };
}

function createControlEngine({ storageAdapter, auditEngine, eventEngine, catalogue }) {
    async function evaluateDeveloperGrant({ developerId, scope, tenantId = null }) {
        if (!developerId || !storageAdapter || typeof storageAdapter.findActiveDeveloperGrant !== "function") {
            return null;
        }
        return await storageAdapter.findActiveDeveloperGrant({
            developerId,
            scope,
            tenantId
        });
    }

    async function authorizeSensitiveAccess({
        actor,
        scope = SENSITIVE_SCOPES.USER_PII_READ,
        tenantId = null,
        affectedRecord = null,
        requestId = null,
        ipAddress = null
    }) {
        if (!actor || !actor.id) {
            const def = catalogue.get("UNAUTHORIZED", 401, false);
            return { allowed: false, code: def.code, httpStatus: 401, message: def.message, grant: null };
        }

        // Standard Administrators follow organizational RBAC; Developers must hold an explicit active grant
        if (actor.role === "DEVELOPER") {
            const grant = await evaluateDeveloperGrant({
                developerId: actor.id,
                scope,
                tenantId
            });

            if (!grant) {
                const def = catalogue.get("SENSITIVE_ACCESS_RESTRICTED", 403, false);
                if (auditEngine) {
                    await auditEngine.record({
                        userId: actor.id,
                        role: actor.role,
                        tenantId,
                        action: "DEVELOPER_SENSITIVE_ACCESS_DENIED",
                        module: "PRIVACY_CONTROL",
                        affectedRecord: affectedRecord || scope,
                        outcome: "DENIED",
                        requestId,
                        responseCode: def.code,
                        httpStatus: 403,
                        ipAddress,
                        description: `Developer ${actor.email || actor.id} attempted ${scope} without an explicit active access grant.`
                    });
                }
                if (eventEngine) {
                    await eventEngine.publish({
                        eventCode: "OPERATION_DENIED",
                        domain: "PRIVACY_CONTROL",
                        actorUserId: actor.id,
                        actorRole: actor.role,
                        tenantId,
                        affectedRecord: scope,
                        severity: "WARNING",
                        requestId,
                        notifications: [
                            {
                                recipientRole: "ADMIN",
                                title: "Restricted Developer Sensitive Access Blocked",
                                message: `Developer attempted ungranted ${scope} access (${affectedRecord || "private records"}).`,
                                severity: "WARNING"
                            }
                        ]
                    });
                }
                return {
                    allowed: false,
                    code: def.code,
                    httpStatus: 403,
                    message: def.message,
                    grant: null
                };
            }

            if (storageAdapter && typeof storageAdapter.recordDeveloperGrantUsage === "function") {
                await storageAdapter.recordDeveloperGrantUsage(grant.id);
            }

            if (auditEngine) {
                await auditEngine.record({
                    userId: actor.id,
                    role: actor.role,
                    tenantId,
                    action: "DEVELOPER_SENSITIVE_ACCESS_GRANTED",
                    module: "PRIVACY_CONTROL",
                    affectedRecord: affectedRecord || scope,
                    outcome: "SUCCESS",
                    requestId,
                    responseCode: "SUCCESS",
                    httpStatus: 200,
                    ipAddress,
                    description: `Developer accessed ${scope} via explicit grant ${grant.grantCode} (${grant.reason}).`,
                    metadata: { grantId: grant.id, grantCode: grant.grantCode, scope, ticketRef: grant.ticketRef }
                });
            }

            if (eventEngine) {
                await eventEngine.publish({
                    eventCode: "DEVELOPER_SENSITIVE_ACCESS",
                    domain: "PRIVACY_CONTROL",
                    actorUserId: actor.id,
                    actorRole: actor.role,
                    tenantId,
                    affectedRecord: grant.grantCode,
                    severity: "INFO",
                    requestId,
                    asyncDelivery: true,
                    notifications: [
                        {
                            recipientRole: "ADMIN",
                            title: "Audited Developer Sensitive Access",
                            message: `Grant ${grant.grantCode} used for ${scope} (${grant.reason}).`,
                            severity: "INFO"
                        }
                    ]
                });
            }

            return {
                allowed: true,
                code: "SUCCESS",
                httpStatus: 200,
                message: "Explicit sensitive access authorized and audited.",
                grant
            };
        }

        return {
            allowed: true,
            code: "SUCCESS",
            httpStatus: 200,
            message: "Access authorized by organizational role.",
            grant: null
        };
    }

    return Object.freeze({
        SENSITIVE_SCOPES,
        maskEmail,
        maskPhone,
        redactPrivateUserFields,
        redactPrivatePatientFields,
        evaluateDeveloperGrant,
        authorizeSensitiveAccess
    });
}

module.exports = {
    createControlEngine,
    SENSITIVE_SCOPES,
    maskEmail,
    maskPhone,
    redactPrivateUserFields,
    redactPrivatePatientFields
};
