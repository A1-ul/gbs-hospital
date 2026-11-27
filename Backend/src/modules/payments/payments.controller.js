"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
CENTRAL MULTI-GATEWAY PAYMENTS CONTROLLER
CommonJS Only
LOCATION: Backend/src/modules/payments/payments.controller.js
================================================================================
*/

const paymentsService = require("./payments.service");

async function getProviders(_req, res, next) {
    try {
        const data = paymentsService.getProvidersSummary();
        return res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
}

async function initiatePayment(req, res, next) {
    try {
        const headerIdempotencyKey = req.headers["x-idempotency-key"] || req.headers["idempotency-key"] || null;
        const payload = {
            ...(req.body || {}),
            idempotencyKey: req.body?.idempotencyKey || headerIdempotencyKey || undefined
        };
        const result = await paymentsService.initiatePayment(payload, req.user);
        return res.status(result.idempotentReplay ? 200 : 201).json({
            success: true,
            message: result.idempotentReplay
                ? "Returned existing idempotent payment request."
                : "Payment request initiated. Awaiting verified provider or finance confirmation.",
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function handleWebhook(req, res, next) {
    try {
        const provider = String(req.params.provider || "").trim().toUpperCase();
        const signatureHeader =
            req.headers["x-paystack-signature"] ||
            req.headers["x-hubtel-signature"] ||
            req.headers["x-webhook-signature"] ||
            "";
        const rawBody = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body || {});
        const result = await paymentsService.processPaymentWebhook({
            provider,
            rawBody,
            parsedBody: req.body || {},
            signatureHeader
        });
        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function verifyTransaction(req, res, next) {
    try {
        const result = await paymentsService.verifyTransactionStatus(req.params.reference, req.user);
        return res.status(200).json({
            success: true,
            message: result.verified
                ? "Payment verified and settled successfully."
                : (result.reason || result.message || "Payment not yet confirmed."),
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function cancelTransaction(req, res, next) {
    try {
        const cancelled = await paymentsService.cancelTransaction(req.params.reference, req.body || {}, req.user);
        return res.status(200).json({
            success: true,
            message: "Pending payment cancelled safely.",
            data: cancelled
        });
    } catch (err) {
        next(err);
    }
}

async function listTransactions(req, res, next) {
    try {
        const result = await paymentsService.listTransactions(req.query || {}, req.user);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

async function getTransactionByRef(req, res, next) {
    try {
        const tx = await paymentsService.getTransactionByRef(req.params.reference, req.user);
        return res.status(200).json({ success: true, data: tx });
    } catch (err) {
        next(err);
    }
}

async function getOfficialReceipt(req, res, next) {
    try {
        const receipt = await paymentsService.getOfficialReceipt(req.params.reference, req.user);
        return res.status(200).json({ success: true, data: receipt });
    } catch (err) {
        next(err);
    }
}

async function submitBankDeposit(req, res, next) {
    try {
        const result = await paymentsService.submitBankDepositProof(req.body || {}, req.user);
        return res.status(201).json({
            success: true,
            message: "Bank deposit proof recorded as UNDER_REVIEW awaiting authorized Hospital Accountant verification.",
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function verifyBankDeposit(req, res, next) {
    try {
        const result = await paymentsService.verifyBankDeposit(req.params.id, req.body || {}, req.user);
        return res.status(200).json({
            success: true,
            message: result.rejected
                ? "Bank deposit marked as FAILED / Rejected."
                : "Bank deposit verified and settled to hospital bill.",
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function refundTransaction(req, res, next) {
    try {
        const result = await paymentsService.refundTransaction(req.params.id, req.body || {}, req.user);
        return res.status(200).json({
            success: true,
            message: "Authorized refund recorded and bill balances recalculated.",
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function getPaymentReports(req, res, next) {
    try {
        const reports = await paymentsService.getPaymentReports(req.query || {}, req.user);
        return res.status(200).json({ success: true, data: reports });
    } catch (err) {
        next(err);
    }
}

async function initiateDeveloperSubscription(req, res, next) {
    try {
        const result = await paymentsService.initiateDeveloperSubscriptionPayment(req.body || {}, req.user);
        return res.status(201).json({
            success: true,
            message: "GBS Developer subscription payment request created (destination: 0554594193). Awaiting Developer verification.",
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function confirmDeveloperSubscription(req, res, next) {
    try {
        const result = await paymentsService.confirmDeveloperSubscriptionPayment(req.params.id, req.body || {}, req.user);
        return res.status(200).json({
            success: true,
            message: result.rejected
                ? "Subscription payment rejected."
                : "Subscription payment confirmed and hospital tenant subscription activated.",
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function getDeveloperOverview(req, res, next) {
    try {
        const overview = await paymentsService.getDeveloperPaymentsOverview(req.query || {});
        return res.status(200).json({ success: true, data: overview });
    } catch (err) {
        next(err);
    }
}

async function getDeveloperWebhooks(req, res, next) {
    try {
        const logs = await paymentsService.getWebhookLogs(req.query || {});
        return res.status(200).json({ success: true, data: logs });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getProviders,
    initiatePayment,
    handleWebhook,
    verifyTransaction,
    cancelTransaction,
    listTransactions,
    getTransactionByRef,
    getOfficialReceipt,
    submitBankDeposit,
    verifyBankDeposit,
    refundTransaction,
    getPaymentReports,
    initiateDeveloperSubscription,
    confirmDeveloperSubscription,
    getDeveloperOverview,
    getDeveloperWebhooks
};
