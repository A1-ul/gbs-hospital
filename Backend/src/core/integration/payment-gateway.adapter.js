"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MODULAR MULTI-GATEWAY PAYMENT ADAPTER (PAYSTACK • HUBTEL • GHANA MOMO • BANK)
CommonJS Only • Truthful No-Mock FinTech Architecture
LOCATION: Backend/src/core/integration/payment-gateway.adapter.js
================================================================================
Design Guarantees:
- Modular provider-specific adapters (Paystack, Hubtel, Bank Deposit/Transfer).
- Strict Ghanaian MSISDN validation (MTN, Telecel Cash, AT Money) + phone masking.
- Never collects, logs, stores, or transmits MoMo PINs, OTPs, raw PANs, or CVVs.
- Never fakes payment confirmation or invents unofficial USSD codes / app links.
- Uses AbortController 15s timeouts and accurate HTTP 502/503/504 upstream errors.
- Preserves backward compatibility with getPaymentGatewayStatus(),
  verifyPaystackWebhookSignature(), and verifyPaystackTransaction().
*/

const crypto = require("crypto");

const UPSTREAM_TIMEOUT_MS = 15000;

const PAYMENT_STATUSES = Object.freeze({
    CREATED: "CREATED",
    PENDING: "PENDING",
    REQUIRES_CUSTOMER_ACTION: "REQUIRES_CUSTOMER_ACTION",
    PROCESSING: "PROCESSING",
    SUCCESSFUL: "SUCCESSFUL",
    FAILED: "FAILED",
    CANCELLED: "CANCELLED",
    EXPIRED: "EXPIRED",
    REVERSED: "REVERSED",
    REFUNDED: "REFUNDED",
    UNDER_REVIEW: "UNDER_REVIEW"
});

const PAYMENT_METHODS = Object.freeze({
    MTN_MOMO: "MTN_MOMO",
    TELECEL_CASH: "TELECEL_CASH",
    AT_MONEY: "AT_MONEY",
    VISA: "VISA",
    MASTERCARD: "MASTERCARD",
    BANK_TRANSFER: "BANK_TRANSFER",
    BANK_DEPOSIT: "BANK_DEPOSIT"
});

const MOMO_NETWORK_RULES = Object.freeze({
    MTN_MOMO: {
        label: "MTN Mobile Money",
        prefixes: ["024", "054", "055", "059", "025"],
        paystackCode: "mtn",
        hubtelChannel: "mtn-gh"
    },
    TELECEL_CASH: {
        label: "Telecel Cash",
        prefixes: ["020", "050"],
        paystackCode: "vod",
        hubtelChannel: "vodafone-gh"
    },
    AT_MONEY: {
        label: "AT Money (AirtelTigo)",
        prefixes: ["026", "027", "056", "057"],
        paystackCode: "tgo",
        hubtelChannel: "tigo-gh"
    }
});

const DEVELOPER_MOMO_DESTINATION = Object.freeze({
    phone: "0554594193",
    network: "MTN_MOMO",
    networkLabel: "MTN Mobile Money (Ghana)",
    accountLabel: "GBS Official Developer Payment Destination",
    verificationNotice:
        "Designated GBS Developer Mobile Money destination. Confirm registered merchant/receiving-account ownership before activating live automated collections. Never enter any MoMo PIN inside GBS."
});

const PROHIBITED_SENSITIVE_FIELDS = Object.freeze([
    "pin",
    "momoPin",
    "momo_pin",
    "cardPin",
    "card_pin",
    "cvv",
    "cvc",
    "cvv2",
    "cardNumber",
    "card_number",
    "pan",
    "rawPan"
]);

function maskApiKey(rawKey) {
    const key = String(rawKey || "").trim();
    if (!key) return null;
    if (key.length <= 8) return "****";
    const prefix = key.slice(0, Math.min(7, key.length - 4));
    const suffix = key.slice(-4);
    return `${prefix}****${suffix}`;
}

function maskPhoneNumber(rawPhone) {
    const digits = String(rawPhone || "").replace(/\D/g, "");
    if (digits.length < 6) return digits ? "***" : null;
    return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}

/**
 * Normalize & validate Ghanaian Mobile Money MSISDN numbers.
 * Accepts 0XXXXXXXXX, 233XXXXXXXXX, or +233XXXXXXXXX.
 */
function validateGhanaMomoPhone(rawPhone, paymentMethod = null) {
    const cleaned = String(rawPhone || "").replace(/[\s\-().]/g, "");
    if (!cleaned) {
        return { valid: false, reason: "Mobile Money phone number is required." };
    }

    let local10 = cleaned;
    if (local10.startsWith("+233")) {
        local10 = `0${local10.slice(4)}`;
    } else if (local10.startsWith("233") && local10.length === 12) {
        local10 = `0${local10.slice(3)}`;
    }

    if (!/^0[25]\d{8}$/.test(local10)) {
        return {
            valid: false,
            reason: "Enter a valid 10-digit Ghanaian mobile number (e.g., 024XXXXXXX, 055XXXXXXX, 020XXXXXXX, or 027XXXXXXX)."
        };
    }

    const prefix = local10.slice(0, 3);
    const detectedMethod = Object.keys(MOMO_NETWORK_RULES).find((k) =>
        MOMO_NETWORK_RULES[k].prefixes.includes(prefix)
    ) || null;

    if (paymentMethod && MOMO_NETWORK_RULES[paymentMethod]) {
        const rule = MOMO_NETWORK_RULES[paymentMethod];
        if (!rule.prefixes.includes(prefix)) {
            const detectedLabel = detectedMethod ? MOMO_NETWORK_RULES[detectedMethod].label : "another network";
            return {
                valid: false,
                reason: `Prefix ${prefix} belongs to ${detectedLabel}, not ${rule.label} (${rule.prefixes.join(", ")}).`
            };
        }
    }

    return {
        valid: true,
        localNumber: local10,
        e164Number: `+233${local10.slice(1)}`,
        maskedNumber: maskPhoneNumber(local10),
        prefix,
        detectedMethod
    };
}

/**
 * Reject payloads attempting to pass prohibited MoMo PIN, CVV, or raw card PAN values.
 */
function assertNoProhibitedSensitiveFields(payload) {
    if (!payload || typeof payload !== "object") return;
    const keys = Object.keys(payload);
    for (const k of keys) {
        if (PROHIBITED_SENSITIVE_FIELDS.includes(k) && payload[k] !== undefined && payload[k] !== null && String(payload[k]).trim() !== "") {
            const err = new Error(
                "Security Policy Violation: GBS never accepts, stores, or transmits Mobile Money PINs, card PINs, raw card numbers, or CVV codes. Authorize directly on your phone or official provider checkout."
            );
            err.statusCode = 400;
            err.code = "PROHIBITED_SENSITIVE_FIELD";
            throw err;
        }
    }
}

async function fetchWithTimeout(url, fetchOptions = {}, { timeoutMs = UPSTREAM_TIMEOUT_MS, fetchImpl = null } = {}) {
    const fn = fetchImpl || (typeof fetch === "function" ? fetch : null);
    if (!fn) {
        return {
            ok: false,
            httpStatus: 503,
            code: "HTTP_CLIENT_UNAVAILABLE",
            error: "Server HTTP fetch client is unavailable."
        };
    }

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    let timer = null;
    let timedOut = false;

    if (controller) {
        timer = setTimeout(() => {
            timedOut = true;
            try {
                controller.abort();
            } catch (_e) {
                // ignore
            }
        }, timeoutMs);
    }

    try {
        const res = await fn(url, {
            ...fetchOptions,
            ...(controller ? { signal: controller.signal } : {})
        });
        let body = null;
        try {
            body = await res.json();
        } catch (_parseErr) {
            body = null;
        }
        return {
            ok: res.ok,
            httpStatus: res.status,
            body
        };
    } catch (err) {
        if (timedOut || err?.name === "AbortError") {
            return {
                ok: false,
                httpStatus: 504,
                code: "GATEWAY_TIMEOUT",
                error: `Payment provider did not respond within ${Math.round(timeoutMs / 1000)}s. Do not duplicate payment — check transaction status first.`
            };
        }
        return {
            ok: false,
            httpStatus: 502,
            code: "BAD_GATEWAY",
            error: `Could not reach payment provider: ${err.message}`
        };
    } finally {
        if (timer) clearTimeout(timer);
    }
}

function getGatewayConfigSnapshot() {
    const paystackSecret = String(process.env.PAYSTACK_SECRET_KEY || "").trim();
    const paystackPublic = String(process.env.PAYSTACK_PUBLIC_KEY || "").trim();
    const hubtelClientId = String(process.env.HUBTEL_CLIENT_ID || "").trim();
    const hubtelClientSecret = String(process.env.HUBTEL_CLIENT_SECRET || "").trim();
    const hubtelMerchantAccount = String(process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || "").trim();
    const stripeSecret = String(process.env.STRIPE_SECRET_KEY || "").trim();

    const paystackConfigured = Boolean(paystackSecret);
    const hubtelConfigured = Boolean(hubtelClientId && hubtelClientSecret && hubtelMerchantAccount);
    const stripeConfigured = Boolean(stripeSecret);

    return {
        paystack: {
            provider: "PAYSTACK",
            configured: paystackConfigured,
            mode: paystackConfigured ? (paystackSecret.startsWith("sk_live_") ? "LIVE" : "SANDBOX") : "UNCONFIGURED",
            maskedSecretKey: maskApiKey(paystackSecret),
            publicKeyConfigured: Boolean(paystackPublic),
            supportedMethods: [
                PAYMENT_METHODS.MTN_MOMO,
                PAYMENT_METHODS.TELECEL_CASH,
                PAYMENT_METHODS.AT_MONEY,
                PAYMENT_METHODS.VISA,
                PAYMENT_METHODS.MASTERCARD,
                PAYMENT_METHODS.BANK_TRANSFER
            ]
        },
        hubtel: {
            provider: "HUBTEL",
            configured: hubtelConfigured,
            mode: hubtelConfigured ? (String(process.env.HUBTEL_MODE || "").toUpperCase() === "LIVE" ? "LIVE" : "SANDBOX") : "UNCONFIGURED",
            maskedClientId: maskApiKey(hubtelClientId),
            merchantAccountConfigured: Boolean(hubtelMerchantAccount),
            supportedMethods: [
                PAYMENT_METHODS.MTN_MOMO,
                PAYMENT_METHODS.TELECEL_CASH,
                PAYMENT_METHODS.AT_MONEY,
                PAYMENT_METHODS.VISA,
                PAYMENT_METHODS.MASTERCARD
            ]
        },
        stripe: {
            provider: "STRIPE",
            configured: stripeConfigured,
            mode: stripeConfigured ? (stripeSecret.startsWith("sk_live_") ? "LIVE" : "SANDBOX") : "UNCONFIGURED",
            maskedSecretKey: maskApiKey(stripeSecret),
            supportedMethods: [PAYMENT_METHODS.VISA, PAYMENT_METHODS.MASTERCARD]
        }
    };
}

/**
 * Backward-compatible integration status summary (consumed by Developer Ops & Phase 30 tests).
 */
function getPaymentGatewayStatus() {
    const cfg = getGatewayConfigSnapshot();
    const configured = cfg.paystack.configured || cfg.hubtel.configured || cfg.stripe.configured;
    const providers = [
        cfg.paystack.configured ? `Paystack (${cfg.paystack.mode})` : null,
        cfg.hubtel.configured ? `Hubtel (${cfg.hubtel.mode})` : null,
        cfg.stripe.configured ? `Stripe (${cfg.stripe.mode})` : null
    ].filter(Boolean);

    return {
        key: "PAYMENT_GATEWAY",
        name: "Multi-Gateway Payment Engine (Paystack / Hubtel / Bank)",
        configured,
        status: configured ? "CONFIGURED" : "MANUAL_RECEIPT_MODE",
        providers,
        gateways: cfg,
        developerDestination: DEVELOPER_MOMO_DESTINATION,
        detail: configured
            ? `Active payment gateways: ${providers.join(", ")}. Bank deposit verification also enabled.`
            : "No automated gateway keys configured in environment variables. Verified Bank Deposit / Transfer submission and authorized Hospital Accountant verification are active."
    };
}

/**
 * Build truthful, non-invented device/app fallback guidance per method & configured gateway.
 */
function buildFallbackGuidance(paymentMethod, provider, authorizationUrl = null) {
    const isMomo = Boolean(MOMO_NETWORK_RULES[paymentMethod]);
    const steps = [];

    if (isMomo) {
        steps.push({
            option: "PHONE_APPROVAL_PROMPT",
            title: "Approve via Official Network Prompt (No App Required)",
            description:
                "You do not need a Mobile Money app installed. Approve the authorization prompt sent directly to your phone by your mobile network operator."
        });
    }

    if (authorizationUrl) {
        steps.push({
            option: "HOSTED_BROWSER_CHECKOUT",
            title: `Complete via Official ${provider} Browser Checkout`,
            description:
                "Continue securely inside your mobile or desktop browser without installing any extra application.",
            url: authorizationUrl
        });
    }

    steps.push({
        option: "BANK_DEPOSIT_OR_SWITCH_METHOD",
        title: "Switch Payment Method or Use Bank Deposit",
        description:
            "You may safely cancel this pending request and switch to another supported method or submit a verified bank deposit reference."
    });

    return steps;
}

/**
 * Truthful capability matrix exposed to Frontend checkouts & Developer console.
 * Never advertises an automated online method as active unless a real supporting gateway is configured.
 */
function getSupportedPaymentChannels() {
    const cfg = getGatewayConfigSnapshot();
    const activeProvidersFor = (method) =>
        [cfg.paystack, cfg.hubtel, cfg.stripe]
            .filter((g) => g.configured && g.supportedMethods.includes(method))
            .map((g) => g.provider);

    const methods = [
        {
            code: PAYMENT_METHODS.MTN_MOMO,
            label: "MTN Mobile Money",
            category: "MOBILE_MONEY",
            prefixes: MOMO_NETWORK_RULES.MTN_MOMO.prefixes,
            requiresPhone: true,
            requiresHostedCheckout: false,
            automatedAvailable: activeProvidersFor(PAYMENT_METHODS.MTN_MOMO).length > 0,
            activeGateways: activeProvidersFor(PAYMENT_METHODS.MTN_MOMO),
            appRequired: false,
            securityNote: "Approve directly on your phone. GBS will never ask for your MoMo PIN."
        },
        {
            code: PAYMENT_METHODS.TELECEL_CASH,
            label: "Telecel Cash",
            category: "MOBILE_MONEY",
            prefixes: MOMO_NETWORK_RULES.TELECEL_CASH.prefixes,
            requiresPhone: true,
            requiresHostedCheckout: false,
            automatedAvailable: activeProvidersFor(PAYMENT_METHODS.TELECEL_CASH).length > 0,
            activeGateways: activeProvidersFor(PAYMENT_METHODS.TELECEL_CASH),
            appRequired: false,
            securityNote: "Approve directly on your phone. GBS will never ask for your Telecel Cash PIN."
        },
        {
            code: PAYMENT_METHODS.AT_MONEY,
            label: "AT Money (AirtelTigo)",
            category: "MOBILE_MONEY",
            prefixes: MOMO_NETWORK_RULES.AT_MONEY.prefixes,
            requiresPhone: true,
            requiresHostedCheckout: false,
            automatedAvailable: activeProvidersFor(PAYMENT_METHODS.AT_MONEY).length > 0,
            activeGateways: activeProvidersFor(PAYMENT_METHODS.AT_MONEY),
            appRequired: false,
            securityNote: "Approve directly on your phone. GBS will never ask for your AT Money PIN."
        },
        {
            code: PAYMENT_METHODS.VISA,
            label: "Visa Card",
            category: "CARD",
            requiresPhone: false,
            requiresHostedCheckout: true,
            automatedAvailable: activeProvidersFor(PAYMENT_METHODS.VISA).length > 0,
            activeGateways: activeProvidersFor(PAYMENT_METHODS.VISA),
            appRequired: false,
            securityNote: "Processed exclusively via provider hosted PCI-DSS checkout. GBS never touches card numbers or CVV."
        },
        {
            code: PAYMENT_METHODS.MASTERCARD,
            label: "Mastercard",
            category: "CARD",
            requiresPhone: false,
            requiresHostedCheckout: true,
            automatedAvailable: activeProvidersFor(PAYMENT_METHODS.MASTERCARD).length > 0,
            activeGateways: activeProvidersFor(PAYMENT_METHODS.MASTERCARD),
            appRequired: false,
            securityNote: "Processed exclusively via provider hosted PCI-DSS checkout. GBS never touches card numbers or CVV."
        },
        {
            code: PAYMENT_METHODS.BANK_TRANSFER,
            label: "Bank Transfer",
            category: "BANK",
            requiresPhone: false,
            requiresHostedCheckout: false,
            automatedAvailable: true,
            verificationMode: activeProvidersFor(PAYMENT_METHODS.BANK_TRANSFER).length > 0
                ? "GATEWAY_OR_FINANCE_VERIFICATION"
                : "AUTHORIZED_FINANCE_VERIFICATION",
            activeGateways: activeProvidersFor(PAYMENT_METHODS.BANK_TRANSFER),
            appRequired: false,
            securityNote: "Generates a unique hospital payment reference; credited after verified confirmation."
        },
        {
            code: PAYMENT_METHODS.BANK_DEPOSIT,
            label: "Bank Branch Deposit",
            category: "BANK",
            requiresPhone: false,
            requiresHostedCheckout: false,
            automatedAvailable: true,
            verificationMode: "AUTHORIZED_FINANCE_VERIFICATION",
            activeGateways: ["HOSPITAL_FINANCE_DESK"],
            appRequired: false,
            securityNote: "Submit bank slip reference after depositing; remains UNDER_REVIEW until verified by an authorized Hospital Accountant."
        }
    ];

    return {
        currency: "GHS",
        automatedOnlineReady: cfg.paystack.configured || cfg.hubtel.configured || cfg.stripe.configured,
        gateways: cfg,
        methods,
        developerDestination: DEVELOPER_MOMO_DESTINATION
    };
}

/**
 * Cryptographic Paystack Webhook Signature Verification (HMAC-SHA512)
 */
function verifyPaystackWebhookSignature(rawBody, signatureHeader, secretKeyOverride = null) {
    const secret = String(secretKeyOverride || process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || "").trim();
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
 * Cryptographic Hubtel Webhook Signature Verification (HMAC-SHA256)
 */
function verifyHubtelWebhookSignature(rawBody, signatureHeader, secretKeyOverride = null) {
    const secret = String(secretKeyOverride || process.env.HUBTEL_WEBHOOK_SECRET || process.env.HUBTEL_CLIENT_SECRET || "").trim();
    if (!secret || !signatureHeader || rawBody === undefined || rawBody === null) {
        return false;
    }
    const payload = typeof rawBody === "string" || Buffer.isBuffer(rawBody)
        ? rawBody
        : JSON.stringify(rawBody);
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const sigBuf = Buffer.from(String(signatureHeader).trim(), "utf8");
    const expBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expBuf.length) {
        return false;
    }
    return crypto.timingSafeEqual(sigBuf, expBuf);
}

function verifyProviderWebhookSignature(provider, rawBody, signatureHeader, secretOverride = null) {
    const p = String(provider || "").trim().toUpperCase();
    if (p === "PAYSTACK") {
        return verifyPaystackWebhookSignature(rawBody, signatureHeader, secretOverride);
    }
    if (p === "HUBTEL") {
        return verifyHubtelWebhookSignature(rawBody, signatureHeader, secretOverride);
    }
    return false;
}

/**
 * ============================================================================
 * PAYSTACK ADAPTER (Official Hosted Checkout, Mobile Money Charge, Verify, Refund)
 * ============================================================================
 */
const paystackAdapter = {
    async initializeHostedCheckout(params, opts = {}) {
        const secret = String(process.env.PAYSTACK_SECRET_KEY || "").trim();
        if (!secret) {
            return {
                ok: false,
                httpStatus: 503,
                code: "GATEWAY_NOT_CONFIGURED",
                provider: "PAYSTACK",
                error: "Paystack API key is not configured on this server. Configure PAYSTACK_SECRET_KEY in Render environment variables or use Bank Deposit verification."
            };
        }

        const amountMinorUnits = Math.round(Number(params.amountGhs) * 100);
        const bodyPayload = {
            email: params.email || "billing@gbs-hospital.local",
            amount: amountMinorUnits,
            currency: params.currency || "GHS",
            reference: params.reference,
            channels: params.channels || ["card", "mobile_money", "bank", "bank_transfer"],
            ...(params.callbackUrl ? { callback_url: params.callbackUrl } : {}),
            ...(params.subaccountCode ? { subaccount: params.subaccountCode } : {}),
            metadata: params.metadata || {}
        };

        const res = await fetchWithTimeout(
            "https://api.paystack.co/transaction/initialize",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${secret}`,
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify(bodyPayload)
            },
            opts
        );

        if (!res.ok || !res.body?.status) {
            return {
                ok: false,
                httpStatus: res.httpStatus >= 500 ? res.httpStatus : 502,
                code: res.code || "PAYSTACK_INIT_FAILED",
                provider: "PAYSTACK",
                error: res.body?.message || res.error || "Paystack could not initialize checkout."
            };
        }

        const authorizationUrl = res.body?.data?.authorization_url || null;
        return {
            ok: true,
            provider: "PAYSTACK",
            status: PAYMENT_STATUSES.REQUIRES_CUSTOMER_ACTION,
            providerRef: res.body?.data?.reference || params.reference,
            authorizationUrl,
            customerInstructions:
                "Complete your payment securely on the official Paystack checkout page. GBS will update your bill automatically once Paystack confirms the transaction server-to-server.",
            fallbackOptions: buildFallbackGuidance(params.paymentMethod, "Paystack", authorizationUrl)
        };
    },

    async chargeMobileMoney(params, opts = {}) {
        const secret = String(process.env.PAYSTACK_SECRET_KEY || "").trim();
        if (!secret) {
            return {
                ok: false,
                httpStatus: 503,
                code: "GATEWAY_NOT_CONFIGURED",
                provider: "PAYSTACK",
                error: "Paystack API key is not configured on this server. Configure PAYSTACK_SECRET_KEY in Render environment variables or use Bank Deposit verification."
            };
        }

        const phoneCheck = validateGhanaMomoPhone(params.phone, params.paymentMethod);
        if (!phoneCheck.valid) {
            return {
                ok: false,
                httpStatus: 400,
                code: "INVALID_GHANA_PHONE",
                provider: "PAYSTACK",
                error: phoneCheck.reason
            };
        }

        const rule = MOMO_NETWORK_RULES[params.paymentMethod];
        const amountMinorUnits = Math.round(Number(params.amountGhs) * 100);
        const bodyPayload = {
            email: params.email || "billing@gbs-hospital.local",
            amount: amountMinorUnits,
            currency: params.currency || "GHS",
            reference: params.reference,
            mobile_money: {
                phone: phoneCheck.localNumber,
                provider: rule.paystackCode
            },
            ...(params.subaccountCode ? { subaccount: params.subaccountCode } : {}),
            metadata: params.metadata || {}
        };

        const res = await fetchWithTimeout(
            "https://api.paystack.co/charge",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${secret}`,
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify(bodyPayload)
            },
            opts
        );

        if (!res.ok || !res.body?.status) {
            return {
                ok: false,
                httpStatus: res.httpStatus >= 500 ? res.httpStatus : 502,
                code: res.code || "PAYSTACK_CHARGE_FAILED",
                provider: "PAYSTACK",
                error: res.body?.message || res.error || "Paystack could not initiate Mobile Money prompt."
            };
        }

        const rawStatus = String(res.body?.data?.status || "pending").toLowerCase();
        const displayText =
            res.body?.data?.display_text ||
            res.body?.message ||
            `Authorization request sent via Paystack for ${rule.label} (${phoneCheck.maskedNumber}). Follow the official prompt on your phone to approve.`;

        // NEVER mark SUCCESSFUL directly on charge initiation — require webhook or server-to-server verify!
        let canonicalStatus = PAYMENT_STATUSES.PENDING;
        if (rawStatus === "pay_offline" || rawStatus === "send_otp" || rawStatus === "send_phone" || rawStatus === "open_url") {
            canonicalStatus = PAYMENT_STATUSES.REQUIRES_CUSTOMER_ACTION;
        } else if (rawStatus === "failed") {
            canonicalStatus = PAYMENT_STATUSES.FAILED;
        } else if (rawStatus === "success" || rawStatus === "ongoing" || rawStatus === "pending") {
            canonicalStatus = PAYMENT_STATUSES.PROCESSING;
        }

        const authorizationUrl = res.body?.data?.url || null;
        return {
            ok: canonicalStatus !== PAYMENT_STATUSES.FAILED,
            provider: "PAYSTACK",
            status: canonicalStatus,
            providerRawStatus: rawStatus,
            requiresServerVerification: true,
            providerRef: res.body?.data?.reference || params.reference,
            authorizationUrl,
            customerInstructions: displayText,
            fallbackOptions: buildFallbackGuidance(params.paymentMethod, "Paystack", authorizationUrl)
        };
    },

    async verifyTransaction(reference, opts = {}) {
        const secret = String(process.env.PAYSTACK_SECRET_KEY || "").trim();
        if (!secret) {
            return {
                verified: false,
                status: "MANUAL_RECEIPT_MODE",
                canonicalStatus: PAYMENT_STATUSES.PENDING,
                reference: reference || null,
                httpStatus: 503,
                reason: "PAYSTACK_SECRET_KEY not configured; verify transaction manually via hospital cashier desk."
            };
        }

        if (!reference) {
            return {
                verified: false,
                status: "INVALID_REFERENCE",
                canonicalStatus: PAYMENT_STATUSES.FAILED,
                httpStatus: 400,
                reason: "Transaction reference is required."
            };
        }

        const res = await fetchWithTimeout(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${secret}`,
                    Accept: "application/json"
                }
            },
            opts
        );

        if (!res.ok) {
            return {
                verified: false,
                status: res.code || "VERIFICATION_ERROR",
                canonicalStatus: PAYMENT_STATUSES.PENDING,
                reference,
                httpStatus: res.httpStatus,
                reason: res.body?.message || res.error || "Unable to verify transaction with Paystack."
            };
        }

        const txStatus = String(res.body?.data?.status || "unknown").toLowerCase();
        const amountMinorUnits = Number(res.body?.data?.amount || 0);
        let canonicalStatus = PAYMENT_STATUSES.PENDING;
        if (txStatus === "success") canonicalStatus = PAYMENT_STATUSES.SUCCESSFUL;
        else if (txStatus === "failed") canonicalStatus = PAYMENT_STATUSES.FAILED;
        else if (txStatus === "abandoned") canonicalStatus = PAYMENT_STATUSES.CANCELLED;
        else if (txStatus === "reversed") canonicalStatus = PAYMENT_STATUSES.REVERSED;
        else if (txStatus === "ongoing" || txStatus === "queued") canonicalStatus = PAYMENT_STATUSES.PROCESSING;

        return {
            verified: Boolean(res.body?.status === true && txStatus === "success"),
            status: txStatus.toUpperCase(),
            canonicalStatus,
            provider: "PAYSTACK",
            reference,
            providerRef: res.body?.data?.reference || reference,
            amountMinorUnits,
            amountGhs: Number((amountMinorUnits / 100).toFixed(2)),
            currency: res.body?.data?.currency || "GHS",
            channel: res.body?.data?.channel || null,
            paidAt: res.body?.data?.paid_at || null,
            httpStatus: 200
        };
    },

    async refundTransaction({ providerRef, amountGhs, reason }, opts = {}) {
        const secret = String(process.env.PAYSTACK_SECRET_KEY || "").trim();
        if (!secret) {
            return {
                ok: false,
                httpStatus: 503,
                code: "GATEWAY_NOT_CONFIGURED",
                provider: "PAYSTACK",
                error: "PAYSTACK_SECRET_KEY is not configured; record offline refund through Hospital Finance approval."
            };
        }

        const payload = {
            transaction: providerRef,
            ...(amountGhs ? { amount: Math.round(Number(amountGhs) * 100) } : {}),
            ...(reason ? { merchant_note: String(reason).slice(0, 250) } : {})
        };

        const res = await fetchWithTimeout(
            "https://api.paystack.co/refund",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${secret}`,
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify(payload)
            },
            opts
        );

        if (!res.ok || !res.body?.status) {
            return {
                ok: false,
                httpStatus: res.httpStatus >= 500 ? res.httpStatus : 502,
                code: res.code || "PAYSTACK_REFUND_FAILED",
                provider: "PAYSTACK",
                error: res.body?.message || res.error || "Paystack refund request failed."
            };
        }

        return {
            ok: true,
            provider: "PAYSTACK",
            refundRef: String(res.body?.data?.id || providerRef),
            status: PAYMENT_STATUSES.REFUNDED
        };
    }
};

/**
 * ============================================================================
 * HUBTEL ADAPTER (Official Ghana Online Checkout & Server-to-Server Verification)
 * ============================================================================
 */
const hubtelAdapter = {
    getBasicAuthHeader() {
        const clientId = String(process.env.HUBTEL_CLIENT_ID || "").trim();
        const clientSecret = String(process.env.HUBTEL_CLIENT_SECRET || "").trim();
        if (!clientId || !clientSecret) return null;
        return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
    },

    async initializeCheckout(params, opts = {}) {
        const authHeader = this.getBasicAuthHeader();
        const merchantAccountNumber = String(process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || "").trim();
        if (!authHeader || !merchantAccountNumber) {
            return {
                ok: false,
                httpStatus: 503,
                code: "GATEWAY_NOT_CONFIGURED",
                provider: "HUBTEL",
                error: "Hubtel credentials (HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, HUBTEL_MERCHANT_ACCOUNT_NUMBER) are not configured on this server."
            };
        }

        const payload = {
            totalAmount: Number(Number(params.amountGhs).toFixed(2)),
            description: params.description || "GBS Hospital Payment",
            callbackUrl: params.callbackUrl || `${process.env.PUBLIC_API_URL || "https://gbs-hospital-system.onrender.com"}/api/v1/payments/webhooks/hubtel`,
            returnUrl: params.returnUrl || `${process.env.PUBLIC_APP_URL || "https://gbs-hospital-system.onrender.com"}/?paymentRef=${encodeURIComponent(params.reference)}`,
            cancellationUrl: params.cancellationUrl || `${process.env.PUBLIC_APP_URL || "https://gbs-hospital-system.onrender.com"}/?paymentCancelled=${encodeURIComponent(params.reference)}`,
            merchantAccountNumber,
            clientReference: params.reference
        };

        const res = await fetchWithTimeout(
            "https://payproxyapi.hubtel.com/items/initiate",
            {
                method: "POST",
                headers: {
                    Authorization: authHeader,
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify(payload)
            },
            opts
        );

        if (!res.ok || !res.body?.data?.checkoutUrl) {
            return {
                ok: false,
                httpStatus: res.httpStatus >= 500 ? res.httpStatus : 502,
                code: res.code || "HUBTEL_INIT_FAILED",
                provider: "HUBTEL",
                error: res.body?.message || res.error || "Hubtel could not initiate checkout."
            };
        }

        const authorizationUrl = res.body.data.checkoutUrl;
        return {
            ok: true,
            provider: "HUBTEL",
            status: PAYMENT_STATUSES.REQUIRES_CUSTOMER_ACTION,
            providerRef: res.body.data.checkoutId || params.reference,
            authorizationUrl,
            customerInstructions:
                "Continue on the official Hubtel checkout page to approve with MTN MoMo, Telecel Cash, AT Money, or Bank Card. Status updates automatically once Hubtel confirms.",
            fallbackOptions: buildFallbackGuidance(params.paymentMethod, "Hubtel", authorizationUrl)
        };
    },

    async verifyTransaction(reference, opts = {}) {
        const authHeader = this.getBasicAuthHeader();
        const merchantAccountNumber = String(process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || "").trim();
        if (!authHeader || !merchantAccountNumber) {
            return {
                verified: false,
                status: "MANUAL_RECEIPT_MODE",
                canonicalStatus: PAYMENT_STATUSES.PENDING,
                reference: reference || null,
                httpStatus: 503,
                reason: "Hubtel credentials not configured."
            };
        }

        const url = `https://api-txnstatus.hubtel.com/transactions/${encodeURIComponent(merchantAccountNumber)}/status?clientReference=${encodeURIComponent(reference)}`;
        const res = await fetchWithTimeout(
            url,
            {
                method: "GET",
                headers: {
                    Authorization: authHeader,
                    Accept: "application/json"
                }
            },
            opts
        );

        if (!res.ok) {
            return {
                verified: false,
                status: res.code || "VERIFICATION_ERROR",
                canonicalStatus: PAYMENT_STATUSES.PENDING,
                reference,
                httpStatus: res.httpStatus,
                reason: res.body?.message || res.error || "Hubtel transaction verification failed."
            };
        }

        const rawStatus = String(res.body?.data?.status || "unknown").toLowerCase();
        let canonicalStatus = PAYMENT_STATUSES.PENDING;
        if (rawStatus === "paid" || rawStatus === "success") canonicalStatus = PAYMENT_STATUSES.SUCCESSFUL;
        else if (rawStatus === "unpaid" || rawStatus === "failed") canonicalStatus = PAYMENT_STATUSES.FAILED;
        else if (rawStatus === "cancelled") canonicalStatus = PAYMENT_STATUSES.CANCELLED;
        else if (rawStatus === "refunded") canonicalStatus = PAYMENT_STATUSES.REFUNDED;

        return {
            verified: canonicalStatus === PAYMENT_STATUSES.SUCCESSFUL,
            status: rawStatus.toUpperCase(),
            canonicalStatus,
            provider: "HUBTEL",
            reference,
            providerRef: res.body?.data?.transactionId || reference,
            amountGhs: Number(res.body?.data?.amount || 0),
            currency: "GHS",
            channel: res.body?.data?.paymentMethod || null,
            httpStatus: 200
        };
    }
};

/**
 * Unified Multi-Gateway Initiation Dispatcher
 */
async function initiateProviderPayment(params, opts = {}) {
    assertNoProhibitedSensitiveFields(params);

    const method = String(params.paymentMethod || "").toUpperCase();
    const cfg = getGatewayConfigSnapshot();

    // Bank Deposit / Bank Transfer (when no automated bank gateway requested) stays truthful UNDER_REVIEW / PENDING
    if (method === PAYMENT_METHODS.BANK_DEPOSIT || (method === PAYMENT_METHODS.BANK_TRANSFER && !cfg.paystack.configured)) {
        return {
            ok: true,
            provider: method,
            status: PAYMENT_STATUSES.UNDER_REVIEW,
            providerRef: params.reference,
            authorizationUrl: null,
            customerInstructions:
                `Use reference "${params.reference}" on your bank deposit slip or bank transfer narration. Submit your bank slip reference so an authorized Hospital Accountant can verify and settle your bill.`,
            fallbackOptions: buildFallbackGuidance(method, "Hospital Finance Desk", null)
        };
    }

    const preferred = String(params.preferredProvider || "").toUpperCase();
    let chosenProvider = null;

    if (preferred === "PAYSTACK" && cfg.paystack.configured) chosenProvider = "PAYSTACK";
    else if (preferred === "HUBTEL" && cfg.hubtel.configured) chosenProvider = "HUBTEL";
    else if (cfg.paystack.configured && cfg.paystack.supportedMethods.includes(method)) chosenProvider = "PAYSTACK";
    else if (cfg.hubtel.configured && cfg.hubtel.supportedMethods.includes(method)) chosenProvider = "HUBTEL";

    if (!chosenProvider) {
        return {
            ok: false,
            httpStatus: 503,
            code: "GATEWAY_NOT_CONFIGURED",
            provider: preferred || "UNCONFIGURED",
            error: `Automated ${method.replace(/_/g, " ")} collection requires live or sandbox Paystack or Hubtel API credentials configured in server environment variables. No fake payment confirmation was created; you may submit a verified Bank Deposit reference instead.`
        };
    }

    if (chosenProvider === "HUBTEL") {
        return hubtelAdapter.initializeCheckout(params, opts);
    }

    // Paystack routing: official Mobile Money /charge for MoMo, Hosted Checkout for Cards & Bank Transfer
    if (MOMO_NETWORK_RULES[method]) {
        if (params.useHostedCheckout) {
            return paystackAdapter.initializeHostedCheckout({ ...params, channels: ["mobile_money"] }, opts);
        }
        return paystackAdapter.chargeMobileMoney(params, opts);
    }

    const channels =
        method === PAYMENT_METHODS.VISA || method === PAYMENT_METHODS.MASTERCARD
            ? ["card"]
            : ["bank", "bank_transfer"];

    return paystackAdapter.initializeHostedCheckout({ ...params, channels }, opts);
}

async function verifyProviderTransaction(provider, reference, opts = {}) {
    const p = String(provider || "").toUpperCase();
    if (p === "HUBTEL") {
        return hubtelAdapter.verifyTransaction(reference, opts);
    }
    if (p === "PAYSTACK") {
        return paystackAdapter.verifyTransaction(reference, opts);
    }
    return {
        verified: false,
        status: "MANUAL_VERIFICATION_REQUIRED",
        canonicalStatus: PAYMENT_STATUSES.UNDER_REVIEW,
        reference,
        httpStatus: 200,
        reason: `Provider "${p || "BANK"}" requires authorized Finance Officer verification.`
    };
}

// Preserve legacy function signature for backward compatibility
async function verifyPaystackTransaction(reference, opts = {}) {
    return paystackAdapter.verifyTransaction(reference, opts);
}

module.exports = {
    PAYMENT_STATUSES,
    PAYMENT_METHODS,
    MOMO_NETWORK_RULES,
    DEVELOPER_MOMO_DESTINATION,
    maskApiKey,
    maskPhoneNumber,
    validateGhanaMomoPhone,
    assertNoProhibitedSensitiveFields,
    getPaymentGatewayStatus,
    getSupportedPaymentChannels,
    buildFallbackGuidance,
    verifyPaystackWebhookSignature,
    verifyHubtelWebhookSignature,
    verifyProviderWebhookSignature,
    verifyPaystackTransaction,
    paystackAdapter,
    hubtelAdapter,
    initiateProviderPayment,
    verifyProviderTransaction
};
