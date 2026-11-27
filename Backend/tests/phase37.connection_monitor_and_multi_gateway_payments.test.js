"use strict";

/*
================================================================================
PHASE 37: INTELLIGENT CONNECTION MONITOR & MULTI-GATEWAY PAYMENT ENGINE SUITE
================================================================================
Verifies:
1. Multi-layer GET /api/v1/health & Developer-only /connection-diagnostics (401/403/200, 0 credential leaks)
2. Ghanaian MSISDN validation (MTN, Telecel Cash, AT Money), masking & prohibited PIN/CVV/PAN rejection
3. Public /payments/providers matrix (0554594193 destination, 0 secrets) & server-side amount tamper rejection
4. Bank Deposit partial payment (UNDER_REVIEW -> 409 early receipt -> Accountant verify -> PARTIALLY_PAID + Official Receipt)
5. Signed Paystack HMAC-SHA512 webhook (401 invalid sig -> 200 valid sig -> PAID -> duplicate replay blocked with zero double-credit)
6. Cross-hospital isolation (403 CROSS_HOSPITAL_ACCESS_DENIED), authorized refund recalculation & financial reports
7. Hospital Admin -> GBS Developer Subscription payment (0554594193) + Developer-only overview/webhooks & confirmation
8. Safe cancellation of pending transactions & 409 protection against cancelling settled payments
*/

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const request = require("supertest");

const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");
const { environment } = require("../src/config/environment");
const adapter = require("../src/core/integration/payment-gateway.adapter");

describe("Phase 37: Intelligent Connection Monitor & Multi-Gateway Hospital Payment Engine", () => {
    const prevWebhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;
    const webhookSecret = "sk_test_phase37_paystack_webhook_secret_key";

    let devToken;
    let adminHospitalAToken;
    let adminHospitalBToken;

    let hospitalA;
    let hospitalB;
    let patientA;
    let encounterA;
    let billA;

    const createdTxIds = [];
    let bankTxRef;
    let bankTxId;
    let psTxRef;

    beforeAll(async () => {
        process.env.PAYSTACK_WEBHOOK_SECRET = webhookSecret;

        const [devUser, adminUser] = await Promise.all([
            prisma.user.findFirst({ where: { email: "gabosei48@gmail.com" }, include: { role: true } }),
            prisma.user.findFirst({ where: { role: { name: "ADMINISTRATOR" } }, include: { role: true } })
        ]);

        const jwtSecret = environment.JWT_SECRET || process.env.JWT_SECRET;
        if (!devUser || !adminUser || !jwtSecret) {
            throw new Error("Seeded Developer/Admin users and JWT_SECRET are required for Phase 37 tests.");
        }

        // Create two isolated hospitals + patient + bill so cross-hospital isolation is rigorously tested
        const suffix = String(Date.now()).slice(-6);
        hospitalA = await prisma.hospital.create({
            data: {
                name: `Phase37 Hospital Alpha ${suffix}`,
                code: `P37-A-${suffix}`,
                country: "Ghana",
                city: "Accra"
            }
        });
        hospitalB = await prisma.hospital.create({
            data: {
                name: `Phase37 Hospital Beta ${suffix}`,
                code: `P37-B-${suffix}`,
                country: "Ghana",
                city: "Kumasi"
            }
        });

        patientA = await prisma.patient.create({
            data: {
                hospitalId: hospitalA.id,
                patientNumber: `MRN-P37-${suffix}`,
                firstName: "Kwame",
                lastName: "Boateng",
                gender: "MALE",
                phone: "0554594193",
                email: `kwame.p37.${suffix}@example.com`
            }
        });

        encounterA = await prisma.patientEncounter.create({
            data: {
                hospitalId: hospitalA.id,
                patientId: patientA.id,
                encounterNumber: `ENC-P37-${suffix}`,
                encounterType: "OUTPATIENT",
                status: "OPEN"
            }
        });

        billA = await prisma.patientBill.create({
            data: {
                encounterId: encounterA.id,
                patientId: patientA.id,
                billNumber: `BILL-P37-${suffix}`,
                grossAmount: 300.0,
                patientPayableAmount: 300.0,
                paidAmount: 0.0,
                balanceDue: 300.0,
                amount: 300.0,
                paymentStatus: "UNPAID",
                description: "Specialist Consultation & Diagnostic Labs"
            }
        });

        devToken = jwt.sign(
            { id: devUser.id, email: devUser.email, role: "DEVELOPER" },
            jwtSecret,
            { algorithm: "HS256", expiresIn: "1h" }
        );
        adminHospitalAToken = jwt.sign(
            { id: adminUser.id, email: adminUser.email, role: "ADMINISTRATOR", hospitalId: hospitalA.id },
            jwtSecret,
            { algorithm: "HS256", expiresIn: "1h" }
        );
        adminHospitalBToken = jwt.sign(
            { id: adminUser.id, email: adminUser.email, role: "ADMINISTRATOR", hospitalId: hospitalB.id },
            jwtSecret,
            { algorithm: "HS256", expiresIn: "1h" }
        );
    });

    afterAll(async () => {
        if (prevWebhookSecret !== undefined) process.env.PAYSTACK_WEBHOOK_SECRET = prevWebhookSecret;
        else delete process.env.PAYSTACK_WEBHOOK_SECRET;

        if (createdTxIds.length > 0) {
            await prisma.paymentTransaction.deleteMany({ where: { id: { in: createdTxIds } } }).catch(() => {});
        }
        if (psTxRef) {
            await prisma.paymentWebhookEvent.deleteMany({ where: { transactionRef: psTxRef } }).catch(() => {});
        }
        if (billA) {
            await prisma.patientPayment.deleteMany({ where: { billId: billA.id } }).catch(() => {});
            await prisma.patientBill.deleteMany({ where: { id: billA.id } }).catch(() => {});
        }
        if (encounterA) {
            await prisma.patientEncounter.deleteMany({ where: { id: encounterA.id } }).catch(() => {});
        }
        if (patientA) {
            await prisma.patient.deleteMany({ where: { id: patientA.id } }).catch(() => {});
        }
        if (hospitalA || hospitalB) {
            await prisma.hospital.deleteMany({
                where: { id: { in: [hospitalA?.id, hospitalB?.id].filter(Boolean) } }
            }).catch(() => {});
        }
    });

    test("1. Multi-layer /api/v1/health & Developer-only /connection-diagnostics enforce RBAC and zero credential leaks", async () => {
        const healthRes = await request(app).get("/api/v1/health");
        expect(healthRes.statusCode).toBe(200);
        expect(healthRes.body.overallStatus).toBe("ONLINE");
        expect(healthRes.body.centralEngine).toBe("ONLINE");
        expect(healthRes.body.databaseStatus).toBe("ONLINE");
        expect(typeof healthRes.body.databaseLatencyMs).toBe("number");

        const unauthDiag = await request(app).get("/api/v1/health/connection-diagnostics");
        expect(unauthDiag.statusCode).toBe(401);

        const adminDiag = await request(app)
            .get("/api/v1/health/connection-diagnostics")
            .set("Authorization", `Bearer ${adminHospitalAToken}`);
        expect(adminDiag.statusCode).toBe(403);

        const devDiag = await request(app)
            .get("/api/v1/health/connection-diagnostics")
            .set("Authorization", `Bearer ${devToken}`);
        expect(devDiag.statusCode).toBe(200);
        expect(devDiag.body.data.overallStatus).toBe("ONLINE");
        expect(devDiag.body.data.components.centralEngine.status).toBe("ONLINE");
        expect(devDiag.body.data.components.database.status).toBe("ONLINE");
        expect(devDiag.body.data.telemetry).toHaveProperty("lastSuccessfulConnection");
        expect(devDiag.body.data.telemetry).toHaveProperty("recentConnectionErrors");

        const serialized = JSON.stringify(devDiag.body);
        expect(serialized).not.toMatch(/postgres(?:ql)?:\/\//i);
        expect(serialized).not.toContain(process.env.JWT_SECRET || "__NEVER__");
    });

    test("2. Ghanaian MSISDN validation, phone masking, and prohibited MoMo PIN/CVV/PAN blocking", async () => {
        expect(adapter.validateGhanaMomoPhone("+233 55 459 4193", "MTN_MOMO")).toMatchObject({
            valid: true,
            localNumber: "0554594193",
            maskedNumber: "055****193"
        });
        expect(adapter.validateGhanaMomoPhone("0201234567", "TELECEL_CASH").valid).toBe(true);
        expect(adapter.validateGhanaMomoPhone("0271234567", "AT_MONEY").valid).toBe(true);
        expect(adapter.validateGhanaMomoPhone("0201234567", "MTN_MOMO").valid).toBe(false);

        const pinRes = await request(app)
            .post("/api/v1/payments/initiate")
            .set("Authorization", `Bearer ${adminHospitalAToken}`)
            .send({
                billId: billA.id,
                amount: 100,
                paymentMethod: "MTN_MOMO",
                phone: "0554594193",
                momoPin: "1234"
            });
        expect(pinRes.statusCode).toBe(400);
        expect(pinRes.body.code).toBe("PROHIBITED_SENSITIVE_FIELD");
    });

    test("3. Public /payments/providers exposes official destination 0554594193 and initiation blocks tampered amounts", async () => {
        const provRes = await request(app).get("/api/v1/payments/providers");
        expect(provRes.statusCode).toBe(200);
        expect(provRes.body.data.developerDestination.phone).toBe("0554594193");
        expect(JSON.stringify(provRes.body)).not.toContain(webhookSecret);

        const tamperRes = await request(app)
            .post("/api/v1/payments/initiate")
            .set("Authorization", `Bearer ${adminHospitalAToken}`)
            .send({
                billId: billA.id,
                amount: 999.99,
                paymentMethod: "BANK_DEPOSIT"
            });
        expect(tamperRes.statusCode).toBe(400);
        expect(tamperRes.body.code).toBe("AMOUNT_EXCEEDS_BALANCE");
    });

    test("4. Partial bank deposit stays UNDER_REVIEW, blocks early receipt (409), and settles on Finance verification", async () => {
        const submitRes = await request(app)
            .post("/api/v1/payments/bank-deposits/submit")
            .set("Authorization", `Bearer ${adminHospitalAToken}`)
            .send({
                billId: billA.id,
                amount: 100.0,
                bankName: "GCB Bank Ghana",
                bankDepositSlipRef: `GCB-P37-${Date.now()}`
            });
        expect(submitRes.statusCode).toBe(201);
        const tx = submitRes.body.data.transaction;
        createdTxIds.push(tx.id);
        bankTxId = tx.id;
        bankTxRef = tx.transactionRef;
        expect(tx.status).toBe("UNDER_REVIEW");

        // Early receipt must be blocked before confirmation
        const earlyReceipt = await request(app)
            .get(`/api/v1/payments/receipts/${bankTxRef}`)
            .set("Authorization", `Bearer ${adminHospitalAToken}`);
        expect(earlyReceipt.statusCode).toBe(409);

        // Authorized Accountant / Admin verifies deposit -> PARTIALLY_PAID (GHS 200 remaining)
        const verifyRes = await request(app)
            .post(`/api/v1/payments/bank-deposits/${bankTxId}/verify`)
            .set("Authorization", `Bearer ${adminHospitalAToken}`)
            .send({ decision: "APPROVE", verifiedReference: "GCB-STMT-MATCH-01" });
        expect(verifyRes.statusCode).toBe(200);
        expect(verifyRes.body.data.transaction.status).toBe("SUCCESSFUL");
        expect(verifyRes.body.data.transaction.receiptNumber).toMatch(/^GBS-RCPT-/);
        expect(Number(verifyRes.body.data.bill.balanceDue)).toBe(200);
        expect(verifyRes.body.data.bill.paymentStatus).toBe("PARTIALLY_PAID");

        // Official printable receipt now available
        const receiptRes = await request(app)
            .get(`/api/v1/payments/receipts/${bankTxRef}`)
            .set("Authorization", `Bearer ${adminHospitalAToken}`);
        expect(receiptRes.statusCode).toBe(200);
        expect(receiptRes.body.data.receiptNumber).toBe(verifyRes.body.data.transaction.receiptNumber);
        expect(receiptRes.body.data.billSummary.remainingBalance).toBe(200);
    });

    test("5. Signed Paystack HMAC-SHA512 webhook settles remaining GHS 200 and blocks duplicate replays (zero double-credit)", async () => {
        psTxRef = `GBS-PAY-P37WH-${Date.now()}`;
        const pendingTx = await prisma.paymentTransaction.create({
            data: {
                transactionRef: psTxRef,
                channel: "PATIENT_BILL",
                provider: "PAYSTACK",
                paymentMethod: "MTN_MOMO",
                status: "REQUIRES_CUSTOMER_ACTION",
                amount: 200.0,
                currency: "GHS",
                hospitalId: hospitalA.id,
                patientId: patientA.id,
                billId: billA.id,
                payerName: "Kwame Boateng",
                payerPhoneMasked: "055****193",
                providerRef: psTxRef
            }
        });
        createdTxIds.push(pendingTx.id);

        const payload = {
            event: "charge.success",
            data: {
                id: Number(String(Date.now()).slice(-8)),
                reference: psTxRef,
                amount: 20000,
                currency: "GHS",
                status: "success"
            }
        };
        const raw = JSON.stringify(payload);
        const validSig = crypto.createHmac("sha512", webhookSecret).update(raw).digest("hex");

        // Forged webhook rejected with 401
        const badRes = await request(app)
            .post("/api/v1/payments/webhooks/paystack")
            .set("Content-Type", "application/json")
            .set("x-paystack-signature", "invalid_hmac_signature")
            .send(raw);
        expect(badRes.statusCode).toBe(401);

        // Valid signed webhook settles bill to PAID (balanceDue = 0)
        const okRes = await request(app)
            .post("/api/v1/payments/webhooks/paystack")
            .set("Content-Type", "application/json")
            .set("x-paystack-signature", validSig)
            .send(raw);
        expect(okRes.statusCode).toBe(200);
        expect(okRes.body.data.processed).toBe(true);
        expect(okRes.body.data.status).toBe("SUCCESSFUL");

        // Replay exact same webhook -> ignored safely, zero double credit!
        const dupRes = await request(app)
            .post("/api/v1/payments/webhooks/paystack")
            .set("Content-Type", "application/json")
            .set("x-paystack-signature", validSig)
            .send(raw);
        expect(dupRes.statusCode).toBe(200);
        expect(dupRes.body.data.duplicateIgnored).toBe(true);

        const settledBill = await prisma.patientBill.findUnique({ where: { id: billA.id } });
        expect(Number(settledBill.paidAmount)).toBe(300);
        expect(Number(settledBill.balanceDue)).toBe(0);
        expect(settledBill.paymentStatus).toBe("PAID");
    });

    test("6. Strict cross-hospital isolation (403), authorized refund balance recalculation & financial reports", async () => {
        // Hospital B admin MUST NOT view Hospital A's transaction or receipt
        const crossView = await request(app)
            .get(`/api/v1/payments/transactions/${bankTxRef}`)
            .set("Authorization", `Bearer ${adminHospitalBToken}`);
        expect(crossView.statusCode).toBe(403);
        expect(crossView.body.code).toBe("CROSS_HOSPITAL_ACCESS_DENIED");

        // Cancelling an already settled transaction is blocked (409)
        const cancelSettled = await request(app)
            .post(`/api/v1/payments/transactions/${bankTxRef}/cancel`)
            .set("Authorization", `Bearer ${adminHospitalAToken}`)
            .send({ reason: "Attempt cancel after settled" });
        expect(cancelSettled.statusCode).toBe(409);

        // Authorized refund of GHS 100 recalculates bill balanceDue to GHS 100
        const refundRes = await request(app)
            .post(`/api/v1/payments/transactions/${bankTxId}/refund`)
            .set("Authorization", `Bearer ${adminHospitalAToken}`)
            .send({ amount: 100.0, reason: "Phase 37 refund verification" });
        expect(refundRes.statusCode).toBe(200);
        expect(refundRes.body.data.status).toBe("REFUNDED");

        const updatedBill = await prisma.patientBill.findUnique({ where: { id: billA.id } });
        expect(Number(updatedBill.balanceDue)).toBe(100);
        expect(updatedBill.paymentStatus).toBe("PARTIALLY_PAID");

        const reportsRes = await request(app)
            .get("/api/v1/payments/reports")
            .set("Authorization", `Bearer ${adminHospitalAToken}`);
        expect(reportsRes.statusCode).toBe(200);
        expect(reportsRes.body.data.exceptions.refundedCount).toBeGreaterThanOrEqual(1);
    });

    test("7. Hospital Admin -> GBS Developer Subscription (0554594193) + Developer-only overview & confirmation", async () => {
        const subInit = await request(app)
            .post("/api/v1/payments/developer-subscriptions/initiate")
            .set("Authorization", `Bearer ${adminHospitalAToken}`)
            .send({
                planType: "MONTHLY",
                paymentMethod: "MTN_MOMO",
                phone: "0554594193",
                transferReference: `MOMO-SUB-P37-${Date.now()}`
            });
        expect(subInit.statusCode).toBe(201);
        const subTx = subInit.body.data.transaction;
        createdTxIds.push(subTx.id);
        expect(subTx.destinationAccount).toBe("0554594193");
        expect(subTx.status).toBe("UNDER_REVIEW");

        // Non-developer blocked from Developer overview & webhook audit logs
        const adminDevOverview = await request(app)
            .get("/api/v1/payments/developer/overview")
            .set("Authorization", `Bearer ${adminHospitalAToken}`);
        expect(adminDevOverview.statusCode).toBe(403);

        const adminDevConfirm = await request(app)
            .post(`/api/v1/payments/developer-subscriptions/${subTx.id}/confirm`)
            .set("Authorization", `Bearer ${adminHospitalAToken}`)
            .send({ decision: "APPROVE" });
        expect(adminDevConfirm.statusCode).toBe(403);

        // Authorized Developer confirms subscription payment
        const devConfirm = await request(app)
            .post(`/api/v1/payments/developer-subscriptions/${subTx.id}/confirm`)
            .set("Authorization", `Bearer ${devToken}`)
            .send({ decision: "APPROVE", verifiedReference: "MOMO-0554594193-VERIFIED" });
        expect(devConfirm.statusCode).toBe(200);
        expect(devConfirm.body.data.transaction.status).toBe("SUCCESSFUL");

        const [devOverview, devWebhooks] = await Promise.all([
            request(app).get("/api/v1/payments/developer/overview").set("Authorization", `Bearer ${devToken}`),
            request(app).get("/api/v1/payments/developer/webhooks").set("Authorization", `Bearer ${devToken}`)
        ]);
        expect(devOverview.statusCode).toBe(200);
        expect(devOverview.body.data.developerDestination.phone).toBe("0554594193");
        expect(devWebhooks.statusCode).toBe(200);
        expect(Array.isArray(devWebhooks.body.data.events)).toBe(true);
    });

    test("8. Safe cancellation of pending transaction transitions status to CANCELLED without crediting bill", async () => {
        const initBank = await request(app)
            .post("/api/v1/payments/initiate")
            .set("Authorization", `Bearer ${adminHospitalAToken}`)
            .send({
                billId: billA.id,
                amount: 50.0,
                paymentMethod: "BANK_DEPOSIT"
            });
        expect(initBank.statusCode).toBe(201);
        const pendingTx = initBank.body.data.transaction;
        createdTxIds.push(pendingTx.id);

        const cancelRes = await request(app)
            .post(`/api/v1/payments/transactions/${pendingTx.transactionRef}/cancel`)
            .set("Authorization", `Bearer ${adminHospitalAToken}`)
            .send({ reason: "Customer switched method" });
        expect(cancelRes.statusCode).toBe(200);
        expect(cancelRes.body.data.status).toBe("CANCELLED");

        const unchangedBill = await prisma.patientBill.findUnique({ where: { id: billA.id } });
        expect(Number(unchangedBill.balanceDue)).toBe(100);
    });
});
