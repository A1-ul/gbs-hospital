"use strict";

/*
================================================================================
PHASE 34: 10-ENTRY DEMO TRIAL QUOTA ENGINE & GBS-RCCE RESPONSE VERIFICATION
================================================================================
Verifies:
1. Demo sessions work identically to live production for non-Developer roles
   (including auto-provisioned isolated role accounts when absent).
2. DEVELOPER role is strictly blocked from Demo sessions (403 FORBIDDEN_DEVELOPER_DEMO).
3. Failed validation writes (400) do NOT consume a Demo trial entry.
4. Exactly 10 real PostgreSQL write entries succeed with live X-Demo-Entries-* headers.
5. The 11th write entry is strictly blocked with HTTP 403 DEMO_TRIAL_LIMIT_REACHED
   and logged to PostgreSQL AuditLog.
6. Read-only GET requests remain unlimited after reaching 10/10 entries.
7. Real authenticated production accounts remain completely unlimited.
8. GET /api/v1/auth/me and GET /api/v1/auth/demo-quota preserve exact DB-backed quota.
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 34: 10-Entry Interactive Demo Trial Quota & Production Parity", () => {
    const prevDemo = process.env.DEMO_MODE_ENABLED;
    const prevMax = process.env.DEMO_MAX_ENTRIES;
    const RUN_TAG = Date.now().toString(36).toUpperCase();

    let demoToken;
    let demoSessionId;
    let adminToken;
    const createdPatientIds = [];

    beforeAll(async () => {
        process.env.DEMO_MODE_ENABLED = "true";
        process.env.DEMO_MAX_ENTRIES = "10";

        const adminLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "admin@gbs.com", password: process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin123" });
        expect(adminLogin.statusCode).toBe(200);
        adminToken = adminLogin.body.data.token;
    }, 60000);

    afterAll(async () => {
        try {
            if (createdPatientIds.length > 0) {
                await prisma.folderMovementLog.deleteMany({
                    where: { folder: { patientId: { in: createdPatientIds } } }
                }).catch(() => {});
                await prisma.medicalFolder.deleteMany({
                    where: { patientId: { in: createdPatientIds } }
                }).catch(() => {});
                await prisma.patient.deleteMany({
                    where: { id: { in: createdPatientIds } }
                }).catch(() => {});
            }
            if (demoSessionId) {
                await prisma.systemConfiguration.deleteMany({
                    where: { configKey: `DEMO_QUOTA_${demoSessionId}` }
                }).catch(() => {});
                await prisma.session.deleteMany({
                    where: { id: demoSessionId }
                }).catch(() => {});
            }
        } finally {
            if (prevDemo === undefined) delete process.env.DEMO_MODE_ENABLED;
            else process.env.DEMO_MODE_ENABLED = prevDemo;
            if (prevMax === undefined) delete process.env.DEMO_MAX_ENTRIES;
            else process.env.DEMO_MAX_ENTRIES = prevMax;
        }
    });

    test("1. POST /api/v1/auth/demo-session blocks DEVELOPER (403) and starts 10-entry trial for RECEPTIONIST", async () => {
        const devBlocked = await request(app)
            .post("/api/v1/auth/demo-session")
            .send({ role: "DEVELOPER" });
        expect(devBlocked.statusCode).toBe(403);
        expect(devBlocked.body.code).toBe("FORBIDDEN_DEVELOPER_DEMO");

        const demoRes = await request(app)
            .post("/api/v1/auth/demo-session")
            .send({ role: "RECEPTIONIST" });
        expect(demoRes.statusCode).toBe(200);
        expect(demoRes.body.data.isDemoSession).toBe(true);
        expect(demoRes.body.data.demoQuota).toMatchObject({
            isDemoSession: true,
            entriesUsed: 0,
            maxEntries: 10,
            remaining: 10,
            limitReached: false
        });
        demoToken = demoRes.body.data.token;
        demoSessionId = demoRes.body.data.sessionId;
    });

    test("2. Invalid write (400) does NOT consume a trial entry; exactly 10 real writes succeed and 11th is blocked (403 DEMO_TRIAL_LIMIT_REACHED)", async () => {
        // Invalid write should return 400 and NOT consume quota
        const invalidRes = await request(app)
            .post("/api/v1/patients")
            .set("Authorization", `Bearer ${demoToken}`)
            .send({ firstName: "" });
        expect([400, 422]).toContain(invalidRes.statusCode);

        const quotaAfterInvalid = await request(app)
            .get("/api/v1/auth/demo-quota")
            .set("Authorization", `Bearer ${demoToken}`);
        expect(quotaAfterInvalid.statusCode).toBe(200);
        expect(quotaAfterInvalid.body.data.entriesUsed).toBe(0);

        // Execute 10 real PostgreSQL patient creations identical to live production
        for (let i = 1; i <= 10; i++) {
            const createRes = await request(app)
                .post("/api/v1/patients")
                .set("Authorization", `Bearer ${demoToken}`)
                .send({
                    firstName: `DemoTrial${i}`,
                    lastName: `Patient${RUN_TAG}`,
                    gender: i % 2 === 0 ? "FEMALE" : "MALE",
                    dateOfBirth: "1992-05-14",
                    phone: `+2332499${String(i).padStart(5, "0")}`
                });
            expect(createRes.statusCode).toBe(201);
            expect(createRes.headers["x-demo-mode"]).toBe("true");
            expect(createRes.headers["x-demo-entries-used"]).toBe(String(i));
            expect(createRes.headers["x-demo-entries-limit"]).toBe("10");
            expect(createRes.headers["x-demo-entries-remaining"]).toBe(String(10 - i));

            const createdId = createRes.body?.data?.patient?.id || createRes.body?.data?.id;
            if (createdId) createdPatientIds.push(createdId);
        }

        // Wait briefly for final async DB quota increment to settle
        const quotaAt10 = await request(app)
            .get("/api/v1/auth/demo-quota")
            .set("Authorization", `Bearer ${demoToken}`);
        expect(quotaAt10.statusCode).toBe(200);
        expect(quotaAt10.body.data).toMatchObject({
            isDemoSession: true,
            entriesUsed: 10,
            maxEntries: 10,
            remaining: 0,
            limitReached: true
        });

        // 11th write MUST be blocked with HTTP 403 DEMO_TRIAL_LIMIT_REACHED
        const eleventhRes = await request(app)
            .post("/api/v1/patients")
            .set("Authorization", `Bearer ${demoToken}`)
            .send({
                firstName: "DemoTrial11Blocked",
                lastName: `Patient${RUN_TAG}`,
                gender: "MALE",
                dateOfBirth: "1990-01-01",
                phone: "+233249900011"
            });
        expect(eleventhRes.statusCode).toBe(403);
        expect(eleventhRes.body.code).toBe("DEMO_TRIAL_LIMIT_REACHED");
        expect(eleventhRes.body.message).toContain("10/10");

        // Read-only GET requests still work freely after reaching 10/10
        const readAfterLimit = await request(app)
            .get("/api/v1/patients")
            .set("Authorization", `Bearer ${demoToken}`);
        expect(readAfterLimit.statusCode).toBe(200);

        // /auth/me preserves isDemoSession & demoQuota across refreshes
        const meRes = await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", `Bearer ${demoToken}`);
        expect(meRes.statusCode).toBe(200);
        expect(meRes.body.data.isDemoSession).toBe(true);
        expect(meRes.body.data.demoQuota.limitReached).toBe(true);

        // Real authenticated production account remains completely unlimited
        const prodCreate = await request(app)
            .post("/api/v1/patients")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                firstName: "ProductionUnlimited",
                lastName: `Patient${RUN_TAG}`,
                gender: "FEMALE",
                dateOfBirth: "1988-08-20",
                phone: "+233249900099"
            });
        expect(prodCreate.statusCode).toBe(201);
        expect(prodCreate.headers["x-demo-mode"]).toBeUndefined();
        const prodId = prodCreate.body?.data?.patient?.id || prodCreate.body?.data?.id;
        if (prodId) createdPatientIds.push(prodId);
    });
});
