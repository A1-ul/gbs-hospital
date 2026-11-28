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
const { rcce } = require("../../core/gbs-rcce.bootstrap");

async function getProviders(_req, res, next) {
    try {
        const data = paymentsService.getProvidersSummary();
        return res.rcceSuccess("SUCCESS", data, { httpStatus: 200 });
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
        if (!result.idempotentReplay) {
            rcce.events.publish({
                eventCode: "REQUEST_SUBMITTED",
                domain: "PAYMENTS",
                actorUserId: req.user?.id || null,
                actorRole: req.user?.role || "SYSTEM",
                tenantId: req.user?.hospitalId || null,
                affectedRecord: result.reference || result.id || payload.billId || null,
                severity: "INFO",
                requestId: req.requestId,
                asyncDelivery: true,
                notifications: [
                    {
                        recipientRole: "ACCOUNTANT",
                        title: "Payment Request Initiated",
                        message: `Payment ${result.reference || result.id || ""} initiated (${result.provider || payload.provider || "GATEWAY"}). Awaiting verified settlement.`,
                        severity: "INFO"
                    }
                ]
            }).catch(() => {});
        }
        return res.rcceSuccess(result.idempotentReplay ? "SUCCESS" : "PAYMENT_INITIATED", result, {
            httpStatus: result.idempotentReplay ? 200 : 201,
            message: result.idempotentReplay
                ? "Returned existing idempotent payment request."
                : "Payment request initiated. Awaiting verified provider or finance confirmation."
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
        if (result && (result.settled || result.status === "SUCCESS" || result.status === "PAID")) {
            rcce.events.publish({
                eventCode: "PAYMENT_RECEIVED",
                domain: "PAYMENTS",
                actorRole: "PAYMENT_WEBHOOK",
                affectedRecord: result.reference || provider,
                severity: "INFO",
                requestId: req.requestId,
                asyncDelivery: true,
                notifications: [
                    {
                        recipientRole: "ACCOUNTANT",
                        title: "Gateway Payment Confirmed",
                        message: `${provider} webhook confirmed payment settlement (${result.reference || "ref"}).`,
                        severity: "SUCCESS"
                    }
                ]
            }).catch(() => {});
        }
        return res.rcceSuccess("SUCCESS", result, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function verifyTransaction(req, res, next) {
    try {
        const result = await paymentsService.verifyTransactionStatus(req.params.reference, req.user);
        if (result?.verified) {
            rcce.events.publish({
                eventCode: "PAYMENT_RECEIVED",
                domain: "PAYMENTS",
                actorUserId: req.user?.id || null,
                actorRole: req.user?.role || "SYSTEM",
                tenantId: req.user?.hospitalId || null,
                affectedRecord: req.params.reference,
                severity: "INFO",
                requestId: req.requestId,
                asyncDelivery: true,
                notifications: [
                    {
                        recipientRole: "ACCOUNTANT",
                        title: "Payment Verified & Settled",
                        message: `Transaction ${req.params.reference} verified and settled successfully.`,
                        severity: "SUCCESS"
                    }
                ]
            }).catch(() => {});
        }
        return res.rcceSuccess(result.verified ? "PAYMENT_RECEIVED" : "PENDING_APPROVAL", result, {
            httpStatus: 200,
            message: result.verified
                ? "Payment verified and settled successfully."
                : (result.reason || result.message || "Payment not yet confirmed.")
        });
    } catch (err) {
        next(err);
    }
}

async function cancelTransaction(req, res, next) {
    try {
        const cancelled = await paymentsService.cancelTransaction(req.params.reference, req.body || {}, req.user);
        rcce.events.publish({
            eventCode: "PAYMENT_REJECTED",
            domain: "PAYMENTS",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "SYSTEM",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: req.params.reference,
            severity: "WARNING",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: [
                {
                    recipientRole: "ACCOUNTANT",
                    title: "Pending Payment Cancelled",
                    message: `Pending transaction ${req.params.reference} was cancelled safely.`,
                    severity: "WARNING"
                }
            ]
        }).catch(() => {});
        return res.rcceSuccess("RECORD_UPDATED", cancelled, {
            httpStatus: 200,
            message: "Pending payment cancelled safely."
        });
    } catch (err) {
        next(err);
    }
}

async function listTransactions(req, res, next) {
    try {
        const result = await paymentsService.listTransactions(req.query || {}, req.user);
        return res.rcceSuccess("SUCCESS", result, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function getTransactionByRef(req, res, next) {
    try {
        const tx = await paymentsService.getTransactionByRef(req.params.reference, req.user);
        return res.rcceSuccess("SUCCESS", tx, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function getOfficialReceipt(req, res, next) {
    try {
        const receipt = await paymentsService.getOfficialReceipt(req.params.reference, req.user);
        return res.rcceSuccess("REPORT_GENERATED", receipt, {
            httpStatus: 200,
            message: "Official payment receipt retrieved successfully."
        });
    } catch (err) {
        next(err);
    }
}

async function submitBankDeposit(req, res, next) {
    try {
        const result = await paymentsService.submitBankDepositProof(req.body || {}, req.user);
        rcce.events.publish({
            eventCode: "REQUEST_SUBMITTED",
            domain: "PAYMENTS",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "SYSTEM",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: result?.reference || result?.id || null,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: [
                {
                    recipientRole: "ACCOUNTANT",
                    title: "Bank Deposit Proof Submitted",
                    message: `Bank deposit proof (${result?.reference || result?.id || "deposit"}) is awaiting verification.`,
                    severity: "INFO"
                }
            ]
        }).catch(() => {});
        return res.rcceSuccess("REQUEST_SUBMITTED", result, {
            httpStatus: 201,
            message: "Bank deposit proof recorded as UNDER_REVIEW awaiting authorized Hospital Accountant verification."
        });
    } catch (err) {
        next(err);
    }
}

async function verifyBankDeposit(req, res, next) {
    try {
        const result = await paymentsService.verifyBankDeposit(req.params.id, req.body || {}, req.user);
        rcce.events.publish({
            eventCode: result.rejected ? "PAYMENT_REJECTED" : "PAYMENT_RECEIVED",
            domain: "PAYMENTS",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "SYSTEM",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: req.params.id,
            severity: result.rejected ? "WARNING" : "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: [
                {
                    recipientRole: "ADMIN",
                    title: result.rejected ? "Bank Deposit Rejected" : "Bank Deposit Verified",
                    message: result.rejected
                        ? `Bank deposit ${req.params.id} was marked as rejected.`
                        : `Bank deposit ${req.params.id} verified and settled to hospital bill.`,
                    severity: result.rejected ? "WARNING" : "SUCCESS"
                }
            ]
        }).catch(() => {});
        return res.rcceSuccess(result.rejected ? "REQUEST_REJECTED" : "PAYMENT_RECEIVED", result, {
            httpStatus: 200,
            message: result.rejected
                ? "Bank deposit marked as FAILED / Rejected."
                : "Bank deposit verified and settled to hospital bill."
        });
    } catch (err) {
        next(err);
    }
}

async function refundTransaction(req, res, next) {
    try {
        const result = await paymentsService.refundTransaction(req.params.id, req.body || {}, req.user);
        rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "PAYMENTS",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "SYSTEM",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: req.params.id,
            severity: "WARNING",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: [
                {
                    recipientRole: "ADMIN",
                    title: "Authorized Payment Refund Recorded",
                    message: `Refund processed on transaction ${req.params.id} and bill balances recalculated.`,
                    severity: "WARNING"
                }
            ]
        }).catch(() => {});
        return res.rcceSuccess("PAYMENT_REFUNDED", result, {
            httpStatus: 200,
            message: "Authorized refund recorded and bill balances recalculated."
        });
    } catch (err) {
        next(err);
    }
}

async function getPaymentReports(req, res, next) {
    try {
        const reports = await paymentsService.getPaymentReports(req.query || {}, req.user);
        return res.rcceSuccess("REPORT_GENERATED", reports, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function initiateDeveloperSubscription(req, res, next) {
    try {
        const result = await paymentsService.initiateDeveloperSubscriptionPayment(req.body || {}, req.user);
        rcce.events.publish({
            eventCode: "REQUEST_SUBMITTED",
            domain: "SUBSCRIPTION_PAYMENTS",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "SYSTEM",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: result?.reference || result?.id || null,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: [
                {
                    recipientRole: "DEVELOPER",
                    title: "Subscription Payment Awaiting Confirmation",
                    message: `Hospital subscription payment (${result?.reference || result?.id || "sub"}) submitted to GBS destination 0554594193.`,
                    severity: "INFO"
                }
            ]
        }).catch(() => {});
        return res.rcceSuccess("REQUEST_SUBMITTED", result, {
            httpStatus: 201,
            message: "GBS Developer subscription payment request created (destination: 0554594193). Awaiting Developer verification."
        });
    } catch (err) {
        next(err);
    }
}

async function confirmDeveloperSubscription(req, res, next) {
    try {
        const result = await paymentsService.confirmDeveloperSubscriptionPayment(req.params.id, req.body || {}, req.user);
        rcce.events.publish({
            eventCode: result.rejected ? "PAYMENT_REJECTED" : "PAYMENT_RECEIVED",
            domain: "SUBSCRIPTION_PAYMENTS",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "DEVELOPER",
            affectedRecord: req.params.id,
            severity: result.rejected ? "WARNING" : "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: [
                {
                    recipientRole: "ADMIN",
                    title: result.rejected ? "Subscription Payment Rejected" : "Facility Subscription Activated",
                    message: result.rejected
                        ? `Subscription payment ${req.params.id} was rejected.`
                        : `Subscription payment ${req.params.id} confirmed and hospital subscription activated.`,
                    severity: result.rejected ? "WARNING" : "SUCCESS"
                }
            ]
        }).catch(() => {});
        return res.rcceSuccess(result.rejected ? "REQUEST_REJECTED" : "PAYMENT_RECEIVED", result, {
            httpStatus: 200,
            message: result.rejected
                ? "Subscription payment rejected."
                : "Subscription payment confirmed and hospital tenant subscription activated."
        });
    } catch (err) {
        next(err);
    }
}

async function getDeveloperOverview(req, res, next) {
    try {
        const overview = await paymentsService.getDeveloperPaymentsOverview(req.query || {});
        return res.rcceSuccess("SUCCESS", overview, { httpStatus: 200 });
    } catch (err) {
        next(err);
    }
}

async function getDeveloperWebhooks(req, res, next) {
    try {
        const logs = await paymentsService.getWebhookLogs(req.query || {});
        return res.rcceSuccess("SUCCESS", logs, { httpStatus: 200 });
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
