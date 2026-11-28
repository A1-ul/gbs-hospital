"use strict";

/*
================================================================================
PHASE 40: FILE 3 — GBS-RCCE FULL-MODULE COVERAGE & AUDIT CHAIN VERIFICATION
================================================================================
Verifies:
1. Canonical Response Catalogue includes all 13 specialized hospital domain codes
   (ICU, Clinical Safety, Dental, Eye Clinic, Documents, Meetings, Facility,
   AI Clinical Advisory, International Locale, Payments).
2. Hardened SHA-256 audit chain verifyIntegrity() validates linked chains AND
   detects tampered/malformed/cyclic previousHash entries cleanly.
3. Live specialized module mutations emit canonical RCCE codes and persist
   domain SystemEvents (Facility, Meetings, Documents, International, Payments).
4. Developer remote deployment checkpoint uses canonical CREATED code and
   maintains strict Developer-only access control.
*/

const request = require("supertest");
process.env.NODE_ENV = "test";

const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");
const { rcce } = require("../src/core/gbs-rcce.bootstrap");
const { waitForPendingAuditWrites } = require("../src/core/middleware/rcce-audit.middleware");

describe("Phase 40: File 3 — Full-Module GBS-RCCE Coverage & Audit Chain Integrity", () => {
    let adminToken;
    let devToken;
    let originalProfile = null;
    const createdTaskIds = [];
    const createdMeetingIds = [];
    const createdDocumentIds = [];

    beforeAll(async () => {
        const [adminLogin, devLogin] = await Promise.all([
            request(app).post("/api/v1/auth/login").send({
                email: "admin@gbs.com",
                password: process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin123"
            }),
            request(app).post("/api/v1/auth/login").send({
                email: process.env.DEVELOPER_ROOT_EMAIL || "gabosei48@gmail.com",
                password: process.env.DEVELOPER_ROOT_PASSWORD || "CiTestDevPassword2026!"
            })
        ]);

        expect(adminLogin.statusCode).toBe(200);
        expect(devLogin.statusCode).toBe(200);
        adminToken = adminLogin.body.data.token;
        devToken = devLogin.body.data.token;

        const profRes = await request(app).get("/api/v1/international/profile");
        if (profRes.statusCode === 200) {
            originalProfile = profRes.body.data;
        }
    }, 60000);

    afterAll(async () => {
        await waitForPendingAuditWrites(2000);
        if (createdTaskIds.length > 0) {
            await prisma.facilityTask.deleteMany({ where: { id: { in: createdTaskIds } } }).catch(() => {});
        }
        if (createdMeetingIds.length > 0) {
            await prisma.hospitalMeeting.deleteMany({ where: { id: { in: createdMeetingIds } } }).catch(() => {});
        }
        if (createdDocumentIds.length > 0) {
            await prisma.hospitalDocument.deleteMany({ where: { id: { in: createdDocumentIds } } }).catch(() => {});
        }
        if (originalProfile && adminToken) {
            await request(app)
                .put("/api/v1/international/profile")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    countryCode: originalProfile.countryCode || "GH",
                    languageCode: originalProfile.languageCode || "en"
                })
                .catch(() => {});
        }
        await new Promise((r) => setTimeout(r, 250));
    });

    test("1. Response Catalogue registers all canonical and specialized hospital response codes", async () => {
        const res = await request(app)
            .get("/api/v1/rcce/catalogue")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.code).toBe("SUCCESS");

        const codes = new Set((res.body.data.entries || []).map((e) => e.code));
        const requiredCodes = [
            "PAYMENT_RECEIVED",
            "PAYMENT_INITIATED",
            "PAYMENT_REFUNDED",
            "ICU_VITALS_RECORDED",
            "ICU_CRITICAL_ALERT",
            "CLINICAL_SAFETY_ALERT",
            "CLINICAL_OVERRIDE_RECORDED",
            "DENTAL_RECORD_SAVED",
            "EYE_EXAM_RECORDED",
            "DOCUMENT_STORED",
            "MEETING_SCHEDULED",
            "FACILITY_TASK_LOGGED",
            "CLINICAL_ADVISORY_RECORDED",
            "LOCALE_PROFILE_UPDATED",
            "DEMO_TRIAL_LIMIT_REACHED"
        ];
        for (const code of requiredCodes) {
            expect(codes.has(code)).toBe(true);
        }
    });

    test("2. Hardened audit verifyIntegrity() validates linked SHA-256 chains and flags tampered links", async () => {
        const h1 = "a".repeat(64);
        const h2 = "b".repeat(64);
        const h3 = "c".repeat(64);

        const validReport = await rcce.audit.verifyIntegrity([
            { id: "row-3", previousHash: h2, integrityHash: h3 },
            { id: "row-2", previousHash: h1, integrityHash: h2 },
            { id: "row-1", previousHash: "GENESIS", integrityHash: h1 }
        ]);
        expect(validReport.integrityIntact).toBe(true);
        expect(validReport.hashedCount).toBe(3);
        expect(validReport.chainedLinksVerified).toBe(3);
        expect(validReport.brokenAtId).toBeNull();

        const tamperedCycle = await rcce.audit.verifyIntegrity([
            { id: "row-bad", previousHash: h1, integrityHash: h1 }
        ]);
        expect(tamperedCycle.integrityIntact).toBe(false);
        expect(tamperedCycle.brokenAtId).toBe("row-bad");

        const tamperedPrevFormat = await rcce.audit.verifyIntegrity([
            { id: "row-bad-prev", previousHash: "NOT_A_SHA256_HASH", integrityHash: h2 }
        ]);
        expect(tamperedPrevFormat.integrityIntact).toBe(false);
        expect(tamperedPrevFormat.brokenAtId).toBe("row-bad-prev");
    });

    test("3. Specialized controllers emit canonical RCCE codes and persist domain SystemEvents", async () => {
        // Payments providers canonical envelope
        const providersRes = await request(app)
            .get("/api/v1/payments/providers")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(providersRes.statusCode).toBe(200);
        expect(providersRes.body.success).toBe(true);
        expect(providersRes.body.code).toBe("SUCCESS");
        expect(providersRes.body.requestId).toBeTruthy();

        // Facility task -> FACILITY_TASK_LOGGED + SystemEvent
        const taskRes = await request(app)
            .post("/api/v1/facility/tasks")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                title: "Phase 40 Generator Oil Inspection",
                category: "UTILITIES",
                location: "Power House A",
                priority: "NORMAL"
            });
        expect(taskRes.statusCode).toBe(201);
        expect(taskRes.body.code).toBe("FACILITY_TASK_LOGGED");
        expect(taskRes.body.requestId).toBeTruthy();
        if (taskRes.body?.data?.id) createdTaskIds.push(taskRes.body.data.id);

        // Meeting schedule -> MEETING_SCHEDULED + SystemEvent
        const meetingRes = await request(app)
            .post("/api/v1/meetings")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                title: "Phase 40 Clinical Governance Sync",
                department: "ADMINISTRATION",
                scheduledFor: new Date(Date.now() + 3600 * 1000).toISOString(),
                agenda: "Verify RCCE event routing"
            });
        expect(meetingRes.statusCode).toBe(201);
        expect(meetingRes.body.code).toBe("MEETING_SCHEDULED");
        if (meetingRes.body?.data?.id) createdMeetingIds.push(meetingRes.body.data.id);

        // Document store -> DOCUMENT_STORED + SystemEvent
        const docRes = await request(app)
            .post("/api/v1/documents")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                title: "Phase 40 RCCE Standard SOP",
                category: "POLICY",
                fileName: "phase40_rcce_standard_sop.pdf",
                retentionYears: 7,
                contentNotes: "Standardized GBS-RCCE verification document content."
            });
        expect(docRes.statusCode).toBe(201);
        expect(docRes.body.code).toBe("DOCUMENT_STORED");
        if (docRes.body?.data?.id) createdDocumentIds.push(docRes.body.data.id);

        // International profile update -> LOCALE_PROFILE_UPDATED + SystemEvent
        const localeRes = await request(app)
            .put("/api/v1/international/profile")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                countryCode: originalProfile?.countryCode || "GH",
                languageCode: originalProfile?.languageCode || "en"
            });
        expect(localeRes.statusCode).toBe(200);
        expect(localeRes.body.code).toBe("LOCALE_PROFILE_UPDATED");

        // Verify persisted SystemEvents across those specialized domains
        const [facEvents, mtgEvents, docEvents, intlEvents] = await Promise.all([
            request(app).get("/api/v1/rcce/events?domain=FACILITY").set("Authorization", `Bearer ${devToken}`),
            request(app).get("/api/v1/rcce/events?domain=MEETINGS").set("Authorization", `Bearer ${devToken}`),
            request(app).get("/api/v1/rcce/events?domain=DOCUMENTS").set("Authorization", `Bearer ${devToken}`),
            request(app).get("/api/v1/rcce/events?domain=INTERNATIONAL").set("Authorization", `Bearer ${devToken}`)
        ]);

        expect(facEvents.statusCode).toBe(200);
        expect(facEvents.body.data.events.some((e) => e.domain === "FACILITY")).toBe(true);
        expect(mtgEvents.statusCode).toBe(200);
        expect(mtgEvents.body.data.events.some((e) => e.domain === "MEETINGS")).toBe(true);
        expect(docEvents.statusCode).toBe(200);
        expect(docEvents.body.data.events.some((e) => e.domain === "DOCUMENTS")).toBe(true);
        expect(intlEvents.statusCode).toBe(200);
        expect(intlEvents.body.data.events.some((e) => e.domain === "INTERNATIONAL")).toBe(true);
    });

    test("4. Developer deployment checkpoint returns canonical CREATED code and rejects Hospital Admin", async () => {
        const deniedAdmin = await request(app)
            .post("/api/v1/rcce/developer/remote/deployments")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ version: "2.0.1-denied", notes: "Should be blocked" });
        expect(deniedAdmin.statusCode).toBe(403);

        const devCheckpoint = await request(app)
            .post("/api/v1/rcce/developer/remote/deployments")
            .set("Authorization", `Bearer ${devToken}`)
            .send({
                version: `2.0.0-p40-${Date.now()}`,
                notes: "Phase 40 RCCE canonical CREATED verification",
                status: "DEPLOYED"
            });
        expect(devCheckpoint.statusCode).toBe(201);
        expect(devCheckpoint.body.success).toBe(true);
        expect(devCheckpoint.body.code).toBe("CREATED");
    });
});
