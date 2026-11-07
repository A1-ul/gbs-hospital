"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
QUALITY ASSURANCE & CLINICAL SAFETY - CONTROLLER
Phase 18 Production Hardened - CommonJS Only
LOCATION: src/modules/quality/quality.controller.js
====================================================
*/

const qualityService = require("./quality.service");

class QualityController {
    async getCatalogs(req, res, next) {
        try {
            const catalogs = await qualityService.getQualityCatalogs();
            return res.status(200).json({
                success: true,
                data: catalogs
            });
        } catch (error) {
            next(error);
        }
    }

    async getQualityStats(req, res, next) {
        try {
            const stats = await qualityService.getQualityStats();
            return res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            next(error);
        }
    }

    async reportIncident(req, res, next) {
        try {
            const incident = await qualityService.reportClinicalIncident(req.body);
            return res.status(201).json({
                success: true,
                message: `Clinical incident ${incident.incidentNumber} reported successfully.`,
                data: incident
            });
        } catch (error) {
            next(error);
        }
    }

    async getIncidents(req, res, next) {
        try {
            const incidents = await qualityService.getClinicalIncidents(req.query);
            return res.status(200).json({
                success: true,
                count: incidents.length,
                data: incidents
            });
        } catch (error) {
            next(error);
        }
    }

    async investigateIncident(req, res, next) {
        try {
            const incident = await qualityService.investigateIncident(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: `Incident ${incident.incidentNumber} RCA investigation updated.`,
                data: incident
            });
        } catch (error) {
            next(error);
        }
    }

    async closeIncident(req, res, next) {
        try {
            const incident = await qualityService.closeIncident(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: `Incident ${incident.incidentNumber} formally closed by ${incident.closedBy}.`,
                data: incident
            });
        } catch (error) {
            next(error);
        }
    }

    async registerIpcCase(req, res, next) {
        try {
            const ipcCase = await qualityService.registerIpcCase(req.body);
            return res.status(201).json({
                success: true,
                message: `Infection control case ${ipcCase.caseNumber} registered for ${ipcCase.patientName}.`,
                data: ipcCase
            });
        } catch (error) {
            next(error);
        }
    }

    async getIpcCases(req, res, next) {
        try {
            const cases = await qualityService.getIpcCases(req.query);
            return res.status(200).json({
                success: true,
                count: cases.length,
                data: cases
            });
        } catch (error) {
            next(error);
        }
    }

    async clearIpcCase(req, res, next) {
        try {
            const cleared = await qualityService.clearIpcCase(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: `Infection control case ${cleared.caseNumber} cleared and discharged by ${cleared.clearedBy}.`,
                data: cleared
            });
        } catch (error) {
            next(error);
        }
    }

    async createClinicalAudit(req, res, next) {
        try {
            const audit = await qualityService.createClinicalAudit(req.body);
            return res.status(201).json({
                success: true,
                message: `Clinical audit ${audit.auditNumber} completed with score ${audit.complianceScore}%.`,
                data: audit
            });
        } catch (error) {
            next(error);
        }
    }

    async getClinicalAudits(req, res, next) {
        try {
            const audits = await qualityService.getClinicalAudits(req.query);
            return res.status(200).json({
                success: true,
                count: audits.length,
                data: audits
            });
        } catch (error) {
            next(error);
        }
    }

    async createCapa(req, res, next) {
        try {
            const capa = await qualityService.createCapa(req.body);
            return res.status(201).json({
                success: true,
                message: `Corrective action plan ${capa.capaNumber} established.`,
                data: capa
            });
        } catch (error) {
            next(error);
        }
    }

    async getCapaPlans(req, res, next) {
        try {
            const plans = await qualityService.getCapaPlans(req.query);
            return res.status(200).json({
                success: true,
                count: plans.length,
                data: plans
            });
        } catch (error) {
            next(error);
        }
    }

    async verifyCapa(req, res, next) {
        try {
            const capa = await qualityService.verifyCapa(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: `CAPA ${capa.capaNumber} updated to ${capa.status}.`,
                data: capa
            });
        } catch (error) {
            next(error);
        }
    }

    async broadcastSafetyAlert(req, res, next) {
        try {
            const alert = await qualityService.broadcastSafetyAlert(req.body);
            return res.status(201).json({
                success: true,
                message: `Patient safety alert ${alert.alertCode} broadcasted.`,
                data: alert
            });
        } catch (error) {
            next(error);
        }
    }

    async getSafetyAlerts(req, res, next) {
        try {
            const alerts = await qualityService.getSafetyAlerts(req.query);
            return res.status(200).json({
                success: true,
                count: alerts.length,
                data: alerts
            });
        } catch (error) {
            next(error);
        }
    }

    async acknowledgeSafetyAlert(req, res, next) {
        try {
            const alert = await qualityService.acknowledgeSafetyAlert(req.params.id);
            return res.status(200).json({
                success: true,
                message: `Alert ${alert.alertCode} acknowledged.`,
                data: alert
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new QualityController();
