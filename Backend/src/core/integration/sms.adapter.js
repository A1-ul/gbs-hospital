"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
OUTBOUND SMS GATEWAY ADAPTER (TRUTHFUL NO-MOCK PRODUCTION ADAPTER)
CommonJS Only
LOCATION: Backend/src/core/integration/sms.adapter.js
================================================================================
Supports configured HTTP REST SMS providers (Hubtel, Arkesel, Twilio-compatible
webhook URLs) via SMS_PROVIDER, SMS_API_KEY, SMS_API_URL. Never fakes delivery
when credentials are unconfigured.
*/

function getSmsAdapterStatus() {
    const provider = String(process.env.SMS_PROVIDER || "").trim();
    const apiKey = String(process.env.SMS_API_KEY || "").trim();
    const apiUrl = String(process.env.SMS_API_URL || "").trim();
    const senderId = String(process.env.SMS_SENDER_ID || "GBS-HOSP").trim();
    const configured = Boolean(provider && apiKey);

    return {
        key: "SMS_GATEWAY",
        name: "Outbound SMS Notification Gateway",
        configured,
        status: configured ? "CONFIGURED" : "NOT_CONFIGURED",
        provider: configured ? provider : null,
        senderId,
        hasEndpointUrl: Boolean(apiUrl),
        detail: configured
            ? `Configured SMS provider: ${provider} (Sender: ${senderId})`
            : "SMS credentials (SMS_PROVIDER, SMS_API_KEY) not configured; real-time SSE and PostgreSQL notifications remain active."
    };
}

async function sendSms({ to, message }) {
    const status = getSmsAdapterStatus();
    if (!status.configured) {
        return {
            delivered: false,
            status: "NOT_CONFIGURED",
            recipient: to || null,
            reason: status.detail
        };
    }

    const apiUrl = String(process.env.SMS_API_URL || "").trim();
    if (!apiUrl) {
        return {
            delivered: false,
            status: "MISSING_SMS_API_URL",
            recipient: to || null,
            reason: "SMS_PROVIDER and SMS_API_KEY are set, but SMS_API_URL is required to dispatch outbound HTTP SMS."
        };
    }

    try {
        const res = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.SMS_API_KEY}`
            },
            body: JSON.stringify({
                sender: status.senderId,
                recipient: to,
                message
            })
        });
        const bodyText = await res.text();
        return {
            delivered: res.ok,
            status: res.ok ? "SENT" : "PROVIDER_REJECTED",
            httpStatus: res.status,
            recipient: to,
            providerResponse: bodyText.slice(0, 300)
        };
    } catch (err) {
        return {
            delivered: false,
            status: "DISPATCH_ERROR",
            recipient: to || null,
            reason: err.message
        };
    }
}

module.exports = {
    getSmsAdapterStatus,
    sendSms
};
