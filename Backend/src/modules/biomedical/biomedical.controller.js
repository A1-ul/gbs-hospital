"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BIOMEDICAL ENGINEERING - CONTROLLER
Phase 15 Production Hardened - CommonJS Only
LOCATION: src/modules/biomedical/biomedical.controller.js
====================================================
*/

const biomedicalService = require("./biomedical.service");
const {
    EQUIPMENT_CATEGORIES,
    RISK_LEVELS,
    WORK_ORDER_TYPES,
    WORK_ORDER_PRIORITIES,
    WORK_ORDER_STATUSES,
    ELECTRICAL_SAFETY_LIMITS
} = require("./helpers/biomedical-catalogs");

class BiomedicalController {
    async getCatalogs(req, res, next) {
        try {
            return res.status(200).json({
                success: true,
                data: {
                    categories: EQUIPMENT_CATEGORIES,
                    riskLevels: RISK_LEVELS,
                    workOrderTypes: WORK_ORDER_TYPES,
                    workOrderPriorities: WORK_ORDER_PRIORITIES,
                    workOrderStatuses: WORK_ORDER_STATUSES,
                    electricalSafetyLimits: ELECTRICAL_SAFETY_LIMITS
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async registerEquipment(req, res, next) {
        try {
            const equipment = await biomedicalService.registerEquipment(req.body);
            return res.status(201).json({
                success: true,
                message: `Equipment ${equipment.name} registered under asset tag ${equipment.assetTag}.`,
                data: equipment
            });
        } catch (error) {
            next(error);
        }
    }

    async getEquipmentList(req, res, next) {
        try {
            const equipment = await biomedicalService.getEquipmentList(req.query);
            return res.status(200).json({
                success: true,
                count: equipment.length,
                data: equipment
            });
        } catch (error) {
            next(error);
        }
    }

    async getEquipmentById(req, res, next) {
        try {
            const equipment = await biomedicalService.getEquipmentById(req.params.id);
            return res.status(200).json({
                success: true,
                data: equipment
            });
        } catch (error) {
            next(error);
        }
    }

    async updateEquipmentStatus(req, res, next) {
        try {
            const updated = await biomedicalService.updateEquipmentStatus(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: `Equipment status updated to ${updated.status}.`,
                data: updated
            });
        } catch (error) {
            next(error);
        }
    }

    async recordSafetyOverride(req, res, next) {
        try {
            const updated = await biomedicalService.recordSafetyOverride(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: "Emergency clinical safety override logged with audit co-signature.",
                data: updated
            });
        } catch (error) {
            next(error);
        }
    }

    async createWorkOrder(req, res, next) {
        try {
            const workOrder = await biomedicalService.createWorkOrder(req.body);
            return res.status(201).json({
                success: true,
                message: `Work Order ${workOrder.workOrderNumber} created successfully.`,
                data: workOrder
            });
        } catch (error) {
            next(error);
        }
    }

    async getWorkOrders(req, res, next) {
        try {
            const workOrders = await biomedicalService.getWorkOrders(req.query);
            return res.status(200).json({
                success: true,
                count: workOrders.length,
                data: workOrders
            });
        } catch (error) {
            next(error);
        }
    }

    async updateWorkOrder(req, res, next) {
        try {
            const updated = await biomedicalService.updateWorkOrder(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: `Work Order ${updated.workOrderNumber} updated.`,
                data: updated
            });
        } catch (error) {
            next(error);
        }
    }

    async completeWorkOrder(req, res, next) {
        try {
            const completed = await biomedicalService.completeWorkOrder(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: `Work Order ${completed.workOrderNumber} completed, QA verified and equipment returned to service.`,
                data: completed
            });
        } catch (error) {
            next(error);
        }
    }

    async recordCalibration(req, res, next) {
        try {
            const cert = await biomedicalService.recordCalibration(req.body);
            return res.status(201).json({
                success: true,
                message: `Calibration certificate ${cert.certificateNumber} issued with ${cert.calibrationResult} outcome.`,
                data: cert
            });
        } catch (error) {
            next(error);
        }
    }

    async getBiomedicalStats(req, res, next) {
        try {
            const stats = await biomedicalService.getBiomedicalStats();
            return res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new BiomedicalController();
