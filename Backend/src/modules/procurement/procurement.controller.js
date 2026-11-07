"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PROCUREMENT & SUPPLY CHAIN - CONTROLLER
Phase 16 Production Hardened - CommonJS Only
LOCATION: src/modules/procurement/procurement.controller.js
====================================================
*/

const procurementService = require("./procurement.service");

class ProcurementController {
    async getCatalogs(req, res, next) {
        try {
            const catalogs = await procurementService.getProcurementCatalogs();
            return res.status(200).json({
                success: true,
                data: catalogs
            });
        } catch (error) {
            next(error);
        }
    }

    async getProcurementStats(req, res, next) {
        try {
            const stats = await procurementService.getProcurementStats();
            return res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            next(error);
        }
    }

    async registerVendor(req, res, next) {
        try {
            const vendor = await procurementService.registerVendor(req.body);
            return res.status(201).json({
                success: true,
                message: `Vendor ${vendor.name} registered with code ${vendor.vendorCode}.`,
                data: vendor
            });
        } catch (error) {
            next(error);
        }
    }

    async getVendors(req, res, next) {
        try {
            const vendors = await procurementService.getVendors(req.query);
            return res.status(200).json({
                success: true,
                count: vendors.length,
                data: vendors
            });
        } catch (error) {
            next(error);
        }
    }

    async getVendorById(req, res, next) {
        try {
            const vendor = await procurementService.getVendorById(req.params.id);
            return res.status(200).json({
                success: true,
                data: vendor
            });
        } catch (error) {
            next(error);
        }
    }

    async updateVendor(req, res, next) {
        try {
            const updated = await procurementService.updateVendor(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: `Vendor ${updated.vendorCode} updated successfully.`,
                data: updated
            });
        } catch (error) {
            next(error);
        }
    }

    async registerVendorContract(req, res, next) {
        try {
            const contract = await procurementService.registerVendorContract(req.body);
            return res.status(201).json({
                success: true,
                message: `Contract ${contract.contractNumber} registered for vendor ${contract.vendor ? contract.vendor.name : ""}.`,
                data: contract
            });
        } catch (error) {
            next(error);
        }
    }

    async getVendorContracts(req, res, next) {
        try {
            const contracts = await procurementService.getVendorContracts(req.query);
            return res.status(200).json({
                success: true,
                count: contracts.length,
                data: contracts
            });
        } catch (error) {
            next(error);
        }
    }

    async createPurchaseOrder(req, res, next) {
        try {
            const po = await procurementService.createPurchaseOrder(req.body);
            return res.status(201).json({
                success: true,
                message: `Purchase Order ${po.poNumber} created successfully. Total: ${po.totalAmount} ${po.currency}.`,
                data: po
            });
        } catch (error) {
            next(error);
        }
    }

    async getPurchaseOrders(req, res, next) {
        try {
            const orders = await procurementService.getPurchaseOrders(req.query);
            return res.status(200).json({
                success: true,
                count: orders.length,
                data: orders
            });
        } catch (error) {
            next(error);
        }
    }

    async getPurchaseOrderById(req, res, next) {
        try {
            const po = await procurementService.getPurchaseOrderById(req.params.id);
            return res.status(200).json({
                success: true,
                data: po
            });
        } catch (error) {
            next(error);
        }
    }

    async updatePurchaseOrderStatus(req, res, next) {
        try {
            const updated = await procurementService.updatePurchaseOrderStatus(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: `Purchase Order ${updated.poNumber} transitioned to ${updated.status}.`,
                data: updated
            });
        } catch (error) {
            next(error);
        }
    }

    async createGoodsReceiptNote(req, res, next) {
        try {
            const grn = await procurementService.createGoodsReceiptNote(req.body);
            return res.status(201).json({
                success: true,
                message: `Goods Receipt Note ${grn.grnNumber} generated successfully.`,
                data: grn
            });
        } catch (error) {
            next(error);
        }
    }

    async getGoodsReceiptNotes(req, res, next) {
        try {
            const grns = await procurementService.getGoodsReceiptNotes(req.query);
            return res.status(200).json({
                success: true,
                count: grns.length,
                data: grns
            });
        } catch (error) {
            next(error);
        }
    }

    async getGoodsReceiptNoteById(req, res, next) {
        try {
            const grn = await procurementService.getGoodsReceiptNoteById(req.params.id);
            return res.status(200).json({
                success: true,
                data: grn
            });
        } catch (error) {
            next(error);
        }
    }

    async verifyThreeWayMatch(req, res, next) {
        try {
            const result = await procurementService.verifyThreeWayMatch(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: result.matchEvaluation.notes,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async completeGrnInspection(req, res, next) {
        try {
            const updated = await procurementService.completeGrnInspection(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: `GRN ${updated.grnNumber} inspection completed with ${updated.inspectionStatus}.`,
                data: updated
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ProcurementController();
