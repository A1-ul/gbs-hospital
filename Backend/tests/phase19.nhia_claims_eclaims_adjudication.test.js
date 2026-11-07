"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 19 INTEGRATION TEST SUITE
NHIA Claims Batches, E-Claims Submission,
Electronic Adjudication & Reconciliation Subsystem
LOCATION: tests/phase19.nhia_claims_eclaims_adjudication.test.js
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 19: NHIA Claims Batches, E-Claims & Electronic Adjudication Subsystem", () => {
    let adminToken;
    let testBatchId;
    let testBatchNumber;
    let testValidClaimId;
    let testValidClaimNumber;
    let testFlaggedClaimId;
    let testFlaggedClaimNumber;
    let testVoucherId;
    let testVoucherNumber;
    let testNhisNumber;

    const uniqueSuffix = Date.now().toString().slice(-6);

    beforeAll(async () => {
        // Authenticate as Administrator
        const adminRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "admin@gbs.com",
                password: "Admin123"
            });
        expect(adminRes.status).toBe(200);
        adminToken = adminRes.body.data.token;
        testNhisNumber = `NHIS-GH-${uniqueSuffix}`;
    });

    // -------------------------------------------------------------
    // 1. Security & Catalogs
    // -------------------------------------------------------------
    test("1. GET /api/v1/nhia/stats requires authentication (401 without token)", async () => {
        const res = await request(app).get("/api/v1/nhia/stats");
        expect(res.status).toBe(401);
    });

    test("2. GET /api/v1/nhia/catalogs returns standard G-DRG tariffs, rejection reasons, and member categories", async () => {
        const res = await request(app)
            .get("/api/v1/nhia/catalogs")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.gdrgTariffs)).toBe(true);
        expect(res.body.data.gdrgTariffs.length).toBeGreaterThanOrEqual(5);
        expect(Array.isArray(res.body.data.rejectionReasons)).toBe(true);
        expect(Array.isArray(res.body.data.memberCategories)).toBe(true);
    });

    // -------------------------------------------------------------
    // 2. NHIS Member Policy & Real-Time Eligibility
    // -------------------------------------------------------------
    test("3. POST /api/v1/nhia/members registers an active NHIS member policy", async () => {
        const res = await request(app)
            .post("/api/v1/nhia/members")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                nhisNumber: testNhisNumber,
                fullName: `Kwame Mensah ${uniqueSuffix}`,
                dateOfBirth: "1985-04-12",
                gender: "M",
                ghanaCardNumber: `GHA-${uniqueSuffix}-7`,
                status: "ACTIVE",
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                memberType: "FORMAL_SECTOR"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.nhisNumber).toBe(testNhisNumber);
        expect(res.body.data.status).toBe("ACTIVE");
    });

    test("4. GET /api/v1/nhia/eligibility/:nhisNumber verifies active member status and copay requirement", async () => {
        const res = await request(app)
            .get(`/api/v1/nhia/eligibility/${testNhisNumber}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.nhisNumber).toBe(testNhisNumber);
        expect(res.body.data.isEligibleForCare).toBe(true);
        expect(res.body.data.status).toBe("ACTIVE");
        expect(res.body.data.copayRequired).toBe(true);
    });

    // -------------------------------------------------------------
    // 3. NHIA Claims Batches
    // -------------------------------------------------------------
    test("5. POST /api/v1/nhia/batches initializes a monthly claims batch with sequential batch number", async () => {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        const res = await request(app)
            .post("/api/v1/nhia/batches")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                providerNumber: "HOSP-ACC-00124",
                providerName: "GBS Central Teaching Hospital",
                periodMonth: currentMonth,
                periodYear: currentYear,
                submissionType: "E_CLAIMS_XML"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBeDefined();
        expect(res.body.data.batchNumber).toMatch(/^NHIA-\d{6}-\d{6}$/);
        expect(res.body.data.status).toBe("DRAFT");
        expect(res.body.data.totalClaimsCount).toBe(0);

        testBatchId = res.body.data.id;
        testBatchNumber = res.body.data.batchNumber;
    });

    test("6. POST /api/v1/nhia/batches/:id/claims adds a valid encounter claim to batch and updates totals", async () => {
        const res = await request(app)
            .post(`/api/v1/nhia/batches/${testBatchId}/claims`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                patientId: `PAT-TEST-${uniqueSuffix}`,
                patientName: `Kwame Mensah ${uniqueSuffix}`,
                nhisNumber: testNhisNumber,
                gender: "M",
                dateOfBirth: "1985-04-12",
                encounterDate: new Date().toISOString(),
                encounterType: "OPD",
                gdrgCode: "GDRG-OPD-01",
                primaryDiagnosisIcd10: "B54.0",
                claimedAmount: 45.00,
                copayPaid: 0.00,
                servicesRendered: { consultation: "General OPD", lab: "None", medicines: "Artemether/Lumefantrine" }
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.claimNumber).toMatch(/^CLM-\d{4}-\d{6}$/);
        expect(res.body.data.batchId).toBe(testBatchId);
        expect(res.body.data.adjudicationStatus).toBe("VETTED_PASSED");

        testValidClaimId = res.body.data.id;
        testValidClaimNumber = res.body.data.claimNumber;
    });

    test("7. POST /api/v1/nhia/batches/:id/claims adds a second claim flagged for vetting check", async () => {
        const res = await request(app)
            .post(`/api/v1/nhia/batches/${testBatchId}/claims`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                patientId: `PAT-FLAGGED-${uniqueSuffix}`,
                patientName: `Ama Osei ${uniqueSuffix}`,
                nhisNumber: `NHIS-EXPIRED-${uniqueSuffix}`,
                gender: "F",
                dateOfBirth: "1992-08-20",
                encounterDate: new Date().toISOString(),
                encounterType: "IPD",
                gdrgCode: "GDRG-IPD-MAL01",
                primaryDiagnosisIcd10: "B50.9",
                claimedAmount: 320.00,
                copayPaid: 10.00
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.claimNumber).toBeDefined();

        testFlaggedClaimId = res.body.data.id;
        testFlaggedClaimNumber = res.body.data.claimNumber;
    });

    test("8. GET /api/v1/nhia/batches/:id/claims lists claims in batch with pagination", async () => {
        const res = await request(app)
            .get(`/api/v1/nhia/batches/${testBatchId}/claims`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBe(2);
        expect(res.body.meta.total).toBe(2);
    });

    // -------------------------------------------------------------
    // 4. Automated Vetting & E-Claims Generation
    // -------------------------------------------------------------
    test("9. POST /api/v1/nhia/batches/:id/vet executes automated vetting engine and transitions batch status", async () => {
        const res = await request(app)
            .post(`/api/v1/nhia/batches/${testBatchId}/vet`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.batchNumber).toBe(testBatchNumber);
        expect(res.body.data.batchStatus).toBe("VETTED_READY");
        expect(res.body.data.totalClaims).toBe(2);
    });

    test("10. GET /api/v1/nhia/batches/:id/eclaims-payload compiles compliant XML/JSON payload with SHA-256 checksum", async () => {
        const res = await request(app)
            .get(`/api/v1/nhia/batches/${testBatchId}/eclaims-payload`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.jsonPayload).toBeDefined();
        expect(res.body.data.xmlPayload).toContain("<NhiaEClaimsBatch");
        expect(res.body.data.payloadChecksum).toHaveLength(64);
    });

    // -------------------------------------------------------------
    // 5. Electronic Submission & Adjudication
    // -------------------------------------------------------------
    test("11. POST /api/v1/nhia/batches/:id/submit submits batch and receives official submission receipt", async () => {
        const res = await request(app)
            .post(`/api/v1/nhia/batches/${testBatchId}/submit`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("SUBMITTED");
        expect(res.body.data.submissionReceipt).toMatch(/^RCPT-NHIA-\d+$/);
    });

    test("12. POST /api/v1/nhia/batches/:id/adjudicate processes electronic adjudication and calculates financial totals", async () => {
        const res = await request(app)
            .post(`/api/v1/nhia/batches/${testBatchId}/adjudicate`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                claimDecisions: [
                    {
                        claimId: testValidClaimId,
                        status: "APPROVED_FULL",
                        approvedAmount: 45.00
                    },
                    {
                        claimId: testFlaggedClaimId,
                        status: "REJECTED",
                        rejectionCode: "REJ-01",
                        rejectionReason: "Member card not found or inactive in central registry"
                    }
                ]
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("ADJUDICATED");
        expect(parseFloat(res.body.data.totalApprovedAmount)).toBe(45.00);
        expect(parseFloat(res.body.data.totalRejectedAmount)).toBe(320.00);
    });

    // -------------------------------------------------------------
    // 6. Reconciliation Voucher & Clinical Appeal
    // -------------------------------------------------------------
    test("13. POST /api/v1/nhia/batches/:id/reconcile-voucher issues official settlement voucher with withholding tax", async () => {
        const res = await request(app)
            .post(`/api/v1/nhia/batches/${testBatchId}/reconcile-voucher`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                withholdingTaxPercent: 5.0,
                paymentReference: `E-TRF-BOG-${uniqueSuffix}`,
                adjudicatorNote: "Verified and approved by NHIA Regional Internal Auditor."
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.voucherNumber).toMatch(/^VOUCH-\d{4}-\d{6}$/);
        expect(parseFloat(res.body.data.approvedAmount)).toBe(45.00);
        expect(parseFloat(res.body.data.disallowedAmount)).toBe(320.00);
        expect(parseFloat(res.body.data.withholdingTax)).toBe(2.25);
        expect(parseFloat(res.body.data.netDisbursedAmount)).toBe(42.75);

        testVoucherId = res.body.data.id;
        testVoucherNumber = res.body.data.voucherNumber;
    });

    test("14. PATCH /api/v1/nhia/claims/:claimId/appeal submits clinical justification to appeal rejected claim", async () => {
        const res = await request(app)
            .patch(`/api/v1/nhia/claims/${testFlaggedClaimId}/appeal`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                appealNotes: "Patient card renewed on the same day at district NHIS office. Attached biometric proof of renewal receipt.",
                correctiveIcd10: "B50.9"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.adjudicationStatus).toBe("APPEALED");
        expect(res.body.data.appealNotes).toContain("Patient card renewed");
    });

    // -------------------------------------------------------------
    // 7. Command Center Telemetry
    // -------------------------------------------------------------
    test("15. GET /api/v1/nhia/telemetry aggregates live PostgreSQL metrics and financial summaries", async () => {
        const res = await request(app)
            .get("/api/v1/nhia/telemetry")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.totalBatches).toBeGreaterThanOrEqual(1);
        expect(res.body.data.totalClaims).toBeGreaterThanOrEqual(2);
        expect(res.body.data.financials.totalClaimedGhs).toBeGreaterThan(0);
        expect(res.body.data.financials.totalApprovedGhs).toBeGreaterThan(0);
        expect(res.body.data.vouchersIssuedCount).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(res.body.data.recentBatches)).toBe(true);
    });
});
