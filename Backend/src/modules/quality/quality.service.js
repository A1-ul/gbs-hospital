"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
QUALITY ASSURANCE, CLINICAL AUDIT, INCIDENTS & IPC SERVICE
Phase 18 Production Hardened - CommonJS Only
LOCATION: src/modules/quality/quality.service.js
====================================================
*/

const prisma = require("../../core/database/prisma.client");
const AppError = require("../../core/errors/app.error");
const logger = require("../../core/utils/logger");
const {
    generateIncidentNumber,
    generateIpcCaseNumber,
    generateAuditNumber,
    generateCapaNumber,
    generateAlertCode
} = require("./helpers/quality-id.generator");
const {
    INCIDENT_SEVERITIES,
    INCIDENT_CATEGORIES,
    INFECTION_TYPES,
    ISOLATION_PRECAUTIONS,
    AUDIT_TYPES,
    ROOT_CAUSE_METHODS,
    calculateSafetyIndex
} = require("./helpers/quality-catalogs");

/**
 * Returns Quality reference catalogs and definitions
 */
async function getQualityCatalogs() {
    return {
        severities: Object.values(INCIDENT_SEVERITIES),
        incidentCategories: INCIDENT_CATEGORIES,
        infectionTypes: INFECTION_TYPES,
        isolationPrecautions: ISOLATION_PRECAUTIONS,
        auditTypes: AUDIT_TYPES,
        rootCauseMethods: ROOT_CAUSE_METHODS
    };
}

/**
 * Aggregates real-time PostgreSQL telemetry for Quality Assurance Command Center
 */
async function getQualityStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        totalIncidents,
        sentinelCount,
        adverseCount,
        nearMissCount,
        activeIpcCases,
        audits,
        totalCapas,
        overdueCapas,
        activeAlerts
    ] = await Promise.all([
        prisma.clinicalIncident.count(),
        prisma.clinicalIncident.count({ where: { severity: "SENTINEL_EVENT", status: { not: "CLOSED" } } }),
        prisma.clinicalIncident.count({ where: { severity: "ADVERSE_EVENT", status: { not: "CLOSED" } } }),
        prisma.clinicalIncident.count({ where: { severity: "NEAR_MISS", status: { not: "CLOSED" } } }),
        prisma.infectionControlCase.count({ where: { status: "ACTIVE_ISOLATION" } }),
        prisma.clinicalAudit.findMany({ select: { complianceScore: true } }),
        prisma.correctiveActionPlan.count({ where: { status: { not: "VERIFIED_EFFECTIVE" } } }),
        prisma.correctiveActionPlan.count({
            where: {
                status: "PENDING_EXECUTION",
                targetDate: { lt: today }
            }
        }),
        prisma.patientSafetyAlert.count({ where: { broadcastActive: true } })
    ]);

    const complianceScoreAvg = audits.length > 0
        ? Math.round((audits.reduce((acc, a) => acc + a.complianceScore, 0) / audits.length) * 10) / 10
        : 95.0;

    const safetyIndex = calculateSafetyIndex({
        sentinelEvents: sentinelCount,
        adverseEvents: adverseCount,
        activeHais: activeIpcCases,
        overdueCapas,
        complianceScoreAvg
    });

    return {
        totalIncidentsReported: totalIncidents,
        activeSentinelEvents: sentinelCount,
        activeAdverseEvents: adverseCount,
        activeNearMisses: nearMissCount,
        activeIpcIsolations: activeIpcCases,
        clinicalAuditsConducted: audits.length,
        averageAuditComplianceScore: complianceScoreAvg,
        openCapaPlans: totalCapas,
        overdueCapaActions: overdueCapas,
        activeSafetyAlerts: activeAlerts,
        hospitalSafetyIndex: safetyIndex
    };
}

/**
 * Reports a clinical incident / adverse event / near miss with INC-YYYY-XXXXXX
 */
async function reportClinicalIncident(data) {
    if (!data.department || !data.severity || !data.category || !data.description) {
        throw new AppError("department, severity, category, and description are required.", 400);
    }

    if (!INCIDENT_SEVERITIES[data.severity]) {
        throw new AppError(`Invalid incident severity: ${data.severity}`, 400);
    }

    const incidentNumber = await generateIncidentNumber();
    const isAnon = Boolean(data.isAnonymous);
    const reporter = isAnon ? "ANONYMOUS" : (data.reportedBy ? data.reportedBy.trim() : "HOSPITAL_STAFF");

    const incident = await prisma.clinicalIncident.create({
        data: {
            incidentNumber,
            incidentDate: data.incidentDate ? new Date(data.incidentDate) : new Date(),
            department: data.department.trim(),
            wardOrLocation: data.wardOrLocation ? data.wardOrLocation.trim() : null,
            severity: data.severity,
            category: data.category,
            description: data.description.trim(),
            patientMrn: data.patientMrn ? data.patientMrn.trim() : null,
            patientName: data.patientName ? data.patientName.trim() : null,
            immediateActionTaken: data.immediateActionTaken ? data.immediateActionTaken.trim() : null,
            reportedBy: reporter,
            isAnonymous: isAnon,
            status: "REPORTED"
        }
    });

    if (incident.severity === "SENTINEL_EVENT") {
        logger.warn(`[SENTINEL_EVENT] Clinical Incident ${incident.incidentNumber} reported in ${incident.department}! Mandatory 24-hour RCA required.`);
    } else {
        logger.info(`Clinical Incident ${incident.incidentNumber} reported (${incident.severity} - ${incident.category}) in ${incident.department}`);
    }

    return incident;
}

/**
 * Retrieves clinical incidents with filtering and pagination
 */
async function getClinicalIncidents(filters = {}) {
    const where = {};
    if (filters.severity) where.severity = filters.severity;
    if (filters.category) where.category = filters.category;
    if (filters.department) where.department = filters.department;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
        const s = filters.search.trim();
        where.OR = [
            { incidentNumber: { contains: s, mode: "insensitive" } },
            { description: { contains: s, mode: "insensitive" } },
            { department: { contains: s, mode: "insensitive" } },
            { patientMrn: { contains: s, mode: "insensitive" } }
        ];
    }

    return prisma.clinicalIncident.findMany({
        where,
        include: { capas: true },
        orderBy: { incidentDate: "desc" }
    });
}

/**
 * Updates an incident with Root Cause Analysis (RCA) findings
 */
async function investigateIncident(id, { investigatorName, rootCause, status }) {
    const existing = await prisma.clinicalIncident.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Clinical incident not found.", 404);
    }

    if (!investigatorName) {
        throw new AppError("investigatorName is required.", 400);
    }

    const updated = await prisma.clinicalIncident.update({
        where: { id },
        data: {
            investigatorName: investigatorName.trim(),
            rootCause: rootCause ? rootCause.trim() : existing.rootCause,
            status: status || "RCA_IN_PROGRESS"
        }
    });

    logger.info(`Incident ${updated.incidentNumber} RCA updated by ${investigatorName} - Status: ${updated.status}`);
    return updated;
}

/**
 * Closes an investigated clinical incident
 */
async function closeIncident(id, { closedBy, notes }) {
    const existing = await prisma.clinicalIncident.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Clinical incident not found.", 404);
    }

    if (!closedBy) {
        throw new AppError("closedBy official name is required to formally close incident.", 400);
    }

    const updated = await prisma.clinicalIncident.update({
        where: { id },
        data: {
            status: "CLOSED",
            closedAt: new Date(),
            closedBy: closedBy.trim(),
            immediateActionTaken: notes ? `${existing.immediateActionTaken || ""}\n[Closure Note]: ${notes}` : existing.immediateActionTaken
        }
    });

    logger.info(`Incident ${updated.incidentNumber} closed by ${closedBy}`);
    return updated;
}

/**
 * Registers an Infection Prevention & Control (IPC) case with IPC-YYYY-XXXXXX
 */
async function registerIpcCase(data) {
    if (!data.patientMrn || !data.patientName || !data.department || !data.wardOrBed || !data.infectionType) {
        throw new AppError("patientMrn, patientName, department, wardOrBed, and infectionType are required.", 400);
    }

    const caseNumber = await generateIpcCaseNumber();

    const ipcCase = await prisma.infectionControlCase.create({
        data: {
            caseNumber,
            patientMrn: data.patientMrn.trim(),
            patientName: data.patientName.trim(),
            department: data.department.trim(),
            wardOrBed: data.wardOrBed.trim(),
            infectionType: data.infectionType,
            pathogenDetected: data.pathogenDetected ? data.pathogenDetected.trim() : null,
            isolationType: data.isolationType || "CONTACT",
            detectedDate: data.detectedDate ? new Date(data.detectedDate) : new Date(),
            status: "ACTIVE_ISOLATION",
            notifiedPublicHealth: Boolean(data.notifiedPublicHealth),
            notes: data.notes ? data.notes.trim() : null
        }
    });

    logger.info(`IPC Case ${ipcCase.caseNumber} registered: ${ipcCase.patientName} (${ipcCase.infectionType}) in ${ipcCase.wardOrBed} - Isolation: ${ipcCase.isolationType}`);
    return ipcCase;
}

/**
 * Retrieves IPC cases with optional filters
 */
async function getIpcCases(filters = {}) {
    const where = {};
    if (filters.infectionType) where.infectionType = filters.infectionType;
    if (filters.isolationType) where.isolationType = filters.isolationType;
    if (filters.department) where.department = filters.department;
    if (filters.status) where.status = filters.status;

    return prisma.infectionControlCase.findMany({
        where,
        orderBy: { detectedDate: "desc" }
    });
}

/**
 * Formally clears and discharges an IPC isolation case
 */
async function clearIpcCase(id, { clearedBy, notes }) {
    const existing = await prisma.infectionControlCase.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Infection control case not found.", 404);
    }

    if (!clearedBy) {
        throw new AppError("Name of clearing clinician/infection officer (clearedBy) is required.", 400);
    }

    const updated = await prisma.infectionControlCase.update({
        where: { id },
        data: {
            status: "CLEARED_DISCHARGED",
            clearanceDate: new Date(),
            clearedBy: clearedBy.trim(),
            notes: notes ? `${existing.notes || ""}\n[Clearance Note]: ${notes}` : existing.notes
        }
    });

    logger.info(`IPC Case ${updated.caseNumber} for ${updated.patientName} cleared by ${clearedBy}`);
    return updated;
}

/**
 * Records a Clinical Audit with AUD-YYYY-XXXXXX and compliance score
 */
async function createClinicalAudit(data) {
    if (!data.title || !data.auditType || !data.department || !data.leadAuditor || data.complianceScore === undefined) {
        throw new AppError("title, auditType, department, leadAuditor, and complianceScore are required.", 400);
    }

    const score = parseFloat(data.complianceScore);
    if (isNaN(score) || score < 0 || score > 100) {
        throw new AppError("complianceScore must be a number between 0 and 100.", 400);
    }

    const auditNumber = await generateAuditNumber();

    const audit = await prisma.clinicalAudit.create({
        data: {
            auditNumber,
            title: data.title.trim(),
            auditType: data.auditType,
            department: data.department.trim(),
            leadAuditor: data.leadAuditor.trim(),
            auditDate: data.auditDate ? new Date(data.auditDate) : new Date(),
            sampleSize: data.sampleSize ? parseInt(data.sampleSize) : 1,
            complianceScore: score,
            findingsSummary: data.findingsSummary ? data.findingsSummary.trim() : "Audit conducted according to hospital clinical protocol.",
            status: score < 80 ? "CAPA_REQUIRED" : "SUBMITTED"
        }
    });

    logger.info(`Clinical Audit ${audit.auditNumber} completed in ${audit.department}: Score ${audit.complianceScore}% (${audit.status})`);
    return audit;
}

/**
 * Retrieves clinical audits
 */
async function getClinicalAudits(filters = {}) {
    const where = {};
    if (filters.auditType) where.auditType = filters.auditType;
    if (filters.department) where.department = filters.department;
    if (filters.status) where.status = filters.status;

    return prisma.clinicalAudit.findMany({
        where,
        include: { capas: true },
        orderBy: { auditDate: "desc" }
    });
}

/**
 * Creates a Corrective & Preventive Action (CAPA) Plan with CAPA-YYYY-XXXXXX
 */
async function createCapa(data) {
    if (!data.correctiveAction || !data.preventiveAction || !data.responsiblePerson || !data.targetDate) {
        throw new AppError("correctiveAction, preventiveAction, responsiblePerson, and targetDate are required.", 400);
    }

    const capaNumber = await generateCapaNumber();

    const capa = await prisma.correctiveActionPlan.create({
        data: {
            capaNumber,
            incidentId: data.incidentId || null,
            auditId: data.auditId || null,
            rootCauseMethod: data.rootCauseMethod || "FIVE_WHYS",
            rootCauseFindings: data.rootCauseFindings ? data.rootCauseFindings.trim() : "Root cause identified via clinical committee review.",
            correctiveAction: data.correctiveAction.trim(),
            preventiveAction: data.preventiveAction.trim(),
            responsiblePerson: data.responsiblePerson.trim(),
            targetDate: new Date(data.targetDate),
            status: "PENDING_EXECUTION"
        }
    });

    logger.info(`CAPA ${capa.capaNumber} created for ${capa.responsiblePerson} (Target: ${capa.targetDate.toISOString()})`);
    return capa;
}

/**
 * Retrieves CAPA plans
 */
async function getCapaPlans(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.responsiblePerson) where.responsiblePerson = filters.responsiblePerson;
    if (filters.incidentId) where.incidentId = filters.incidentId;
    if (filters.auditId) where.auditId = filters.auditId;

    return prisma.correctiveActionPlan.findMany({
        where,
        include: { incident: true, audit: true },
        orderBy: { createdAt: "desc" }
    });
}

/**
 * Verifies or updates execution of a CAPA plan
 */
async function verifyCapa(id, { verifiedBy, verificationNotes, status }) {
    const existing = await prisma.correctiveActionPlan.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Corrective action plan (CAPA) not found.", 404);
    }

    const finalStatus = status || "VERIFIED_EFFECTIVE";

    const updated = await prisma.correctiveActionPlan.update({
        where: { id },
        data: {
            status: finalStatus,
            completionDate: new Date(),
            verifiedBy: verifiedBy ? verifiedBy.trim() : null,
            verificationNotes: verificationNotes ? verificationNotes.trim() : existing.verificationNotes
        }
    });

    logger.info(`CAPA ${updated.capaNumber} updated to ${updated.status} by ${verifiedBy || "Quality Committee"}`);
    return updated;
}

/**
 * Issues a hospital-wide Patient Safety Alert Bulletin with PSA-YYYY-XXXXXX
 */
async function broadcastSafetyAlert(data) {
    if (!data.title || !data.urgencyLevel || !data.message || !data.actionRequired || !data.issuedBy) {
        throw new AppError("title, urgencyLevel, message, actionRequired, and issuedBy are required.", 400);
    }

    const alertCode = await generateAlertCode();

    const alert = await prisma.patientSafetyAlert.create({
        data: {
            alertCode,
            title: data.title.trim(),
            urgencyLevel: data.urgencyLevel,
            targetAudience: data.targetAudience || "ALL_CLINICAL_STAFF",
            message: data.message.trim(),
            actionRequired: data.actionRequired.trim(),
            broadcastActive: true,
            issuedBy: data.issuedBy.trim(),
            issuedAt: new Date(),
            acknowledgedCount: 0
        }
    });

    logger.warn(`[SAFETY ALERT] ${alert.alertCode} broadcasted: ${alert.title} (${alert.urgencyLevel})`);
    return alert;
}

/**
 * Retrieves safety alerts
 */
async function getSafetyAlerts(filters = {}) {
    const where = {};
    if (filters.activeOnly !== "false") where.broadcastActive = true;
    if (filters.urgencyLevel) where.urgencyLevel = filters.urgencyLevel;

    return prisma.patientSafetyAlert.findMany({
        where,
        orderBy: { issuedAt: "desc" }
    });
}

/**
 * Acknowledges a safety alert by clinical staff
 */
async function acknowledgeSafetyAlert(id) {
    const existing = await prisma.patientSafetyAlert.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Patient safety alert not found.", 404);
    }

    return prisma.patientSafetyAlert.update({
        where: { id },
        data: {
            acknowledgedCount: { increment: 1 }
        }
    });
}

module.exports = {
    getQualityCatalogs,
    getQualityStats,
    reportClinicalIncident,
    getClinicalIncidents,
    investigateIncident,
    closeIncident,
    registerIpcCase,
    getIpcCases,
    clearIpcCase,
    createClinicalAudit,
    getClinicalAudits,
    createCapa,
    getCapaPlans,
    verifyCapa,
    broadcastSafetyAlert,
    getSafetyAlerts,
    acknowledgeSafetyAlert
};
