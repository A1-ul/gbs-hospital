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
const AppError = require("../../../core/errors/app.error");
const { rcce } = require("../../../core/gbs-rcce.bootstrap");

async function createBill(req, res, next) {
    try {
        const result = await billingService.createBill(req.body, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "BILLING",
            actorUserId: req.user?.id,
            actorRole: req.user?.role,
            tenantId: req.user?.hospitalId,
            affectedRecord: result.billNumber || result.id,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: [
                {
                    recipientRole: "ACCOUNTANT",
                    title: "New Patient Invoice Issued",
                    message: `Invoice ${result.billNumber || result.id} created (GH₵${Number(result.patientPayableAmount || result.grossAmount || 0).toFixed(2)}).`,
                    severity: "INFO"
                }
            ]
        }).catch(() => { });

        return res.rcceSuccess("INVOICE_CREATED", result, { httpStatus: 201 });
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
        const check = rcce.rules.requirePositiveNumber(paymentPayload, "amount", "Payment amount");
        if (!check.valid) {
            rcce.events.publish({
                eventCode: "PAYMENT_REJECTED",
                domain: "BILLING",
                actorUserId: req.user?.id,
                actorRole: req.user?.role,
                affectedRecord: paymentPayload.billId || "UNKNOWN_BILL",
                severity: "WARNING",
                requestId: req.requestId,
                notifications: [
                    {
                        recipientRole: "ACCOUNTANT",
                        title: "Payment Rejected",
                        message: check.message,
                        severity: "WARNING"
                    }
                ]
            }).catch(() => { });
            throw new AppError(check.message, 400, "PAYMENT_REJECTED", check.errors);
        }

        const result = await billingService.processPayment(paymentPayload, req.user);

        try {
            await rcce.events.publish({
                eventCode: "PAYMENT_RECEIVED",
                domain: "BILLING",
                actorUserId: req.user?.id,
                actorRole: req.user?.role,
                tenantId: req.user?.hospitalId,
                affectedRecord: result.receiptNumber || result.id || paymentPayload.billId,
                severity: "INFO",
                requestId: req.requestId,
                notifications: [
                    {
                        recipientRole: "ACCOUNTANT",
                        title: "Payment Received",
                        message: `Payment of GH₵${Number(paymentPayload.amount).toFixed(2)} received successfully.`,
                        severity: "SUCCESS"
                    },
                    {
                        recipientRole: "ADMIN",
                        title: "Hospital Revenue Recorded",
                        message: `Payment GH₵${Number(paymentPayload.amount).toFixed(2)} confirmed on bill ${paymentPayload.billId}.`,
                        severity: "INFO"
                    }
                ]
            });
        } catch (_pubErr) { }

        return res.rcceSuccess("PAYMENT_RECEIVED", result, {
            httpStatus: 201,
            message: "Payment received successfully."
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

async function recordFinancialLedgerEntry(req, res, next) {
    try {
        const result = await billingService.recordFinancialLedgerEntry(req.body, req.user);
        res.status(201).json({
            success: true,
            message: "Financial general ledger entry recorded successfully",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
}

async function getAnnualFinancialReport(req, res, next) {
    try {
        const result = await billingService.getAnnualFinancialReport(req.query.year);
        res.status(200).json({
            success: true,
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
    seedBillingTariffCatalog,
    recordFinancialLedgerEntry,
    getAnnualFinancialReport
};
