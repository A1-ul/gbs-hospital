"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PAYMENT GATEWAY ADAPTER (PAYSTACK / STRIPE — TRUTHFUL NO-MOCK ADAPTER)
CommonJS Only
LOCATION: Backend/src/core/integration/payment-gateway.adapter.js
================================================================================
Supports real Paystack transaction verification & HMAC-SHA512 webhook signature
verification, plus Stripe configuration detection. Truthfully reports
MANUAL_RECEIPT_MODE when external keys are absent.
*/

const crypto = require("crypto");

function getPaymentGatewayStatus() {
    const paystackConfigured = Boolean(String(process.env.PAYSTACK_SECRET_KEY || "").trim());
    const stripeConfigured = Boolean(String(process.env.STRIPE_SECRET_KEY || "").trim());
    const configured = paystackConfigured || stripeConfigured;
    const providers = [
        paystackConfigured ? "Paystack" : null,
        stripeConfigured ? "Stripe" : null
    ].filter(Boolean);

    return {
        key: "PAYMENT_GATEWAY",
        name: "Online Card / MoMo Gateway (Paystack / Stripe)",
        configured,
        status: configured ? "CONFIGURED" : "MANUAL_RECEIPT_MODE",
        providers,
        detail: configured
            ? `Live gateway keys detected (${providers.join(", ")})`
            : "No external gateway secret key configured; hospital cashier & verified reference settlement active."
    };
}

/**
 * Cryptographic Paystack Webhook Signature Verification (HMAC-SHA512)
 */
function verifyPaystackWebhookSignature(rawBody, signatureHeader, secretKeyOverride = null) {
    const secret = String(secretKeyOverride || process.env.PAYSTACK_SECRET_KEY || "").trim();
    if (!secret || !signatureHeader || rawBody === undefined || rawBody === null) {
        return false;
    }
    const payload = typeof rawBody === "string" || Buffer.isBuffer(rawBody)
        ? rawBody
        : JSON.stringify(rawBody);
    const expected = crypto.createHmac("sha512", secret).update(payload).digest("hex");
    const sigBuf = Buffer.from(String(signatureHeader).trim(), "utf8");
    const expBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expBuf.length) {
        return false;
    }
    return crypto.timingSafeEqual(sigBuf, expBuf);
}

/**
 * Live Paystack Transaction Verification API call (when PAYSTACK_SECRET_KEY is configured)
 */
async function verifyPaystackTransaction(reference) {
    const secret = String(process.env.PAYSTACK_SECRET_KEY || "").trim();
    if (!secret) {
        return {
            verified: false,
            status: "MANUAL_RECEIPT_MODE",
            reference: reference || null,
            reason: "PAYSTACK_SECRET_KEY not configured; verify transaction manually via hospital cashier desk."
        };
    }

    if (!reference) {
        return {
            verified: false,
            status: "INVALID_REFERENCE",
            reason: "Transaction reference is required."
        };
    }

    try {
        const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${secret}`,
                Accept: "application/json"
            }
        });
        const payload = await res.json();
        const txStatus = payload?.data?.status || "unknown";
        return {
            verified: Boolean(res.ok && payload?.status === true && txStatus === "success"),
            status: txStatus.toUpperCase(),
            reference,
            amountMinorUnits: payload?.data?.amount || 0,
            currency: payload?.data?.currency || "GHS",
            channel: payload?.data?.channel || null
        };
    } catch (err) {
        return {
            verified: false,
            status: "VERIFICATION_ERROR",
            reference,
            reason: err.message
        };
    }
}

module.exports = {
    getPaymentGatewayStatus,
    verifyPaystackWebhookSignature,
    verifyPaystackTransaction
};
