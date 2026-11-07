"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MORTUARY & DECEASED PATIENT SERVICES - HTTP CONTROLLER
Phase 14 Production Hardened - CommonJS Only
LOCATION: src/modules/mortuary/mortuary.controller.js
====================================================
*/

const mortuaryService = require("./mortuary.service");

class MortuaryController {
    async createChamber(req, res, next) {
        try {
            const chamber = await mortuaryService.createChamber(req.body);
            return res.status(201).json({
                success: true,
                message: "Mortuary cold storage chamber created.",
                data: chamber
            });
        } catch (err) {
            next(err);
        }
    }

    async getChambers(req, res, next) {
        try {
            const chambers = await mortuaryService.getChambers();
            return res.status(200).json({
                success: true,
                count: chambers.length,
                data: chambers
            });
        } catch (err) {
            next(err);
        }
    }

    async updateChamberTemperature(req, res, next) {
        try {
            const { temperature } = req.body;
            const chamber = await mortuaryService.updateChamberTemperature(req.params.id, temperature);
            return res.status(200).json({
                success: true,
                message: "Chamber temperature telemetry updated.",
                data: chamber
            });
        } catch (err) {
            next(err);
        }
    }

    async registerCorpseIntake(req, res, next) {
        try {
            const corpse = await mortuaryService.registerCorpseIntake(req.body);
            return res.status(201).json({
                success: true,
                message: "Corpse admitted and cataloged in cold storage.",
                data: corpse
            });
        } catch (err) {
            next(err);
        }
    }

    async getCorpseInventory(req, res, next) {
        try {
            const inventory = await mortuaryService.getCorpseInventory(req.query);
            return res.status(200).json({
                success: true,
                count: inventory.length,
                data: inventory
            });
        } catch (err) {
            next(err);
        }
    }

    async getCorpseById(req, res, next) {
        try {
            const corpse = await mortuaryService.getCorpseById(req.params.id);
            return res.status(200).json({
                success: true,
                data: corpse
            });
        } catch (err) {
            next(err);
        }
    }

    async scheduleAutopsy(req, res, next) {
        try {
            const autopsy = await mortuaryService.scheduleAutopsy(req.body);
            return res.status(201).json({
                success: true,
                message: "Autopsy examination scheduled.",
                data: autopsy
            });
        } catch (err) {
            next(err);
        }
    }

    async completeAutopsy(req, res, next) {
        try {
            const completed = await mortuaryService.completeAutopsy(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: "Post-mortem examination completed and findings recorded.",
                data: completed
            });
        } catch (err) {
            next(err);
        }
    }

    async releaseCorpse(req, res, next) {
        try {
            const release = await mortuaryService.releaseCorpse(req.body);
            return res.status(201).json({
                success: true,
                message: "Deceased release clearance authorized and handed over to family.",
                data: release
            });
        } catch (err) {
            next(err);
        }
    }

    async getTelemetry(req, res, next) {
        try {
            const telemetry = await mortuaryService.getMortuaryTelemetry();
            return res.status(200).json({
                success: true,
                data: telemetry
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new MortuaryController();
