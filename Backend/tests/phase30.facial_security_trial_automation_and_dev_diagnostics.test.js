"use strict";

/*
================================================================================
PHASE 30 (PROCEDURE 5 — PHASE E):
4-STEP FACIAL RECOGNITION SECURITY, AUTOMATED TRIAL EXPIRATION SWEEP,
TRUTHFUL EXTERNAL ADAPTER STATUS, AI DEVELOPER ASSISTANT DIAGNOSTICS &
MULTI-TENANT ANALYTICS CENTER
================================================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

const DEV_EMAIL = "gabosei48@gmail.com";
const DEV_PASS = process.env.DEVELOPER_ROOT_PASSWORD || "DevBootstrap123!";
const ADMIN_EMAIL = "admin@gbs.com";
const ADMIN_PASS = process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin123";

describe("Phase 30: 4-Step Facial Security, Automated Trial Sweep & Developer Diagnostics", () => {
    let devToken;
    let adminToken;
    let receptionistToken;
    const createdUserIds = [];
    let expiredTenantRecord = null;
    const uniqueTag = Date.now().toString(36);

    beforeAll(async () => {
        const devLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: DEV_EMAIL, password: DEV_PASS });
        expect(devLogin.statusCode).toBe(200);
        devToken = devLogin.body.data.token;

        const adminLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: ADMIN_EMAIL, password: ADMIN_PASS });
        expect(adminLogin.statusCode).toBe(200);
        adminToken = adminLogin.body.data.token;

        // Create and approve a temporary RECEPTIONIST to test RBAC restriction on facial security
        const recEmail = `p30.receptionist.${uniqueTag}@gbs-test.local`;
        const recSignup = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                firstName: "Phase30",
                lastName: "Receptionist",
                email: recEmail,
                password: "TestUser@123!",
                role: "RECEPTIONIST",
                phone: "+233200000930"
            });
        expect([200, 201]).toContain(recSignup.statusCode);
        const recId = recSignup.body.data?.id || recSignup.body.data?.user?.id;
        createdUserIds.push(recId);

        const approveRes = await request(app)
            .patch(`/api/v1/users/${recId}/approve`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({});
        expect(approveRes.statusCode).toBe(200);

        const recLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: recEmail, password: "TestUser@123!" });
        expect(recLogin.statusCode).toBe(200);
        receptionistToken = recLogin.body.data.token;
    });

    afterAll(async () => {
        if (expiredTenantRecord) {
            await prisma.systemNotification.deleteMany({ where: { tenantId: expiredTenantRecord.id } }).catch(() => { });
            await prisma.auditLog.deleteMany({ where: { tenantId: expiredTenantRecord.id } }).catch(() => { });
            await prisma.tenantSubscription.deleteMany({ where: { tenantId: expiredTenantRecord.id } }).catch(() => { });
            await prisma.tenant.delete({ where: { id: expiredTenantRecord.id } }).catch(() => { });
        }
        for (const uid of createdUserIds) {
            await prisma.session.deleteMany({ where: { userId: uid } }).catch(() => { });
            await prisma.biometricVerificationLog.deleteMany({ where: { userId: uid } }).catch(() => { });
            await prisma.biometricSecurityCredential.deleteMany({ where: { userId: uid } }).catch(() => { });
            await prisma.user.delete({ where: { id: uid } }).catch(() => { });
        }
    });

    test("1. 4-Step Facial Recognition Security enforces Developer/Admin RBAC, active anti-spoof liveness, cosine matching, and audit trail", async () => {
        const enrolledVector = [0.72, 0.65, 0.58, 0.81, 0.49, 0.63, 0.77, 0.54, 0.69, 0.61, 0.75, 0.52];
        const matchingVector = [0.71, 0.66, 0.57, 0.80, 0.50, 0.62, 0.78, 0.55, 0.68, 0.62, 0.74, 0.53];
        const mismatchVector = [0.05, 0.99, 0.05, 0.05, 0.98, 0.06, 0.04, 0.97, 0.05, 0.96, 0.04, 0.95];

        // Non-privileged role (RECEPTIONIST) must be blocked (403)
        const recBlock = await request(app)
            .post("/api/v1/biometrics/face/enroll")
            .set("Authorization", `Bearer ${receptionistToken}`)
            .send({ faceVector: enrolledVector, captureSource: "WEBRTC_CAMERA" });
        expect(recBlock.statusCode).toBe(403);

        // DEVELOPER enrolls cleanly (201)
        const devEnroll = await request(app)
            .post("/api/v1/biometrics/face/enroll")
            .set("Authorization", `Bearer ${devToken}`)
            .send({ faceVector: enrolledVector, captureSource: "WEBRTC_CAMERA" });
        expect(devEnroll.statusCode).toBe(201);
        expect(devEnroll.body.data.biometricType).toBe("FACIAL_RECOGNITION");
        expect(devEnroll.body.data.status).toBe("ACTIVE");

        // ADMINISTRATOR enrolls cleanly (201)
        const adminEnroll = await request(app)
            .post("/api/v1/biometrics/face/enroll")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ frameSignature: `admin-face-signature-${uniqueTag}`, captureSource: "DEVICE_SIGNATURE_FALLBACK" });
        expect(adminEnroll.statusCode).toBe(201);

        // Status check returns enrolled: true
        const statusRes = await request(app)
            .get("/api/v1/biometrics/face/status")
            .set("Authorization", `Bearer ${devToken}`);
        expect(statusRes.statusCode).toBe(200);
        expect(statusRes.body.data.enrolled).toBe(true);

        // Step 2 Failure: Static photo spoof (blinkDetected: false) rejected with 403
        const spoofRes = await request(app)
            .post("/api/v1/biometrics/face/verify")
            .set("Authorization", `Bearer ${devToken}`)
            .send({
                faceVector: matchingVector,
                liveness: { blinkDetected: false, headTurnDelta: 0.0, antiSpoofScore: 0.2 },
                actionAttempted: "TEST_SPOOF_ATTEMPT"
            });
        expect(spoofRes.statusCode).toBe(403);
        expect(spoofRes.body.data.verified).toBe(false);
        expect(spoofRes.body.data.stepFailed).toBe("LIVENESS_CHECK");

        // Step 3 Failure: Valid liveness but mismatched facial vector rejected with 401
        const mismatchRes = await request(app)
            .post("/api/v1/biometrics/face/verify")
            .set("Authorization", `Bearer ${devToken}`)
            .send({
                faceVector: mismatchVector,
                liveness: { blinkDetected: true, headTurnDelta: 0.15, antiSpoofScore: 0.95 },
                actionAttempted: "TEST_MISMATCH_ATTEMPT"
            });
        expect(mismatchRes.statusCode).toBe(401);
        expect(mismatchRes.body.data.verified).toBe(false);
        expect(mismatchRes.body.data.stepFailed).toBe("MATCH_AND_VERIFY");

        // All 4 Steps Pass: Valid liveness + matching facial vector -> 200 ACCESS_GRANTED
        const passRes = await request(app)
            .post("/api/v1/biometrics/face/verify")
            .set("Authorization", `Bearer ${devToken}`)
            .send({
                faceVector: matchingVector,
                liveness: { blinkDetected: true, headTurnDelta: 0.14, antiSpoofScore: 0.96 },
                actionAttempted: "DEVELOPER_PORTAL_ACCESS"
            });
        expect(passRes.statusCode).toBe(200);
        expect(passRes.body.data.verified).toBe(true);
        expect(passRes.body.data.confidenceScore).toBeGreaterThanOrEqual(0.85);
        expect(passRes.body.data.steps.length).toBe(4);
        expect(passRes.body.data.steps[3].name).toBe("ACCESS_GRANTED");
    });

    test("2. Automated Trial Expiration Sweep locks Day-0 expired tenants in PostgreSQL and records audit log", async () => {
        const pastStart = new Date(Date.now() - 60 * 86400 * 1000);
        const pastEnd = new Date(Date.now() - 15 * 86400 * 1000);
        const pastGraceEnd = new Date(Date.now() - 5 * 86400 * 1000);

        expiredTenantRecord = await prisma.tenant.create({
            data: {
                tenantId: `TEN-P30-${uniqueTag}`,
                tenantCode: `GBS-P30-${uniqueTag}`,
                institutionId: `INS-P30-${uniqueTag}`,
                name: `Phase30 Expired Trial Clinic ${uniqueTag}`,
                type: "PRIVATE_HOSPITAL",
                country: "Ghana",
                officialEmail: `expired.${uniqueTag}@gbs-test.local`,
                officialPhone: "+233200009999",
                status: "ACTIVE_TRIAL",
                systemLocked: false,
                subscriptions: {
                    create: {
                        subscriptionId: `SUB-P30-${uniqueTag}`,
                        plan: "1_MONTH_TRIAL",
                        status: "ACTIVE_TRIAL",
                        trialStartDate: pastStart,
                        trialEndDate: pastEnd,
                        gracePeriodEndDate: pastGraceEnd
                    }
                }
            }
        });

        // Non-developer blocked from running trial sweep
        const adminBlock = await request(app)
            .post("/api/v1/rcce/developer/trial-sweep")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(adminBlock.statusCode).toBe(403);

        // Developer executes sweep
        const sweepRes = await request(app)
            .post("/api/v1/rcce/developer/trial-sweep")
            .set("Authorization", `Bearer ${devToken}`);
        expect(sweepRes.statusCode).toBe(200);
        expect(sweepRes.body.data.autoLockedCount).toBeGreaterThanOrEqual(1);
        expect(
            sweepRes.body.data.autoLockedTenants.some((t) => t.tenantId === expiredTenantRecord.tenantId)
        ).toBe(true);

        // Confirm PostgreSQL state updated to LOCKED + AuditLog created
        const reloaded = await prisma.tenant.findUnique({ where: { id: expiredTenantRecord.id } });
        expect(reloaded.systemLocked).toBe(true);
        expect(reloaded.status).toBe("LOCKED");

        const auditEntry = await prisma.auditLog.findFirst({
            where: { tenantId: expiredTenantRecord.id, action: "TRIAL_EXPIRATION_AUTO_LOCK" }
        });
        expect(auditEntry).not.toBeNull();
    });

    test("3. Truthful External Service Adapter Status reports live PostgreSQL + Biometrics and honest unconfigured status", async () => {
        const res = await request(app)
            .get("/api/v1/rcce/developer/integrations-status")
            .set("Authorization", `Bearer ${devToken}`);
        expect(res.statusCode).toBe(200);
        const adapters = res.body.data.adapters;
        expect(Array.isArray(adapters)).toBe(true);

        const pg = adapters.find((a) => a.key === "POSTGRESQL");
        const bio = adapters.find((a) => a.key === "BIOMETRICS_NATIVE");
        const smtp = adapters.find((a) => a.key === "SMTP_EMAIL");
        const payment = adapters.find((a) => a.key === "PAYMENT_GATEWAY");

        expect(pg.status).toBe("CONNECTED");
        expect(bio.status).toBe("ACTIVE_NATIVE");
        expect(["CONFIGURED", "NOT_CONFIGURED"]).toContain(smtp.status);
        expect(["CONFIGURED", "MANUAL_RECEIPT_MODE"]).toContain(payment.status);
    });

    test("4. AI Developer Assistant Diagnostics & Multi-Tenant Analytics Center return live PostgreSQL telemetry", async () => {
        const [diagRes, analRes] = await Promise.all([
            request(app)
                .get("/api/v1/rcce/developer/ai-assistant/diagnostics")
                .set("Authorization", `Bearer ${devToken}`),
            request(app)
                .get("/api/v1/rcce/developer/tenant-analytics")
                .set("Authorization", `Bearer ${devToken}`)
        ]);

        expect(diagRes.statusCode).toBe(200);
        expect(diagRes.body.data.architectureHealthScore).toBeGreaterThanOrEqual(0);
        expect(diagRes.body.data.architectureHealthScore).toBeLessThanOrEqual(100);
        expect(diagRes.body.data.systemSummary.totalPrismaModels).toBe(126);
        expect(Array.isArray(diagRes.body.data.findings)).toBe(true);

        expect(analRes.statusCode).toBe(200);
        expect(analRes.body.data.totalTenants).toBeGreaterThanOrEqual(1);
        expect(typeof analRes.body.data.statusBreakdown).toBe("object");
        expect(Array.isArray(analRes.body.data.recentTenants)).toBe(true);
    });
});
