"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BLOOD BANK & TRANSFUSION SERVICES - HTTP CONTROLLER
Phase 13 Production Hardened - CommonJS Only
LOCATION: src/modules/blood-bank/blood-bank.controller.js
====================================================
*/

const bloodBankService = require("./blood-bank.service");

class BloodBankController {
    async registerDonor(req, res, next) {
        try {
            const donor = await bloodBankService.registerDonor(req.body);
            return res.status(201).json({
                success: true,
                message: "Blood donor registered successfully.",
                data: donor
            });
        } catch (err) {
            next(err);
        }
    }

    async getDonors(req, res, next) {
        try {
            const donors = await bloodBankService.getDonors(req.query);
            return res.status(200).json({
                success: true,
                count: donors.length,
                data: donors
            });
        } catch (err) {
            next(err);
        }
    }

    async getDonorById(req, res, next) {
        try {
            const donor = await bloodBankService.getDonorById(req.params.id);
            return res.status(200).json({
                success: true,
                data: donor
            });
        } catch (err) {
            next(err);
        }
    }

    async collectBloodUnit(req, res, next) {
        try {
            const unit = await bloodBankService.collectBloodUnit(req.body);
            return res.status(201).json({
                success: true,
                message: "Blood bag collected and stored in quarantine successfully.",
                data: unit
            });
        } catch (err) {
            next(err);
        }
    }

    async getInventory(req, res, next) {
        try {
            const inventory = await bloodBankService.getInventory(req.query);
            return res.status(200).json({
                success: true,
                count: inventory.length,
                data: inventory
            });
        } catch (err) {
            next(err);
        }
    }

    async recordScreeningResults(req, res, next) {
        try {
            const unit = await bloodBankService.recordScreeningResults(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: "TTI pathogen screening results recorded.",
                data: unit
            });
        } catch (err) {
            next(err);
        }
    }

    async updateStorageTemperature(req, res, next) {
        try {
            const { temperature } = req.body;
            const unit = await bloodBankService.updateStorageTemperature(req.params.id, temperature);
            return res.status(200).json({
                success: true,
                message: "Cold-chain temperature telemetry updated.",
                data: unit
            });
        } catch (err) {
            next(err);
        }
    }

    async createTransfusionRequest(req, res, next) {
        try {
            const { rcce } = require("../../core/gbs-rcce.bootstrap");
            const request = await bloodBankService.createTransfusionRequest(req.body);
            try {
                await rcce.events.publish({
                    eventCode: "REQUEST_SUBMITTED",
                    domain: "BLOOD_BANK",
                    actorUserId: req.user?.id,
                    actorRole: req.user?.role,
                    affectedRecord: request.requestNumber || request.id,
                    severity: request.urgencyLevel === "EMERGENCY_STAT_UNMATCHED" ? "CRITICAL" : "WARNING",
                    requestId: req.requestId,
                    notifications: [
                        {
                            recipientRole: "LAB_TECHNICIAN",
                            title: "Blood Transfusion Cross-Match Ordered",
                            message: `Transfusion request ${request.requestNumber || request.id} submitted (${request.patientBloodGroup || "Group Check"}).`,
                            severity: "WARNING"
                        }
                    ]
                });
            } catch (_pubErr) { }
            return res.rcceSuccess("REQUEST_SUBMITTED", request, {
                httpStatus: 201,
                message: "Blood transfusion request submitted."
            });
        } catch (err) {
            next(err);
        }
    }

    async getTransfusionRequests(req, res, next) {
        try {
            const requests = await bloodBankService.getTransfusionRequests(req.query);
            return res.status(200).json({
                success: true,
                count: requests.length,
                data: requests
            });
        } catch (err) {
            next(err);
        }
    }

    async performCrossMatch(req, res, next) {
        try {
            const crossMatch = await bloodBankService.performCrossMatch(req.body);
            return res.status(201).json({
                success: true,
                message: crossMatch.isCompatible
                    ? "Cross-match test compatible. Unit reserved."
                    : "Cross-match test INCOMPATIBLE. Agglutination detected.",
                data: crossMatch
            });
        } catch (err) {
            next(err);
        }
    }

    async startTransfusion(req, res, next) {
        try {
            const transfusion = await bloodBankService.startTransfusion(req.body);
            return res.status(201).json({
                success: true,
                message: "Dual-check verified. Transfusion started.",
                data: transfusion
            });
        } catch (err) {
            next(err);
        }
    }

    async completeTransfusion(req, res, next) {
        try {
            const completed = await bloodBankService.completeTransfusion(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: "Transfusion completed successfully.",
                data: completed
            });
        } catch (err) {
            next(err);
        }
    }

    async recordAdverseReaction(req, res, next) {
        try {
            const { rcce } = require("../../core/gbs-rcce.bootstrap");
            const reaction = await bloodBankService.recordAdverseReaction(req.params.id, req.body);
            try {
                await rcce.events.publish({
                    eventCode: "SYSTEM_ERROR_DETECTED",
                    domain: "BLOOD_BANK",
                    actorUserId: req.user?.id,
                    actorRole: req.user?.role,
                    affectedRecord: req.params.id,
                    severity: "CRITICAL",
                    requestId: req.requestId,
                    notifications: [
                        {
                            recipientRole: "DOCTOR",
                            title: "Hemovigilance Adverse Transfusion Reaction",
                            message: `Adverse reaction recorded for transfusion ${req.params.id}.`,
                            severity: "ERROR"
                        },
                        {
                            recipientRole: "ADMINISTRATOR",
                            title: "Critical Transfusion Reaction Alert",
                            message: `Hemovigilance alert active for transfusion ${req.params.id}.`,
                            severity: "ERROR"
                        }
                    ]
                });
            } catch (_pubErr) { }
            return res.rcceSuccess("RECORD_UPDATED", reaction, {
                httpStatus: 200,
                message: "Adverse reaction logged. Hemovigilance investigation active."
            });
        } catch (err) {
            next(err);
        }
    }

    async getTelemetry(req, res, next) {
        try {
            const telemetry = await bloodBankService.getBloodBankTelemetry();
            return res.status(200).json({
                success: true,
                data: telemetry
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new BloodBankController();
