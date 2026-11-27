"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
CENTRAL MULTI-GATEWAY PAYMENTS & SUBSCRIPTION SERVICE
Real PostgreSQL Persistence • Atomic Settlement • Strict Hospital Isolation
CommonJS Only
LOCATION: Backend/src/modules/payments/payments.service.js
================================================================================
*/

const crypto = require("crypto");
const prisma = require("../../core/database/prisma.client");
const AppError = require("../../core/errors/app.error");
const logger = require("../../core/utils/logger");
const {
    PAYMENT_STATUSES,
    PAYMENT_METHODS,
    MOMO_NETWORK_RULES,
    DEVELOPER_MOMO_DESTINATION,
    validateGhanaMomoPhone,
    maskPhoneNumber,
    assertNoProhibitedSensitiveFields,
    getPaymentGatewayStatus,
    getSupportedPaymentChannels,
    verifyProviderWebhookSignature,
    initiateProviderPayment,
    verifyProviderTransaction,
    paystackAdapter
} = require("../../core/integration/payment-gateway.adapter");
const { getFacilityBranding } = require("../tenant-management/backup-and-environment.service");

const FINANCE_APPROVER_ROLES = Object.freeze([
    "DEVELOPER",
    "ADMINISTRATOR",
    "HOSPITAL_DIRECTOR",
    "ACCOUNTANT"
]);

const SUBSCRIPTION_PLAN_DEFAULTS = Object.freeze({
    MONTHLY: { label: "GBS Hospital Monthly Subscription", amountGhs: 1500.0, durationDays: 30 },
    ANNUAL: { label: "GBS Hospital Annual Subscription", amountGhs: 15000.0, durationDays: 365 },
    ACTIVATION: { label: "GBS System Activation & Onboarding", amountGhs: 2500.0, durationDays: 30 },
    ADDON_SERVICE: { label: "GBS Approved Add-On Service", amountGhs: 500.0, durationDays: 30 }
});

function generateTransactionRef(prefix = "GBS-PAY") {
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `${prefix}-${ymd}-${rand}`;
}

function generateOfficialReceiptNumber() {
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `GBS-RCPT-${ymd}-${rand}`;
}

function toMoney(val) {
    const num = Number(val);
    if (!Number.isFinite(num)) return 0;
    return Number(num.toFixed(2));
}

function getActorDisplayName(actor) {
    if (!actor) return "System";
    const full = `${actor.firstName || ""} ${actor.lastName || ""}`.trim();
    return full || actor.name || actor.email || actor.role || "Authorized Officer";
}

async function safeWriteAuditLog({
    userId = null,
    role = null,
    tenantId = null,
    hospitalId = null,
    action,
    description,
    affectedRecord = null,
    outcome = "SUCCESS",
    httpStatus = 200
}) {
    try {
        await prisma.auditLog.create({
            data: {
                userId: userId || null,
                role: role || null,
                tenantId: tenantId || null,
                hospitalId: hospitalId || null,
                action,
                module: "PAYMENTS",
                description: String(description || "").slice(0, 500),
                affectedRecord: affectedRecord || null,
                outcome,
                httpStatus
            }
        });
    } catch (err) {
        logger.warn({ message: "[PaymentsService] Audit log write skipped", error: err.message });
    }
}

async function safePublishNotification({ title, message, targetRole = "ACCOUNTANT", hospitalId = null, tenantId = null, eventType = "PAYMENT_CONFIRMED" }) {
    try {
        await prisma.systemNotification.create({
            data: {
                title,
                message,
                eventType,
                severity: "INFO",
                recipientRole: targetRole,
                tenantId: tenantId || null,
                isRead: false,
                metadata: hospitalId ? { hospitalId } : undefined
            }
        });
    } catch (_err) {
        // Non-fatal: never block financial settlement on notification write
    }
}

async function resolveActorPatient(actor) {
    if (!actor) return null;
    if (actor.id) {
        const byUser = await prisma.patient.findFirst({ where: { userId: actor.id } });
        if (byUser) return byUser;
    }
    if (actor.email) {
        const byEmail = await prisma.patient.findFirst({
            where: { email: { equals: String(actor.email).trim().toLowerCase(), mode: "insensitive" } }
        });
        if (byEmail) return byEmail;
    }
    return null;
}

async function resolveHospitalTenantId(hospitalId) {
    if (!hospitalId) return null;
    const tenant = await prisma.tenant.findFirst({ where: { hospitalId } });
    return tenant ? tenant.id : null;
}

function assertHospitalScope(actor, targetHospitalId, targetTenantId = null) {
    if (!actor) return;
    if (actor.role === "DEVELOPER") return;

    const actorHospitalId = actor.hospitalId || null;
    const actorTenantId = actor.tenantId || null;

    if (actorHospitalId && targetHospitalId && actorHospitalId !== targetHospitalId) {
        throw new AppError(
            "Hospital Isolation Violation: You cannot access or modify payment records belonging to another hospital.",
            403,
            "CROSS_HOSPITAL_ACCESS_DENIED"
        );
    }

    if (actorTenantId && targetTenantId && actorTenantId !== targetTenantId) {
        throw new AppError(
            "Tenant Isolation Violation: You cannot access or modify payment records belonging to another institution.",
            403,
            "CROSS_TENANT_ACCESS_DENIED"
        );
    }
}

async function assertTransactionAccess(tx, actor) {
    if (!actor) {
        throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }
    if (actor.role === "DEVELOPER") return;

    assertHospitalScope(actor, tx.hospitalId, tx.tenantId);

    if (actor.role === "PATIENT") {
        const patient = await resolveActorPatient(actor);
        const ownsByUser = tx.payerUserId && tx.payerUserId === actor.id;
        const ownsByPatient = patient && tx.patientId && tx.patientId === patient.id;
        if (!ownsByUser && !ownsByPatient) {
            throw new AppError(
                "Access denied: you may only view or verify your own hospital bill payments.",
                403,
                "PATIENT_BILL_ACCESS_DENIED"
            );
        }
    }
}

/**
 * 1. Provider Capability Matrix & Gateway Configuration Status (Zero Secrets Exposed)
 */
function getProvidersSummary() {
    return {
        ...getSupportedPaymentChannels(),
        gatewayStatus: getPaymentGatewayStatus()
    };
}

/**
 * 2. Initiate Patient / Family Hospital Bill Payment (Strict Server-Side Bill & Amount Validation)
 */
async function initiatePayment(payload = {}, actor, opts = {}) {
    assertNoProhibitedSensitiveFields(payload);

    const {
        billId,
        billNumber,
        amount: requestedAmount,
        paymentMethod,
        phone,
        payerName,
        payerEmail,
        preferredProvider,
        useHostedCheckout = false,
        idempotencyKey,
        bankName,
        bankDepositSlipRef,
        callbackUrl,
        returnUrl,
        cancellationUrl
    } = payload;

    const method = String(paymentMethod || "").trim().toUpperCase();
    if (!Object.values(PAYMENT_METHODS).includes(method)) {
        throw new AppError(
            `Unsupported payment method "${paymentMethod}". Supported methods: ${Object.values(PAYMENT_METHODS).join(", ")}.`,
            400,
            "INVALID_PAYMENT_METHOD"
        );
    }

    // Idempotency protection: return existing transaction if same idempotencyKey was already processed
    const cleanIdempotencyKey = idempotencyKey ? String(idempotencyKey).trim().slice(0, 128) : null;
    if (cleanIdempotencyKey) {
        const existing = await prisma.paymentTransaction.findUnique({
            where: { idempotencyKey: cleanIdempotencyKey }
        });
        if (existing) {
            await assertTransactionAccess(existing, actor);
            return {
                idempotentReplay: true,
                transaction: existing
            };
        }
    }

    if (!billId && !billNumber) {
        throw new AppError("A valid Hospital Bill ID or Bill Number is required to initiate payment.", 400, "MISSING_BILL_IDENTIFIER");
    }

    // Independently fetch bill from PostgreSQL — NEVER trust frontend amount blindly
    const bill = await prisma.patientBill.findFirst({
        where: billId ? { id: billId } : { billNumber: String(billNumber).trim() },
        include: {
            patient: true,
            encounter: true,
            items: true
        }
    });

    if (!bill) {
        throw new AppError("Hospital bill not found.", 404, "BILL_NOT_FOUND");
    }

    const hospitalId = bill.encounter?.hospitalId || bill.patient?.hospitalId || actor?.hospitalId || null;
    const tenantId = (await resolveHospitalTenantId(hospitalId)) || actor?.tenantId || null;

    assertHospitalScope(actor, hospitalId, tenantId);

    // If PATIENT role, verify this bill belongs to the authenticated patient
    if (actor?.role === "PATIENT") {
        const actorPatient = await resolveActorPatient(actor);
        if (!actorPatient || (bill.patientId && bill.patientId !== actorPatient.id)) {
            throw new AppError(
                "Access denied: patients may only pay their own hospital bills.",
                403,
                "PATIENT_BILL_ACCESS_DENIED"
            );
        }
    }

    if (bill.paymentStatus === "VOIDED") {
        throw new AppError("Cannot pay a voided hospital bill.", 409, "BILL_VOIDED");
    }

    const serverBalanceDue = toMoney(bill.balanceDue);
    if (bill.paymentStatus === "PAID" || serverBalanceDue <= 0) {
        throw new AppError("This hospital bill is already fully settled.", 409, "BILL_ALREADY_SETTLED");
    }

    const effectiveAmount = requestedAmount !== undefined && requestedAmount !== null && String(requestedAmount).trim() !== ""
        ? toMoney(requestedAmount)
        : serverBalanceDue;

    if (!Number.isFinite(effectiveAmount) || effectiveAmount <= 0) {
        throw new AppError("Payment amount must be greater than GHS 0.00.", 400, "INVALID_PAYMENT_AMOUNT");
    }

    if (effectiveAmount > serverBalanceDue) {
        throw new AppError(
            `Requested amount (GHS ${effectiveAmount.toFixed(2)}) exceeds the verified outstanding bill balance (GHS ${serverBalanceDue.toFixed(2)}).`,
            400,
            "AMOUNT_EXCEEDS_BALANCE"
        );
    }

    // Validate Ghanaian Mobile Money number if MoMo method selected
    let validatedPhone = null;
    if (MOMO_NETWORK_RULES[method]) {
        const phoneCheck = validateGhanaMomoPhone(phone, method);
        if (!phoneCheck.valid) {
            throw new AppError(phoneCheck.reason, 400, "INVALID_GHANA_PHONE");
        }
        validatedPhone = phoneCheck;
    }

    const transactionRef = generateTransactionRef("GBS-PAY");
    const isBankManual = method === PAYMENT_METHODS.BANK_DEPOSIT;
    const channel = isBankManual ? "BANK_DEPOSIT" : "PATIENT_BILL";
    const resolvedPayerName =
        payerName ||
        (bill.patient ? `${bill.patient.firstName || ""} ${bill.patient.lastName || ""}`.trim() : null) ||
        getActorDisplayName(actor);
    const resolvedPayerEmail = payerEmail || bill.patient?.email || actor?.email || "billing@gbs-hospital.local";

    // Step 1: Persist pending PaymentTransaction in PostgreSQL first (auditability & reconciliation)
    let txRecord = await prisma.paymentTransaction.create({
        data: {
            transactionRef,
            idempotencyKey: cleanIdempotencyKey,
            channel,
            provider: isBankManual ? "BANK_DEPOSIT" : (String(preferredProvider || method).toUpperCase()),
            paymentMethod: method,
            status: PAYMENT_STATUSES.CREATED,
            amount: effectiveAmount,
            currency: "GHS",
            purpose: `Hospital Bill Settlement — ${bill.billNumber}`,
            hospitalId,
            tenantId,
            patientId: bill.patientId || null,
            billId: bill.id,
            payerUserId: actor?.id || null,
            payerName: resolvedPayerName,
            payerPhoneMasked: validatedPhone ? validatedPhone.maskedNumber : (phone ? maskPhoneNumber(phone) : null),
            payerEmail: resolvedPayerEmail,
            bankName: bankName ? String(bankName).trim().slice(0, 120) : null,
            bankDepositSlipRef: bankDepositSlipRef ? String(bankDepositSlipRef).trim().slice(0, 120) : null,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            metadata: {
                billNumber: bill.billNumber,
                patientNumber: bill.patient?.patientNumber || null,
                balanceBeforePayment: serverBalanceDue,
                partialPayment: effectiveAmount < serverBalanceDue
            }
        }
    });

    // Step 2: Invoke modular provider adapter
    const providerResult = await initiateProviderPayment(
        {
            paymentMethod: method,
            preferredProvider,
            useHostedCheckout,
            phone: validatedPhone ? validatedPhone.localNumber : phone,
            email: resolvedPayerEmail,
            amountGhs: effectiveAmount,
            currency: "GHS",
            reference: transactionRef,
            description: `Hospital Bill ${bill.billNumber}`,
            callbackUrl,
            returnUrl,
            cancellationUrl,
            metadata: {
                transactionRef,
                billId: bill.id,
                billNumber: bill.billNumber,
                hospitalId,
                tenantId,
                patientId: bill.patientId
            }
        },
        opts
    );

    if (!providerResult.ok) {
        txRecord = await prisma.paymentTransaction.update({
            where: { id: txRecord.id },
            data: {
                provider: providerResult.provider || txRecord.provider,
                status: PAYMENT_STATUSES.FAILED,
                failureReason: providerResult.error || "Payment provider could not initiate transaction."
            }
        });

        await safeWriteAuditLog({
            userId: actor?.id,
            role: actor?.role,
            hospitalId,
            tenantId,
            action: "PAYMENT_INITIATION_FAILED",
            description: `Failed initiating ${method} payment ${transactionRef} for bill ${bill.billNumber}: ${txRecord.failureReason}`,
            affectedRecord: transactionRef,
            outcome: "FAILURE",
            httpStatus: providerResult.httpStatus || 503
        });

        const err = new AppError(
            providerResult.error || "Payment initiation failed.",
            providerResult.httpStatus || 503,
            providerResult.code || "PAYMENT_INITIATION_FAILED"
        );
        err.data = { transaction: txRecord };
        throw err;
    }

    // NEVER allow initiation alone to mark SUCCESSFUL — enforce truthful intermediate status
    const safeStatus =
        providerResult.status === PAYMENT_STATUSES.SUCCESSFUL
            ? PAYMENT_STATUSES.PROCESSING
            : (providerResult.status || PAYMENT_STATUSES.PENDING);

    txRecord = await prisma.paymentTransaction.update({
        where: { id: txRecord.id },
        data: {
            provider: providerResult.provider || txRecord.provider,
            status: safeStatus,
            providerRef: providerResult.providerRef || transactionRef,
            authorizationUrl: providerResult.authorizationUrl || null,
            customerInstructions: providerResult.customerInstructions || null,
            fallbackOptions: providerResult.fallbackOptions || null
        }
    });

    await safeWriteAuditLog({
        userId: actor?.id,
        role: actor?.role,
        hospitalId,
        tenantId,
        action: "PAYMENT_INITIATED",
        description: `Initiated ${method} payment ${transactionRef} (GHS ${effectiveAmount.toFixed(2)}) for bill ${bill.billNumber} via ${txRecord.provider}. Status: ${txRecord.status}`,
        affectedRecord: transactionRef,
        outcome: "SUCCESS",
        httpStatus: 201
    });

    return {
        idempotentReplay: false,
        transaction: txRecord,
        billSummary: {
            id: bill.id,
            billNumber: bill.billNumber,
            patientName: bill.patient ? `${bill.patient.firstName} ${bill.patient.lastName}`.trim() : null,
            patientNumber: bill.patient?.patientNumber || null,
            balanceDue: serverBalanceDue,
            amountInitiated: effectiveAmount,
            remainingIfConfirmed: toMoney(Math.max(0, serverBalanceDue - effectiveAmount))
        }
    };
}

/**
 * 3. Atomic Verified Settlement Engine (Database Transaction — Structurally Prevents Double Credits)
 */
async function settlePaymentTransactionAtomically({
    transactionId,
    providerRef = null,
    verifiedById = null,
    verifiedByName = "Verified Gateway Settlement",
    verificationSource = "GATEWAY_WEBHOOK",
    expectedAmountGhs = null,
    expectedCurrency = null
}) {
    const settled = await prisma.$transaction(async (tx) => {
        const current = await tx.paymentTransaction.findUnique({ where: { id: transactionId } });
        if (!current) {
            throw new AppError("Payment transaction not found for settlement.", 404, "TRANSACTION_NOT_FOUND");
        }

        // Strict idempotent guard: never credit twice!
        if (current.status === PAYMENT_STATUSES.SUCCESSFUL || current.patientPaymentId) {
            return { alreadySettled: true, transaction: current, bill: null, subscription: null };
        }

        const txAmount = toMoney(current.amount);
        if (expectedAmountGhs !== null && expectedAmountGhs !== undefined) {
            const verifiedAmt = toMoney(expectedAmountGhs);
            if (Math.abs(verifiedAmt - txAmount) > 0.01) {
                throw new AppError(
                    `Payment amount mismatch detected: expected GHS ${txAmount.toFixed(2)}, provider confirmed GHS ${verifiedAmt.toFixed(2)}.`,
                    400,
                    "PAYMENT_AMOUNT_MISMATCH"
                );
            }
        }

        if (expectedCurrency && String(expectedCurrency).toUpperCase() !== String(current.currency || "GHS").toUpperCase()) {
            throw new AppError(
                `Currency mismatch detected: expected ${current.currency}, provider confirmed ${expectedCurrency}.`,
                400,
                "PAYMENT_CURRENCY_MISMATCH"
            );
        }

        const receiptNumber = current.receiptNumber || generateOfficialReceiptNumber();
        const confirmedAt = new Date();
        let createdPaymentId = null;
        let updatedBill = null;
        let updatedSubscription = null;

        // Channel A & C: Hospital Patient Bill Settlement
        if (current.billId && (current.channel === "PATIENT_BILL" || current.channel === "BANK_DEPOSIT")) {
            const bill = await tx.patientBill.findUnique({ where: { id: current.billId } });
            if (!bill) {
                throw new AppError("Linked hospital bill not found during settlement.", 404, "BILL_NOT_FOUND");
            }

            const mappedLegacyMethod = MOMO_NETWORK_RULES[current.paymentMethod]
                ? "MOBILE_MONEY"
                : current.paymentMethod === PAYMENT_METHODS.VISA || current.paymentMethod === PAYMENT_METHODS.MASTERCARD
                    ? "BANK_CARD"
                    : "BANK_TRANSFER";

            const paymentRow = await tx.patientPayment.create({
                data: {
                    billId: bill.id,
                    receiptNumber,
                    amount: txAmount,
                    paymentMethod: mappedLegacyMethod,
                    paymentReference: providerRef || current.providerRef || current.transactionRef,
                    paymentDate: confirmedAt,
                    receivedById: verifiedById || null,
                    receivedByName: verifiedByName || "Verified Gateway Settlement",
                    notes: `Verified via ${verificationSource} (${current.paymentMethod} • Ref: ${current.transactionRef})`
                }
            });

            createdPaymentId = paymentRow.id;

            const newPaid = toMoney(Number(bill.paidAmount) + txAmount);
            const patientPayable = toMoney(bill.patientPayableAmount);
            const newBalance = toMoney(Math.max(0, patientPayable - newPaid));
            const newPaymentStatus = newBalance <= 0 ? "PAID" : "PARTIALLY_PAID";

            updatedBill = await tx.patientBill.update({
                where: { id: bill.id },
                data: {
                    paidAmount: newPaid,
                    balanceDue: newBalance,
                    paymentStatus: newPaymentStatus
                }
            });
        }

        // Channel B: Hospital Administrator -> GBS Developer Subscription Activation / Renewal
        if (current.channel === "DEVELOPER_SUBSCRIPTION") {
            const planMeta = (current.metadata && current.metadata.planType) || "MONTHLY";
            const planInfo = SUBSCRIPTION_PLAN_DEFAULTS[planMeta] || SUBSCRIPTION_PLAN_DEFAULTS.MONTHLY;
            const durationDays = Number((current.metadata && current.metadata.durationDays) || planInfo.durationDays || 30);

            if (current.subscriptionId) {
                const sub = await tx.tenantSubscription.findUnique({ where: { id: current.subscriptionId } });
                if (sub) {
                    const baseDate = sub.subscriptionEndDate && new Date(sub.subscriptionEndDate) > confirmedAt
                        ? new Date(sub.subscriptionEndDate)
                        : confirmedAt;
                    const newEndDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
                    updatedSubscription = await tx.tenantSubscription.update({
                        where: { id: sub.id },
                        data: {
                            status: "ACTIVE_PAID",
                            subscriptionStartDate: sub.subscriptionStartDate || confirmedAt,
                            subscriptionEndDate: newEndDate,
                            price: txAmount,
                            currency: current.currency || "GHS"
                        }
                    });
                }
            }

            if (current.tenantId) {
                await tx.tenant.update({
                    where: { id: current.tenantId },
                    data: {
                        status: "ACTIVE_PAID",
                        systemLocked: false,
                        lockReason: null,
                        lockedAt: null
                    }
                }).catch(() => {});
            }
        }

        const updatedTx = await tx.paymentTransaction.update({
            where: { id: current.id },
            data: {
                status: PAYMENT_STATUSES.SUCCESSFUL,
                providerRef: providerRef || current.providerRef || current.transactionRef,
                receiptNumber,
                patientPaymentId: createdPaymentId,
                verifiedById: verifiedById || current.verifiedById,
                verifiedByName: verifiedByName || current.verifiedByName,
                confirmedAt,
                failureReason: null
            }
        });

        return {
            alreadySettled: false,
            transaction: updatedTx,
            bill: updatedBill,
            subscription: updatedSubscription
        };
    });

    if (!settled.alreadySettled) {
        const txRec = settled.transaction;
        await safeWriteAuditLog({
            userId: verifiedById,
            hospitalId: txRec.hospitalId,
            tenantId: txRec.tenantId,
            action: "PAYMENT_CONFIRMED_SETTLED",
            description: `Confirmed ${txRec.channel} payment ${txRec.transactionRef} (GHS ${toMoney(txRec.amount).toFixed(2)}) via ${verificationSource}. Official Receipt: ${txRec.receiptNumber}`,
            affectedRecord: txRec.transactionRef,
            outcome: "SUCCESS",
            httpStatus: 200
        });

        await safePublishNotification({
            title: txRec.channel === "DEVELOPER_SUBSCRIPTION" ? "Hospital Subscription Payment Confirmed" : "Hospital Bill Payment Confirmed",
            message: `Verified payment of GHS ${toMoney(txRec.amount).toFixed(2)} (${txRec.paymentMethod}) • Receipt ${txRec.receiptNumber}`,
            targetRole: txRec.channel === "DEVELOPER_SUBSCRIPTION" ? "DEVELOPER" : "ACCOUNTANT",
            hospitalId: txRec.hospitalId,
            tenantId: txRec.tenantId,
            eventType: "PAYMENT_CONFIRMED"
        });
    }

    return settled;
}

/**
 * 4. Signed Provider Webhook Handler (Paystack HMAC-SHA512 / Hubtel HMAC-SHA256)
 */
async function processPaymentWebhook({ provider, rawBody, parsedBody, signatureHeader, secretOverride = null }) {
    const providerKey = String(provider || "").trim().toUpperCase();
    const payload = parsedBody && typeof parsedBody === "object" ? parsedBody : {};
    const signatureValid = verifyProviderWebhookSignature(providerKey, rawBody || JSON.stringify(payload), signatureHeader, secretOverride);

    // Extract normalized webhook metadata per provider
    let eventType = String(payload.event || payload.ResponseCode || payload.Status || "unknown");
    let transactionRef = null;
    let providerRef = null;
    let amountGhs = null;
    let currency = "GHS";
    let providerEventId = null;

    if (providerKey === "PAYSTACK") {
        const d = payload.data || {};
        transactionRef = d.reference || d.metadata?.transactionRef || null;
        providerRef = d.reference || (d.id ? String(d.id) : null);
        amountGhs = typeof d.amount === "number" ? toMoney(d.amount / 100) : null;
        currency = d.currency || "GHS";
        providerEventId = d.id ? `PAYSTACK:${eventType}:${d.id}` : null;
    } else if (providerKey === "HUBTEL") {
        const d = payload.Data || payload.data || {};
        eventType = String(d.Status || d.status || payload.Message || "hubtel.event");
        transactionRef = d.ClientReference || d.clientReference || null;
        providerRef = d.TransactionId || d.CheckoutId || transactionRef;
        amountGhs = typeof d.Amount === "number" ? toMoney(d.Amount) : (typeof d.amount === "number" ? toMoney(d.amount) : null);
        currency = "GHS";
        providerEventId = providerRef ? `HUBTEL:${eventType}:${providerRef}` : null;
    }

    const fallbackEventHash = crypto
        .createHash("sha256")
        .update(`${providerKey}:${eventType}:${transactionRef || "none"}:${JSON.stringify(payload)}`)
        .digest("hex")
        .slice(0, 32);
    const eventId = providerEventId || `${providerKey}:${fallbackEventHash}`;

    // Reject forged or unsigned webhooks immediately and audit them
    if (!signatureValid) {
        await prisma.paymentWebhookEvent.create({
            data: {
                provider: providerKey,
                eventId: `INVALID:${Date.now()}:${fallbackEventHash}`,
                eventType,
                transactionRef,
                signatureValid: false,
                processed: false,
                status: "REJECTED_INVALID_SIGNATURE",
                errorMessage: "Cryptographic webhook signature verification failed.",
                payload
            }
        });

        await safeWriteAuditLog({
            action: "WEBHOOK_SIGNATURE_REJECTED",
            description: `Rejected invalid ${providerKey} webhook signature for ref ${transactionRef || "unknown"}`,
            affectedRecord: transactionRef,
            outcome: "FAILURE",
            httpStatus: 401
        });

        throw new AppError("Invalid webhook signature.", 401, "INVALID_WEBHOOK_SIGNATURE");
    }

    // Strict duplicate-webhook idempotency check
    const existingWebhook = await prisma.paymentWebhookEvent.findUnique({ where: { eventId } });
    if (existingWebhook && existingWebhook.processed) {
        await prisma.paymentWebhookEvent.update({
            where: { id: existingWebhook.id },
            data: {
                duplicateIgnored: true,
                retryCount: { increment: 1 }
            }
        });

        return {
            received: true,
            processed: false,
            duplicateIgnored: true,
            eventId,
            transactionRef
        };
    }

    const webhookLog = existingWebhook || (await prisma.paymentWebhookEvent.create({
        data: {
            provider: providerKey,
            eventId,
            eventType,
            transactionRef,
            signatureValid: true,
            processed: false,
            status: "RECEIVED",
            payload
        }
    }));

    if (!transactionRef) {
        await prisma.paymentWebhookEvent.update({
            where: { id: webhookLog.id },
            data: { status: "FAILED", errorMessage: "Webhook payload missing transaction reference." }
        });
        throw new AppError("Webhook payload missing transaction reference.", 400, "MISSING_TRANSACTION_REFERENCE");
    }

    const txRecord = await prisma.paymentTransaction.findFirst({
        where: {
            OR: [{ transactionRef }, { providerRef: transactionRef }]
        }
    });

    if (!txRecord) {
        await prisma.paymentWebhookEvent.update({
            where: { id: webhookLog.id },
            data: { status: "FAILED", errorMessage: `No PaymentTransaction found for reference ${transactionRef}` }
        });
        return { received: true, processed: false, reason: "TRANSACTION_NOT_FOUND", transactionRef };
    }

    const evtLower = eventType.toLowerCase();
    let result = { transaction: txRecord, alreadySettled: false };

    try {
        if (evtLower === "charge.success" || evtLower === "success" || evtLower === "paid") {
            result = await settlePaymentTransactionAtomically({
                transactionId: txRecord.id,
                providerRef,
                verifiedByName: `${providerKey} Signed Webhook`,
                verificationSource: `${providerKey}_WEBHOOK`,
                expectedAmountGhs: amountGhs,
                expectedCurrency: currency
            });
        } else if (evtLower.includes("fail")) {
            const updated = await prisma.paymentTransaction.update({
                where: { id: txRecord.id },
                data: {
                    status: PAYMENT_STATUSES.FAILED,
                    failureReason: payload?.data?.gateway_response || payload?.Message || "Payment declined by provider."
                }
            });
            result = { transaction: updated };
        } else if (evtLower.includes("cancel") || evtLower.includes("abandon")) {
            const updated = await prisma.paymentTransaction.update({
                where: { id: txRecord.id },
                data: { status: PAYMENT_STATUSES.CANCELLED, failureReason: "Cancelled by customer." }
            });
            result = { transaction: updated };
        } else if (evtLower.includes("revers")) {
            const updated = await prisma.paymentTransaction.update({
                where: { id: txRecord.id },
                data: { status: PAYMENT_STATUSES.REVERSED, failureReason: "Reversed by payment provider." }
            });
            result = { transaction: updated };
        } else if (evtLower.includes("refund")) {
            const updated = await prisma.paymentTransaction.update({
                where: { id: txRecord.id },
                data: { status: PAYMENT_STATUSES.REFUNDED, refundedAt: new Date() }
            });
            result = { transaction: updated };
        }

        await prisma.paymentWebhookEvent.update({
            where: { id: webhookLog.id },
            data: {
                processed: true,
                duplicateIgnored: Boolean(result.alreadySettled),
                status: result.alreadySettled ? "DUPLICATE_IGNORED" : "PROCESSED",
                processedAt: new Date()
            }
        });

        return {
            received: true,
            processed: !result.alreadySettled,
            duplicateIgnored: Boolean(result.alreadySettled),
            eventId,
            transactionRef: txRecord.transactionRef,
            status: result.transaction.status,
            receiptNumber: result.transaction.receiptNumber || null
        };
    } catch (err) {
        await prisma.paymentWebhookEvent.update({
            where: { id: webhookLog.id },
            data: {
                status: "FAILED",
                errorMessage: err.message
            }
        });
        throw err;
    }
}

/**
 * 5. Server-to-Server Verification & Reconciliation
 */
async function verifyTransactionStatus(reference, actor, opts = {}) {
    const txRecord = await prisma.paymentTransaction.findFirst({
        where: { OR: [{ transactionRef: reference }, { id: reference }] }
    });
    if (!txRecord) {
        throw new AppError("Payment transaction not found.", 404, "TRANSACTION_NOT_FOUND");
    }

    await assertTransactionAccess(txRecord, actor);

    if (txRecord.status === PAYMENT_STATUSES.SUCCESSFUL) {
        return {
            verified: true,
            alreadySettled: true,
            transaction: txRecord
        };
    }

    // Bank deposits cannot be auto-confirmed via button click — must go through Accountant verification
    if (txRecord.channel === "BANK_DEPOSIT" || txRecord.provider === "BANK_DEPOSIT" || txRecord.provider === "BANK_TRANSFER") {
        return {
            verified: false,
            status: txRecord.status,
            message: "Bank deposit/transfer is awaiting verification by an authorized Hospital Accountant.",
            transaction: txRecord
        };
    }

    const verifyRes = await verifyProviderTransaction(
        txRecord.provider,
        txRecord.providerRef || txRecord.transactionRef,
        opts
    );

    if (verifyRes.verified && verifyRes.canonicalStatus === PAYMENT_STATUSES.SUCCESSFUL) {
        const settled = await settlePaymentTransactionAtomically({
            transactionId: txRecord.id,
            providerRef: verifyRes.providerRef || txRecord.providerRef,
            verifiedById: actor?.id || null,
            verifiedByName: `${txRecord.provider} Server Verification`,
            verificationSource: `${txRecord.provider}_SERVER_VERIFY`,
            expectedAmountGhs: verifyRes.amountGhs > 0 ? verifyRes.amountGhs : null,
            expectedCurrency: verifyRes.currency || "GHS"
        });
        return {
            verified: true,
            alreadySettled: settled.alreadySettled,
            transaction: settled.transaction,
            bill: settled.bill,
            subscription: settled.subscription
        };
    }

    let updated = txRecord;
    if (
        verifyRes.canonicalStatus &&
        [PAYMENT_STATUSES.FAILED, PAYMENT_STATUSES.CANCELLED, PAYMENT_STATUSES.REVERSED, PAYMENT_STATUSES.EXPIRED, PAYMENT_STATUSES.PROCESSING].includes(verifyRes.canonicalStatus) &&
        verifyRes.canonicalStatus !== txRecord.status
    ) {
        updated = await prisma.paymentTransaction.update({
            where: { id: txRecord.id },
            data: {
                status: verifyRes.canonicalStatus,
                failureReason: verifyRes.reason || txRecord.failureReason
            }
        });
    }

    return {
        verified: false,
        providerStatus: verifyRes.status,
        reason: verifyRes.reason || "Transaction not yet confirmed by payment provider.",
        transaction: updated
    };
}

/**
 * 6. Bank Deposit Submission & Authorized Finance Verification
 */
async function submitBankDepositProof(payload = {}, actor) {
    assertNoProhibitedSensitiveFields(payload);
    const { transactionRef, billId, billNumber, amount, bankName, bankDepositSlipRef, paymentMethod = "BANK_DEPOSIT", payerName } = payload;

    if (!bankDepositSlipRef || String(bankDepositSlipRef).trim().length < 3) {
        throw new AppError("A valid Bank Deposit Slip or Bank Transfer Reference is required.", 400, "MISSING_BANK_REFERENCE");
    }

    // Option A: Attach slip reference to an existing pending transaction
    if (transactionRef) {
        const existing = await prisma.paymentTransaction.findUnique({ where: { transactionRef } });
        if (!existing) {
            throw new AppError("Transaction reference not found.", 404, "TRANSACTION_NOT_FOUND");
        }
        await assertTransactionAccess(existing, actor);
        if (existing.status === PAYMENT_STATUSES.SUCCESSFUL) {
            throw new AppError("This transaction is already verified and settled.", 409, "ALREADY_SETTLED");
        }

        const updated = await prisma.paymentTransaction.update({
            where: { id: existing.id },
            data: {
                status: PAYMENT_STATUSES.UNDER_REVIEW,
                bankName: bankName ? String(bankName).trim().slice(0, 120) : existing.bankName,
                bankDepositSlipRef: String(bankDepositSlipRef).trim().slice(0, 120),
                customerInstructions: "Bank deposit slip submitted and queued UNDER_REVIEW for Hospital Accountant verification."
            }
        });
        return { transaction: updated };
    }

    // Option B: Initiate new bank deposit transaction (always enters UNDER_REVIEW, never auto-settled)
    return initiatePayment(
        {
            billId,
            billNumber,
            amount,
            paymentMethod: paymentMethod === "BANK_TRANSFER" ? "BANK_TRANSFER" : "BANK_DEPOSIT",
            bankName,
            bankDepositSlipRef,
            payerName
        },
        actor
    );
}

async function verifyBankDeposit(idOrRef, payload = {}, actor) {
    if (!actor || !FINANCE_APPROVER_ROLES.includes(actor.role)) {
        throw new AppError("Only authorized Hospital Accountants or Administrators may verify bank deposits.", 403, "FINANCE_ROLE_REQUIRED");
    }

    const txRecord = await prisma.paymentTransaction.findFirst({
        where: { OR: [{ id: idOrRef }, { transactionRef: idOrRef }] }
    });

    if (!txRecord) {
        throw new AppError("Bank deposit transaction not found.", 404, "TRANSACTION_NOT_FOUND");
    }

    assertHospitalScope(actor, txRecord.hospitalId, txRecord.tenantId);

    if (txRecord.status === PAYMENT_STATUSES.SUCCESSFUL) {
        return { alreadySettled: true, transaction: txRecord };
    }

    const decision = String(payload.decision || "APPROVE").trim().toUpperCase();
    const notes = payload.notes ? String(payload.notes).trim().slice(0, 300) : null;

    if (decision === "REJECT") {
        const rejected = await prisma.paymentTransaction.update({
            where: { id: txRecord.id },
            data: {
                status: PAYMENT_STATUSES.FAILED,
                failureReason: notes || "Bank deposit reference could not be matched on hospital bank statement.",
                verifiedById: actor.id || null,
                verifiedByName: getActorDisplayName(actor)
            }
        });

        await safeWriteAuditLog({
            userId: actor.id,
            role: actor.role,
            hospitalId: txRecord.hospitalId,
            tenantId: txRecord.tenantId,
            action: "BANK_DEPOSIT_REJECTED",
            description: `Rejected bank deposit ${txRecord.transactionRef}: ${rejected.failureReason}`,
            affectedRecord: txRecord.transactionRef,
            outcome: "FAILURE",
            httpStatus: 200
        });

        return { verified: false, rejected: true, transaction: rejected };
    }

    return settlePaymentTransactionAtomically({
        transactionId: txRecord.id,
        providerRef: payload.verifiedReference || txRecord.bankDepositSlipRef || txRecord.transactionRef,
        verifiedById: actor.id || null,
        verifiedByName: getActorDisplayName(actor),
        verificationSource: "AUTHORIZED_FINANCE_OFFICER_VERIFICATION"
    });
}

/**
 * 7. Hospital Administrator -> GBS Developer Subscription Payments (Destination: 0554594193)
 */
async function initiateDeveloperSubscriptionPayment(payload = {}, actor, opts = {}) {
    assertNoProhibitedSensitiveFields(payload);

    if (!actor || !["ADMINISTRATOR", "HOSPITAL_DIRECTOR", "DEVELOPER"].includes(actor.role)) {
        throw new AppError(
            "Only Hospital Administrators, Hospital Directors, or Developer may initiate GBS subscription payments.",
            403,
            "ADMIN_ROLE_REQUIRED"
        );
    }

    const planType = String(payload.planType || "MONTHLY").trim().toUpperCase();
    const planInfo = SUBSCRIPTION_PLAN_DEFAULTS[planType] || SUBSCRIPTION_PLAN_DEFAULTS.MONTHLY;
    const method = String(payload.paymentMethod || PAYMENT_METHODS.MTN_MOMO).trim().toUpperCase();
    if (!Object.values(PAYMENT_METHODS).includes(method)) {
        throw new AppError(`Unsupported payment method "${method}".`, 400, "INVALID_PAYMENT_METHOD");
    }

    // Resolve Hospital / Tenant context
    let tenant = null;
    if (payload.tenantId) {
        tenant = await prisma.tenant.findFirst({
            where: { OR: [{ id: payload.tenantId }, { tenantId: payload.tenantId }, { tenantCode: payload.tenantId }] },
            include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } }
        });
    } else if (actor.tenantId) {
        tenant = await prisma.tenant.findUnique({
            where: { id: actor.tenantId },
            include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } }
        });
    } else if (actor.hospitalId) {
        tenant = await prisma.tenant.findFirst({
            where: { hospitalId: actor.hospitalId },
            include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } }
        });
    } else {
        tenant = await prisma.tenant.findFirst({
            orderBy: { createdAt: "asc" },
            include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } }
        });
    }

    if (tenant) {
        assertHospitalScope(actor, tenant.hospitalId, tenant.id);
    }

    const latestSub = tenant?.subscriptions?.[0] || null;
    const expectedAmount =
        payload.amount !== undefined && Number(payload.amount) > 0
            ? toMoney(payload.amount)
            : (latestSub && Number(latestSub.price) > 0 ? toMoney(latestSub.price) : planInfo.amountGhs);

    if (expectedAmount <= 0) {
        throw new AppError("Subscription payment amount must be greater than GHS 0.00.", 400, "INVALID_PAYMENT_AMOUNT");
    }

    let validatedPhone = null;
    if (MOMO_NETWORK_RULES[method] && payload.phone) {
        const phoneCheck = validateGhanaMomoPhone(payload.phone, method);
        if (!phoneCheck.valid) {
            throw new AppError(phoneCheck.reason, 400, "INVALID_GHANA_PHONE");
        }
        validatedPhone = phoneCheck;
    }

    const transactionRef = generateTransactionRef("GBS-SUB");
    const transferRef = payload.transferReference ? String(payload.transferReference).trim().slice(0, 120) : null;

    const txRecord = await prisma.paymentTransaction.create({
        data: {
            transactionRef,
            channel: "DEVELOPER_SUBSCRIPTION",
            provider: transferRef ? method : (String(payload.preferredProvider || method).toUpperCase()),
            paymentMethod: method,
            status: PAYMENT_STATUSES.UNDER_REVIEW,
            amount: expectedAmount,
            currency: "GHS",
            purpose: `${planInfo.label}${tenant ? ` — ${tenant.name}` : ""}`,
            hospitalId: tenant?.hospitalId || actor.hospitalId || null,
            tenantId: tenant?.id || null,
            subscriptionId: latestSub?.id || null,
            payerUserId: actor.id || null,
            payerName: payload.payerName || getActorDisplayName(actor),
            payerPhoneMasked: validatedPhone ? validatedPhone.maskedNumber : (payload.phone ? maskPhoneNumber(payload.phone) : null),
            payerEmail: payload.payerEmail || actor.email || tenant?.officialEmail || null,
            destinationAccount: DEVELOPER_MOMO_DESTINATION.phone,
            bankName: payload.bankName || null,
            bankDepositSlipRef: transferRef,
            customerInstructions:
                `Send GHS ${expectedAmount.toFixed(2)} to the official GBS Developer Mobile Money destination (${DEVELOPER_MOMO_DESTINATION.phone}) using reference "${transactionRef}". Subscription activates ONLY after GBS Developer verifies receipt or automated gateway confirms settlement.`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            metadata: {
                planType,
                durationDays: planInfo.durationDays,
                tenantName: tenant?.name || null,
                tenantCode: tenant?.tenantCode || null,
                destinationPhone: DEVELOPER_MOMO_DESTINATION.phone
            }
        }
    });

    await safeWriteAuditLog({
        userId: actor.id,
        role: actor.role,
        hospitalId: txRecord.hospitalId,
        tenantId: txRecord.tenantId,
        action: "DEVELOPER_SUBSCRIPTION_PAYMENT_INITIATED",
        description: `Hospital subscription payment ${transactionRef} (${planType}, GHS ${expectedAmount.toFixed(2)}) directed to GBS Developer destination ${DEVELOPER_MOMO_DESTINATION.phone}`,
        affectedRecord: transactionRef,
        outcome: "SUCCESS",
        httpStatus: 201
    });

    await safePublishNotification({
        title: "New Hospital Subscription Payment Pending Verification",
        message: `${tenant?.name || "Hospital"} submitted ${planType} subscription payment of GHS ${expectedAmount.toFixed(2)} (Ref: ${transactionRef}) to ${DEVELOPER_MOMO_DESTINATION.phone}.`,
        targetRole: "DEVELOPER",
        hospitalId: txRecord.hospitalId,
        tenantId: txRecord.tenantId,
        eventType: "SUBSCRIPTION_PAYMENT_SUBMITTED"
    });

    return {
        transaction: txRecord,
        developerDestination: DEVELOPER_MOMO_DESTINATION
    };
}

async function confirmDeveloperSubscriptionPayment(idOrRef, payload = {}, actor) {
    if (!actor || actor.role !== "DEVELOPER") {
        throw new AppError("Only the authorized GBS Developer may confirm subscription payments.", 403, "DEVELOPER_ONLY");
    }

    const txRecord = await prisma.paymentTransaction.findFirst({
        where: { OR: [{ id: idOrRef }, { transactionRef: idOrRef }] }
    });
    if (!txRecord || txRecord.channel !== "DEVELOPER_SUBSCRIPTION") {
        throw new AppError("Developer subscription payment transaction not found.", 404, "TRANSACTION_NOT_FOUND");
    }

    const decision = String(payload.decision || "APPROVE").trim().toUpperCase();
    if (decision === "REJECT") {
        const rejected = await prisma.paymentTransaction.update({
            where: { id: txRecord.id },
            data: {
                status: PAYMENT_STATUSES.FAILED,
                failureReason: payload.notes || "Developer could not verify transfer receipt on 0554594193.",
                verifiedById: actor.id,
                verifiedByName: getActorDisplayName(actor)
            }
        });
        return { verified: false, rejected: true, transaction: rejected };
    }

    return settlePaymentTransactionAtomically({
        transactionId: txRecord.id,
        providerRef: payload.verifiedReference || txRecord.bankDepositSlipRef || txRecord.transactionRef,
        verifiedById: actor.id,
        verifiedByName: getActorDisplayName(actor),
        verificationSource: "DEVELOPER_SUBSCRIPTION_VERIFICATION"
    });
}

/**
 * 8. Cancel Pending Transaction, Official Printable Receipt, Refund, Reports & Developer Console
 */
async function cancelTransaction(reference, payload = {}, actor) {
    const txRecord = await prisma.paymentTransaction.findFirst({
        where: { OR: [{ transactionRef: reference }, { id: reference }] }
    });
    if (!txRecord) {
        throw new AppError("Payment transaction not found.", 404, "TRANSACTION_NOT_FOUND");
    }

    await assertTransactionAccess(txRecord, actor);

    if ([PAYMENT_STATUSES.SUCCESSFUL, PAYMENT_STATUSES.REFUNDED, PAYMENT_STATUSES.REVERSED].includes(txRecord.status)) {
        throw new AppError("Cannot cancel a payment that has already settled or been refunded.", 409, "CANNOT_CANCEL_SETTLED");
    }

    const cancelled = await prisma.paymentTransaction.update({
        where: { id: txRecord.id },
        data: {
            status: PAYMENT_STATUSES.CANCELLED,
            failureReason: payload.reason || "Cancelled by user before confirmation."
        }
    });

    await safeWriteAuditLog({
        userId: actor.id,
        role: actor.role,
        hospitalId: txRecord.hospitalId,
        tenantId: txRecord.tenantId,
        action: "PAYMENT_CANCELLED",
        description: `Cancelled transaction ${txRecord.transactionRef}`,
        affectedRecord: txRecord.transactionRef,
        outcome: "SUCCESS",
        httpStatus: 200
    });

    return cancelled;
}

async function getOfficialReceipt(reference, actor) {
    const txRecord = await prisma.paymentTransaction.findFirst({
        where: { OR: [{ transactionRef: reference }, { receiptNumber: reference }, { id: reference }] }
    });
    if (!txRecord) {
        throw new AppError("Payment transaction not found.", 404, "TRANSACTION_NOT_FOUND");
    }

    await assertTransactionAccess(txRecord, actor);

    if (txRecord.status !== PAYMENT_STATUSES.SUCCESSFUL || !txRecord.receiptNumber) {
        throw new AppError(
            `Official receipt is unavailable while transaction status is "${txRecord.status}". Receipts are issued only after verified confirmation.`,
            409,
            "RECEIPT_NOT_AVAILABLE_UNTIL_CONFIRMED"
        );
    }

    const [branding, bill, patient] = await Promise.all([
        getFacilityBranding().catch(() => ({
            hospitalName: "GBS Hospital",
            logoUrl: "/hospital-logo.png",
            mainSystemName: "GBS Hospital Management System"
        })),
        txRecord.billId ? prisma.patientBill.findUnique({ where: { id: txRecord.billId } }) : null,
        txRecord.patientId ? prisma.patient.findUnique({ where: { id: txRecord.patientId } }) : null
    ]);

    return {
        receiptNumber: txRecord.receiptNumber,
        transactionRef: txRecord.transactionRef,
        providerRef: txRecord.providerRef,
        status: txRecord.status,
        institution: {
            name: branding.hospitalName || "GBS Hospital",
            logoUrl: branding.logoUrl || "/hospital-logo.png",
            systemName: branding.mainSystemName || "GBS Hospital Management System"
        },
        patient: patient
            ? {
                id: patient.id,
                patientNumber: patient.patientNumber,
                fullName: `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
            }
            : null,
        payer: {
            name: txRecord.payerName,
            phoneMasked: txRecord.payerPhoneMasked,
            email: txRecord.payerEmail
        },
        payment: {
            channel: txRecord.channel,
            purpose: txRecord.purpose,
            amountPaid: toMoney(txRecord.amount),
            currency: txRecord.currency || "GHS",
            paymentMethod: txRecord.paymentMethod,
            provider: txRecord.provider,
            confirmedAt: txRecord.confirmedAt,
            verifiedByName: txRecord.verifiedByName
        },
        billSummary: bill
            ? {
                billNumber: bill.billNumber,
                patientPayableAmount: toMoney(bill.patientPayableAmount),
                totalPaidToDate: toMoney(bill.paidAmount),
                remainingBalance: toMoney(bill.balanceDue),
                billStatus: bill.paymentStatus
            }
            : null
    };
}

async function refundTransaction(idOrRef, payload = {}, actor, opts = {}) {
    if (!actor || !FINANCE_APPROVER_ROLES.includes(actor.role)) {
        throw new AppError("Only authorized Hospital Accountants, Administrators, or Developer may process refunds.", 403, "FINANCE_ROLE_REQUIRED");
    }

    const txRecord = await prisma.paymentTransaction.findFirst({
        where: { OR: [{ id: idOrRef }, { transactionRef: idOrRef }] }
    });
    if (!txRecord) {
        throw new AppError("Payment transaction not found.", 404, "TRANSACTION_NOT_FOUND");
    }

    assertHospitalScope(actor, txRecord.hospitalId, txRecord.tenantId);

    if (txRecord.status !== PAYMENT_STATUSES.SUCCESSFUL) {
        throw new AppError("Only confirmed SUCCESSFUL transactions can be refunded.", 409, "REFUND_REQUIRES_SUCCESSFUL_TX");
    }

    const refundAmount = payload.amount !== undefined && Number(payload.amount) > 0
        ? toMoney(payload.amount)
        : toMoney(txRecord.amount);
    if (refundAmount <= 0 || refundAmount > toMoney(txRecord.amount)) {
        throw new AppError("Refund amount must be between GHS 0.01 and the confirmed transaction amount.", 400, "INVALID_REFUND_AMOUNT");
    }

    const reason = String(payload.reason || "Authorized Hospital Finance Refund").trim().slice(0, 300);

    // If Paystack online payment and configured, call real Paystack refund API
    let gatewayRefundRef = null;
    if (txRecord.provider === "PAYSTACK" && String(process.env.PAYSTACK_SECRET_KEY || "").trim()) {
        const gwRes = await paystackAdapter.refundTransaction(
            { providerRef: txRecord.providerRef || txRecord.transactionRef, amountGhs: refundAmount, reason },
            opts
        );
        if (!gwRes.ok) {
            throw new AppError(gwRes.error || "Gateway refund failed.", gwRes.httpStatus || 502, gwRes.code || "GATEWAY_REFUND_FAILED");
        }
        gatewayRefundRef = gwRes.refundRef;
    }

    const updated = await prisma.$transaction(async (tx) => {
        const refundedTx = await tx.paymentTransaction.update({
            where: { id: txRecord.id },
            data: {
                status: PAYMENT_STATUSES.REFUNDED,
                refundedAt: new Date(),
                refundAmount,
                refundReason: reason,
                metadata: {
                    ...(txRecord.metadata && typeof txRecord.metadata === "object" ? txRecord.metadata : {}),
                    gatewayRefundRef,
                    refundedBy: getActorDisplayName(actor)
                }
            }
        });

        if (txRecord.billId) {
            const bill = await tx.patientBill.findUnique({ where: { id: txRecord.billId } });
            if (bill) {
                const nextPaid = toMoney(Math.max(0, Number(bill.paidAmount) - refundAmount));
                const nextBalance = toMoney(Math.max(0, Number(bill.patientPayableAmount) - nextPaid));
                await tx.patientBill.update({
                    where: { id: bill.id },
                    data: {
                        paidAmount: nextPaid,
                        balanceDue: nextBalance,
                        paymentStatus: nextPaid <= 0 ? "REFUNDED" : "PARTIALLY_PAID"
                    }
                });
            }
        }

        return refundedTx;
    });

    await safeWriteAuditLog({
        userId: actor.id,
        role: actor.role,
        hospitalId: txRecord.hospitalId,
        tenantId: txRecord.tenantId,
        action: "PAYMENT_REFUNDED",
        description: `Refunded GHS ${refundAmount.toFixed(2)} for ${txRecord.transactionRef} (${reason})`,
        affectedRecord: txRecord.transactionRef,
        outcome: "SUCCESS",
        httpStatus: 200
    });

    return updated;
}

async function listTransactions(filters = {}, actor) {
    const where = {};

    if (actor?.role === "PATIENT") {
        const patient = await resolveActorPatient(actor);
        where.OR = [
            { payerUserId: actor.id },
            ...(patient ? [{ patientId: patient.id }] : [])
        ];
    } else if (actor?.role !== "DEVELOPER") {
        if (actor?.hospitalId) where.hospitalId = actor.hospitalId;
        if (actor?.tenantId) where.tenantId = actor.tenantId;
    } else {
        if (filters.hospitalId) where.hospitalId = filters.hospitalId;
        if (filters.tenantId) where.tenantId = filters.tenantId;
    }

    if (filters.channel) where.channel = String(filters.channel).toUpperCase();
    if (filters.status) where.status = String(filters.status).toUpperCase();
    if (filters.paymentMethod) where.paymentMethod = String(filters.paymentMethod).toUpperCase();
    if (filters.billId) where.billId = filters.billId;

    const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
    const transactions = await prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit
    });

    return { count: transactions.length, transactions };
}

async function getTransactionByRef(reference, actor) {
    const txRecord = await prisma.paymentTransaction.findFirst({
        where: { OR: [{ transactionRef: reference }, { id: reference }] }
    });
    if (!txRecord) {
        throw new AppError("Payment transaction not found.", 404, "TRANSACTION_NOT_FOUND");
    }
    await assertTransactionAccess(txRecord, actor);
    return txRecord;
}

async function getPaymentReports(filters = {}, actor) {
    const where = {};
    if (actor?.role !== "DEVELOPER") {
        if (actor?.hospitalId) where.hospitalId = actor.hospitalId;
        if (actor?.tenantId) where.tenantId = actor.tenantId;
    } else if (filters.hospitalId) {
        where.hospitalId = filters.hospitalId;
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allTx, outstandingBills] = await Promise.all([
        prisma.paymentTransaction.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 1000
        }),
        prisma.patientBill.findMany({
            where: {
                paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] },
                ...(actor?.role !== "DEVELOPER" && actor?.hospitalId
                    ? { encounter: { hospitalId: actor.hospitalId } }
                    : {})
            },
            select: { id: true, billNumber: true, balanceDue: true, paymentStatus: true }
        })
    ]);

    const confirmed = allTx.filter((t) => t.status === PAYMENT_STATUSES.SUCCESSFUL);
    const sumAmount = (list) => toMoney(list.reduce((acc, t) => acc + Number(t.amount || 0), 0));

    const dailyConfirmed = confirmed.filter((t) => t.confirmedAt && new Date(t.confirmedAt) >= startOfDay);
    const weeklyConfirmed = confirmed.filter((t) => t.confirmedAt && new Date(t.confirmedAt) >= startOfWeek);
    const monthlyConfirmed = confirmed.filter((t) => t.confirmedAt && new Date(t.confirmedAt) >= startOfMonth);

    const byMethod = {};
    for (const t of confirmed) {
        const k = t.paymentMethod || "OTHER";
        if (!byMethod[k]) byMethod[k] = { count: 0, totalAmount: 0 };
        byMethod[k].count += 1;
        byMethod[k].totalAmount = toMoney(byMethod[k].totalAmount + Number(t.amount || 0));
    }

    const byStatus = {};
    for (const t of allTx) {
        byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    }

    return {
        generatedAt: now.toISOString(),
        currency: "GHS",
        verifiedRevenue: {
            daily: { count: dailyConfirmed.length, total: sumAmount(dailyConfirmed) },
            weekly: { count: weeklyConfirmed.length, total: sumAmount(weeklyConfirmed) },
            monthly: { count: monthlyConfirmed.length, total: sumAmount(monthlyConfirmed) },
            allTimeConfirmed: { count: confirmed.length, total: sumAmount(confirmed) }
        },
        outstandingBills: {
            count: outstandingBills.length,
            totalBalanceDue: toMoney(outstandingBills.reduce((acc, b) => acc + Number(b.balanceDue || 0), 0))
        },
        exceptions: {
            underReviewCount: allTx.filter((t) => t.status === PAYMENT_STATUSES.UNDER_REVIEW).length,
            pendingCount: allTx.filter((t) => [PAYMENT_STATUSES.PENDING, PAYMENT_STATUSES.REQUIRES_CUSTOMER_ACTION, PAYMENT_STATUSES.PROCESSING].includes(t.status)).length,
            failedCount: allTx.filter((t) => t.status === PAYMENT_STATUSES.FAILED).length,
            reversedCount: allTx.filter((t) => t.status === PAYMENT_STATUSES.REVERSED).length,
            refundedCount: allTx.filter((t) => t.status === PAYMENT_STATUSES.REFUNDED).length,
            refundedTotal: toMoney(allTx.filter((t) => t.status === PAYMENT_STATUSES.REFUNDED).reduce((acc, t) => acc + Number(t.refundAmount || t.amount || 0), 0))
        },
        gatewayReconciliationByMethod: byMethod,
        statusBreakdown: byStatus
    };
}

/**
 * 9. Developer-Only Payment & Subscription Revenue Overview (Strictly Guarded)
 */
async function getDeveloperPaymentsOverview(filters = {}) {
    const [tenants, subTransactions, allTransactions, recentWebhooks] = await Promise.all([
        prisma.tenant.findMany({
            include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } },
            orderBy: { createdAt: "desc" },
            take: 100
        }),
        prisma.paymentTransaction.findMany({
            where: { channel: "DEVELOPER_SUBSCRIPTION" },
            orderBy: { createdAt: "desc" },
            take: 200
        }),
        prisma.paymentTransaction.findMany({
            orderBy: { createdAt: "desc" },
            take: 300
        }),
        prisma.paymentWebhookEvent.findMany({
            orderBy: { receivedAt: "desc" },
            take: 50
        })
    ]);

    const verifiedSubRevenue = toMoney(
        subTransactions
            .filter((t) => t.status === PAYMENT_STATUSES.SUCCESSFUL)
            .reduce((acc, t) => acc + Number(t.amount || 0), 0)
    );

    const verifiedHospitalCollections = toMoney(
        allTransactions
            .filter((t) => t.channel !== "DEVELOPER_SUBSCRIPTION" && t.status === PAYMENT_STATUSES.SUCCESSFUL)
            .reduce((acc, t) => acc + Number(t.amount || 0), 0)
    );

    const hospitalDirectory = tenants.map((t) => {
        const sub = t.subscriptions?.[0] || null;
        const tenantSubTxs = subTransactions.filter((tx) => tx.tenantId === t.id);
        const confirmedPaid = toMoney(
            tenantSubTxs
                .filter((tx) => tx.status === PAYMENT_STATUSES.SUCCESSFUL)
                .reduce((acc, tx) => acc + Number(tx.amount || 0), 0)
        );
        return {
            id: t.id,
            tenantId: t.tenantId,
            tenantCode: t.tenantCode,
            hospitalName: t.name,
            status: t.status,
            systemLocked: t.systemLocked,
            subscriptionPlan: sub?.plan || "UNASSIGNED",
            subscriptionStatus: sub?.status || "NONE",
            expectedAmount: sub ? toMoney(sub.price) : 0,
            currency: sub?.currency || "GHS",
            subscriptionEndDate: sub?.subscriptionEndDate || sub?.trialEndDate || null,
            confirmedSubscriptionPaid: confirmedPaid,
            pendingTransactionsCount: tenantSubTxs.filter((tx) =>
                [PAYMENT_STATUSES.PENDING, PAYMENT_STATUSES.UNDER_REVIEW, PAYMENT_STATUSES.REQUIRES_CUSTOMER_ACTION].includes(tx.status)
            ).length
        };
    });

    return {
        generatedAt: new Date().toISOString(),
        developerDestination: DEVELOPER_MOMO_DESTINATION,
        gatewayHealth: getPaymentGatewayStatus(),
        summary: {
            totalHospitals: tenants.length,
            verifiedSubscriptionRevenueGhs: verifiedSubRevenue,
            verifiedHospitalCollectionsGhs: verifiedHospitalCollections,
            pendingSubscriptionVerifications: subTransactions.filter((t) => t.status === PAYMENT_STATUSES.UNDER_REVIEW).length,
            pendingPaymentsAll: allTransactions.filter((t) =>
                [PAYMENT_STATUSES.PENDING, PAYMENT_STATUSES.REQUIRES_CUSTOMER_ACTION, PAYMENT_STATUSES.PROCESSING, PAYMENT_STATUSES.UNDER_REVIEW].includes(t.status)
            ).length,
            failedPaymentsAll: allTransactions.filter((t) => t.status === PAYMENT_STATUSES.FAILED).length,
            refundedPaymentsAll: allTransactions.filter((t) => t.status === PAYMENT_STATUSES.REFUNDED).length,
            failedWebhooksCount: recentWebhooks.filter((w) => !w.signatureValid || w.status === "FAILED").length
        },
        hospitals: hospitalDirectory,
        subscriptionTransactions: subTransactions.slice(0, 50),
        recentTransactions: allTransactions.slice(0, 60),
        recentWebhooks
    };
}

async function getWebhookLogs(filters = {}) {
    const where = {};
    if (filters.provider) where.provider = String(filters.provider).toUpperCase();
    if (filters.status) where.status = String(filters.status).toUpperCase();
    const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
    const events = await prisma.paymentWebhookEvent.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        take: limit
    });
    return { count: events.length, events };
}

module.exports = {
    PAYMENT_STATUSES,
    PAYMENT_METHODS,
    DEVELOPER_MOMO_DESTINATION,
    getProvidersSummary,
    initiatePayment,
    settlePaymentTransactionAtomically,
    processPaymentWebhook,
    verifyTransactionStatus,
    submitBankDepositProof,
    verifyBankDeposit,
    initiateDeveloperSubscriptionPayment,
    confirmDeveloperSubscriptionPayment,
    cancelTransaction,
    getOfficialReceipt,
    refundTransaction,
    listTransactions,
    getTransactionByRef,
    getPaymentReports,
    getDeveloperPaymentsOverview,
    getWebhookLogs
};
