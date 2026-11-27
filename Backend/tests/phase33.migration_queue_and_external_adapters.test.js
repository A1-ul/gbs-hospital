"use strict";

/*
================================================================================
PHASE 33 (REMEDIATION PROCEDURE 4):
MIGRATION BACKGROUND QUEUE WORKER, DOWNLOADABLE VERIFICATION REPORTS (STEP 30),
AND TRUTHFUL EXTERNAL INTEGRATION ADAPTERS (SMTP, SMS, PAYSTACK/STRIPE)
================================================================================
*/

const crypto = require("crypto");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");
const {
    emailAdapter,
    smsAdapter,
    paymentGatewayAdapter,
    getAllExternalAdapterStatuses
} = require("../src/core/integration");

const ADMIN_EMAIL = "admin@gbs.com";
const ADMIN_PASS = process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin123";

describe("Phase 33: Migration Queue Worker, Verification Reports & Truthful External Adapters", () => {
    let adminToken;
    let testJobId;
    const uniqueSuffix = Date.now().toString(36).toUpperCase();

    beforeAll(async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: ADMIN_EMAIL, password: ADMIN_PASS });
        expect(res.statusCode).toBe(200);
        adminToken = res.body.data.token;
    }, 60000);

    afterAll(async () => {
        if (testJobId) {
            await prisma.migrationRecordItem.deleteMany({ where: { jobId: testJobId } }).catch(() => {});
            await prisma.migrationJob.deleteMany({ where: { id: testJobId } }).catch(() => {});
        }
    });

    test("1. GET /api/v1/migration/queue/status reports truthful active migration queue driver and worker readiness", async () => {
        const res = await request(app)
            .get("/api/v1/migration/queue/status")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(["BULLMQ_REDIS", "POSTGRESQL_ASYNC_QUEUE"]).toContain(res.body.data.driver);
        expect(res.body.data.workerRegistered).toBe(true);
        expect(res.body.data.counts).toHaveProperty("completed");
    });

    test("2. Step 30 Background Queue Worker enforces approval gate, processes approved job, and generates SHA-256 JSON/CSV verification reports", async () => {
        const csvPayload = [
            "service_code,service_name,category,cash_price,nhis_price",
            `TRF-Q-${uniqueSuffix}-1,Phase33 Queue Verification Consultation,CONSULTATION,85.00,45.00`,
            `TRF-Q-${uniqueSuffix}-2,Phase33 Queue Verification Lab Panel,LABORATORY,120.00,70.00`
        ].join("\n");

        // 1. Upload & Initialize
        const initRes = await request(app)
            .post("/api/v1/migration/jobs")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                targetEntity: "BILLING_TARIFFS",
                sourceType: "CSV",
                fileName: `phase33_queue_${uniqueSuffix}.csv`,
                rawData: csvPayload
            });
        expect(initRes.statusCode).toBe(201);
        testJobId = initRes.body.data.job.id;

        // 2. Unapproved job MUST be rejected from enqueue (400)
        const unapprovedEnq = await request(app)
            .post(`/api/v1/migration/jobs/${testJobId}/enqueue`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ syncWait: true });
        expect(unapprovedEnq.statusCode).toBe(400);
        expect(unapprovedEnq.body.code).toBe("MIGRATION_APPROVAL_REQUIRED");

        // 3. Apply Mapping & Validate
        const mapRes = await request(app)
            .post(`/api/v1/migration/jobs/${testJobId}/mapping`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                columnMappings: {
                    code: "service_code",
                    name: "service_name",
                    category: "category",
                    standardCashPrice: "cash_price",
                    nhisPrice: "nhis_price"
                }
            });
        expect(mapRes.statusCode).toBe(200);

        // 4. Approve Job
        const appRes = await request(app)
            .post(`/api/v1/migration/jobs/${testJobId}/approve`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({});
        expect(appRes.statusCode).toBe(200);

        // 5. Enqueue & Execute via Migration Queue Worker (syncWait: true)
        const enqRes = await request(app)
            .post(`/api/v1/migration/jobs/${testJobId}/enqueue`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ duplicateStrategy: "SKIP", syncWait: true });
        expect(enqRes.statusCode).toBe(200);
        expect(enqRes.body.data.state).toBe("COMPLETED");
        expect(enqRes.body.data.resultSummary.imported).toBe(2);

        // 6. Download JSON Verification Report with SHA-256 checksum header
        const jsonReport = await request(app)
            .get(`/api/v1/migration/jobs/${testJobId}/report?format=json`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(jsonReport.statusCode).toBe(200);
        expect(jsonReport.headers["x-report-sha256"]).toHaveLength(64);
        expect(jsonReport.body.data.totals.importedRecords).toBe(2);
        expect(jsonReport.body.data.rows.length).toBe(2);

        // 7. Download CSV Verification Report
        const csvReport = await request(app)
            .get(`/api/v1/migration/jobs/${testJobId}/report?format=csv`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(csvReport.statusCode).toBe(200);
        expect(csvReport.headers["content-type"]).toMatch(/text\/csv/i);
        expect(csvReport.text).toContain("rowNumber,status,createdEntityId,errorMessage");

        // 8. Clean atomic rollback of test tariffs
        const rbRes = await request(app)
            .post(`/api/v1/migration/jobs/${testJobId}/rollback`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ reason: "Phase 33 cleanup rollback" });
        expect(rbRes.statusCode).toBe(200);
        expect(rbRes.body.data.revertedCount).toBe(2);
    });

    test("3. External Adapters report truthful unconfigured status (zero fake delivery) and verify Paystack HMAC-SHA512 signatures cryptographically", async () => {
        const statuses = getAllExternalAdapterStatuses();
        expect(statuses.length).toBe(3);
        expect(statuses.map((s) => s.key)).toEqual(["SMTP_EMAIL", "SMS_GATEWAY", "PAYMENT_GATEWAY"]);

        // When unconfigured in test env, adapters must NEVER fake successful delivery
        if (!process.env.SMTP_HOST) {
            const mailRes = await emailAdapter.sendEmail({ to: "test@example.com", subject: "Test", text: "Body" });
            expect(mailRes.delivered).toBe(false);
            expect(mailRes.status).toBe("NOT_CONFIGURED");
        }
        if (!process.env.SMS_API_KEY) {
            const smsRes = await smsAdapter.sendSms({ to: "+233200000000", message: "Test" });
            expect(smsRes.delivered).toBe(false);
            expect(smsRes.status).toBe("NOT_CONFIGURED");
        }
        if (!process.env.PAYSTACK_SECRET_KEY) {
            const payRes = await paymentGatewayAdapter.verifyPaystackTransaction("REF-123");
            expect(payRes.verified).toBe(false);
            expect(payRes.status).toBe("MANUAL_RECEIPT_MODE");
        }

        // Verify cryptographic Paystack HMAC-SHA512 webhook signature validation
        const testSecret = "sk_test_gbs_hospital_hmac_unit_verification_only";
        const bodyStr = JSON.stringify({ event: "charge.success", data: { reference: "GBS-PAY-001", amount: 5000 } });
        const validSig = crypto.createHmac("sha512", testSecret).update(bodyStr).digest("hex");
        const tamperedSig = crypto.createHmac("sha512", "wrong_secret").update(bodyStr).digest("hex");

        expect(paymentGatewayAdapter.verifyPaystackWebhookSignature(bodyStr, validSig, testSecret)).toBe(true);
        expect(paymentGatewayAdapter.verifyPaystackWebhookSignature(bodyStr, tamperedSig, testSecret)).toBe(false);
    });
});
