"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BILLING & FINANCIAL CONTROLLER
HTTP Request Handling for Invoicing, Payments & Claims
LOCATION: src/modules/billing/controllers/billing.controller.js
====================================================
*/

const billingService = require("../services/billing.service");

async function createBill(req, res, next) {
    try {
        const result = await billingService.createBill(req.body, req.user);
        res.status(201).json({
            success: true,
            message: "Patient medical invoice generated successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function generateBillFromEncounter(req, res, next) {
    try {
        const result = await billingService.generateBillFromEncounter(
            req.params.encounterId,
            req.body,
            req.user
        );
        res.status(201).json({
            success: true,
            message: "Comprehensive clinical encounter invoice compiled successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getBills(req, res, next) {
    try {
        const result = await billingService.getBills(req.query);
        res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getBillById(req, res, next) {
    try {
        const result = await billingService.getBillById(req.params.id);
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function processPayment(req, res, next) {
    try {
        const paymentPayload = {
            ...req.body,
            billId: req.params.id || req.body.billId
        };
        const result = await billingService.processPayment(paymentPayload, req.user);
        res.status(201).json({
            success: true,
            message: "Payment processed and official receipt issued successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function createInsuranceClaim(req, res, next) {
    try {
        const result = await billingService.createInsuranceClaim(req.body, req.user);
        res.status(201).json({
            success: true,
            message: "Insurance / NHIS claim generated and submitted successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function updateClaimStatus(req, res, next) {
    try {
        const result = await billingService.updateClaimStatus(req.params.id, req.body, req.user);
        res.status(200).json({
            success: true,
            message: "Insurance claim adjudication status updated successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getBillingDashboardTelemetry(req, res, next) {
    try {
        const result = await billingService.getBillingDashboardTelemetry();
        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function seedBillingTariffCatalog(req, res, next) {
    try {
        const result = await billingService.seedBillingTariffCatalog();
        res.status(200).json({
            success: true,
            message: "Billing tariff fee schedule seeded successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createBill,
    generateBillFromEncounter,
    getBills,
    getBillById,
    processPayment,
    createInsuranceClaim,
    updateClaimStatus,
    getBillingDashboardTelemetry,
    seedBillingTariffCatalog
};
