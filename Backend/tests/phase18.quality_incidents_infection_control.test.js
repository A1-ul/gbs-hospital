"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 18 INTEGRATION TEST SUITE
Quality Assurance, Clinical Audit, Incident Reporting,
Patient Safety Alerts & Infection Control Subsystem
LOCATION: tests/phase18.quality_incidents_infection_control.test.js
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 18: Quality Assurance, Incident Reporting & Infection Control Subsystem", () => {
    let adminToken;
    let testSentinelIncidentId;
    let testSentinelNumber;
    let testNearMissId;
    let testNearMissNumber;
    let testIpcId;
    let testIpcNumber;
    let testAuditId;
    let testAuditNumber;
    let testCapaId;
    let testCapaNumber;
    let testAlertId;
    let testAlertCode;

    const uniqueSuffix = Date.now();

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
    });

    // -------------------------------------------------------------
    // 1. Security & Catalogs
    // -------------------------------------------------------------
    test("1. GET /api/v1/quality/telemetry requires authentication (401 without token)", async () => {
        const res = await request(app).get("/api/v1/quality/telemetry");
        expect(res.status).toBe(401);
    });

    test("2. GET /api/v1/quality/catalogs returns standard severities, infection types, and audit types", async () => {
        const res = await request(app)
            .get("/api/v1/quality/catalogs")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const severityCodes = res.body.data.severities.map(s => s.code);
        expect(severityCodes).toContain("SENTINEL_EVENT");
        expect(severityCodes).toContain("ADVERSE_EVENT");
        expect(severityCodes).toContain("NEAR_MISS");

        expect(res.body.data.incidentCategories).toContain("MEDICATION_ERROR");
        expect(res.body.data.infectionTypes).toContain("SURGICAL_SITE_INFECTION");
        expect(res.body.data.infectionTypes).toContain("MRSA");
        expect(res.body.data.auditTypes).toContain("HAND_HYGIENE_COMPLIANCE");
        expect(res.body.data.rootCauseMethods).toContain("FIVE_WHYS");
    });

    // -------------------------------------------------------------
    // 2. Incident Reporting & Root Cause Analysis (RCA)
    // -------------------------------------------------------------
    test("3. POST /api/v1/quality/incidents reports Sentinel Event with sequential INC-YYYY-XXXXXX", async () => {
        const res = await request(app)
            .post("/api/v1/quality/incidents")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                department: "ACCIDENT_AND_EMERGENCY",
                wardOrLocation: "Resuscitation Bay 1",
                severity: "SENTINEL_EVENT",
                category: "MEDICATION_ERROR",
                description: `High-alert medication concentration error during rapid sequence intubation ${uniqueSuffix}`,
                patientMrn: `MRN-${uniqueSuffix}`,
                patientName: "Kofi Owusu",
                immediateActionTaken: "Patient immediately resuscitated with reversal agent; vitals stabilized; ICU transfer expedited.",
                reportedBy: "Dr. Mensah-Bonsu"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.incidentNumber).toMatch(/^INC-\d{4}-\d{6}$/);
        expect(res.body.data.severity).toBe("SENTINEL_EVENT");
        expect(res.body.data.status).toBe("REPORTED");

        testSentinelIncidentId = res.body.data.id;
        testSentinelNumber = res.body.data.incidentNumber;
    });

    test("4. POST /api/v1/quality/incidents reports Near Miss anonymously (isAnonymous: true)", async () => {
        const res = await request(app)
            .post("/api/v1/quality/incidents")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                department: "PHARMACY",
                wardOrLocation: "Inpatient Dispensary",
                severity: "NEAR_MISS",
                category: "MEDICATION_ERROR",
                description: "Sound-alike look-alike packaging: Hydralazine almost dispensed instead of Hydroxyzine. Intercepted by pharmacist second-check.",
                isAnonymous: true,
                immediateActionTaken: "Correct medication dispensed. Physical separation of bottles implemented on shelf."
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.incidentNumber).toMatch(/^INC-\d{4}-\d{6}$/);
        expect(res.body.data.reportedBy).toBe("ANONYMOUS");
        expect(res.body.data.isAnonymous).toBe(true);

        testNearMissId = res.body.data.id;
        testNearMissNumber = res.body.data.incidentNumber;
    });

    test("5. PATCH /api/v1/quality/incidents/:id/investigate updates Root Cause Analysis findings", async () => {
        const res = await request(app)
            .patch(`/api/v1/quality/incidents/${testSentinelIncidentId}/investigate`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                investigatorName: "Prof. Kwame Asante (Medical Director)",
                rootCause: "Failure mode: Similar ampoule labeling under dim lighting in trauma resuscitation; secondary check bypassed during emergency peak.",
                status: "RCA_IN_PROGRESS"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.investigatorName).toBe("Prof. Kwame Asante (Medical Director)");
        expect(res.body.data.status).toBe("RCA_IN_PROGRESS");
    });

    // -------------------------------------------------------------
    // 3. Corrective & Preventive Action Plans (CAPA)
    // -------------------------------------------------------------
    test("6. POST /api/v1/quality/capa establishes CAPA plan with sequential CAPA-YYYY-XXXXXX", async () => {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 14);

        const res = await request(app)
            .post("/api/v1/quality/capa")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                incidentId: testSentinelIncidentId,
                rootCauseMethod: "FIVE_WHYS",
                rootCauseFindings: "Ampoules stored without distinctive visual auxiliary warning labels in resuscitation cart.",
                correctiveAction: "Re-label all high-alert medication trays with neon luminescent tall-man lettering.",
                preventiveAction: "Implement mandatory 2-nurse barcode scan verification before bedside administration.",
                responsiblePerson: "Chief Pharmacist Mensah",
                targetDate: targetDate.toISOString()
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.capaNumber).toMatch(/^CAPA-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("PENDING_EXECUTION");
        expect(res.body.data.incidentId).toBe(testSentinelIncidentId);

        testCapaId = res.body.data.id;
        testCapaNumber = res.body.data.capaNumber;
    });

    test("7. PATCH /api/v1/quality/capa/:id/verify updates CAPA to VERIFIED_EFFECTIVE", async () => {
        const res = await request(app)
            .patch(`/api/v1/quality/capa/${testCapaId}/verify`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                status: "VERIFIED_EFFECTIVE",
                verifiedBy: "Dr. Evelyn Boateng (Quality Assurance Committee Chair)",
                verificationNotes: "Visual inspection of all ED and ICU resuscitation crash carts confirmed neon labeling completed. 100% compliance verified on random spot check."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("VERIFIED_EFFECTIVE");
        expect(res.body.data.completionDate).toBeDefined();
    });

    test("8. PATCH /api/v1/quality/incidents/:id/close formally closes the clinical incident", async () => {
        const res = await request(app)
            .patch(`/api/v1/quality/incidents/${testSentinelIncidentId}/close`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                closedBy: "Hospital Director Dr. E. Quaye",
                notes: "RCA completed, CAPA verified effective. Case closed with hospital safety board endorsement."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("CLOSED");
        expect(res.body.data.closedAt).toBeDefined();
    });

    // -------------------------------------------------------------
    // 4. Infection Prevention & Control (IPC)
    // -------------------------------------------------------------
    test("9. POST /api/v1/quality/infection-control registers IPC case with sequential IPC-YYYY-XXXXXX", async () => {
        const res = await request(app)
            .post("/api/v1/quality/infection-control")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                patientMrn: `MRN-${uniqueSuffix}-IPC`,
                patientName: "Ama Serwaa",
                department: "SURGICAL_WARD",
                wardOrBed: "Ward 4B - Bed 12",
                infectionType: "MRSA",
                pathogenDetected: "Methicillin-Resistant Staphylococcus aureus",
                isolationType: "CONTACT",
                notifiedPublicHealth: true,
                notes: "Contact precautions posted outside room. Dedicated disposable PPE station deployed."
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.caseNumber).toMatch(/^IPC-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("ACTIVE_ISOLATION");
        expect(res.body.data.notifiedPublicHealth).toBe(true);

        testIpcId = res.body.data.id;
        testIpcNumber = res.body.data.caseNumber;
    });

    test("10. GET /api/v1/quality/infection-control retrieves active isolation cases", async () => {
        const res = await request(app)
            .get("/api/v1/quality/infection-control?status=ACTIVE_ISOLATION")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBeGreaterThanOrEqual(1);

        const found = res.body.data.find(c => c.id === testIpcId);
        expect(found).toBeDefined();
        expect(found.infectionType).toBe("MRSA");
    });

    test("11. PATCH /api/v1/quality/infection-control/:id/clear discharges patient from isolation", async () => {
        const res = await request(app)
            .patch(`/api/v1/quality/infection-control/${testIpcId}/clear`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                clearedBy: "Dr. Kwesi Appiah (Infection Prevention Officer)",
                notes: "Three consecutive negative nasal swabs 24 hours apart. Patient cleared from contact isolation."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("CLEARED_DISCHARGED");
        expect(res.body.data.clearanceDate).toBeDefined();
    });

    // -------------------------------------------------------------
    // 5. Clinical Audits & Peer Reviews
    // -------------------------------------------------------------
    test("12. POST /api/v1/quality/audits records Clinical Audit with sequential AUD-YYYY-XXXXXX", async () => {
        const res = await request(app)
            .post("/api/v1/quality/audits")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                title: "WHO Surgical Safety Checklist Adherence Q4",
                auditType: "SURGICAL_SAFETY_CHECKLIST",
                department: "OPERATING_THEATRE",
                leadAuditor: "Dr. Osei-Tutu (Consultant Anesthesiologist)",
                sampleSize: 40,
                complianceScore: 94.5,
                findingsSummary: "38 of 40 cases demonstrated rigorous Sign-In, Time-Out, and Sign-Out documentation. Minor delay in specimen labeling noted in 2 elective cases."
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.auditNumber).toMatch(/^AUD-\d{4}-\d{6}$/);
        expect(res.body.data.complianceScore).toBe(94.5);
        expect(res.body.data.status).toBe("SUBMITTED");

        testAuditId = res.body.data.id;
        testAuditNumber = res.body.data.auditNumber;
    });

    test("13. GET /api/v1/quality/audits retrieves audit list and score statistics", async () => {
        const res = await request(app)
            .get("/api/v1/quality/audits")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBeGreaterThanOrEqual(1);

        const found = res.body.data.find(a => a.id === testAuditId);
        expect(found).toBeDefined();
        expect(found.leadAuditor).toBe("Dr. Osei-Tutu (Consultant Anesthesiologist)");
    });

    // -------------------------------------------------------------
    // 6. Patient Safety Alerts & Command Center Telemetry
    // -------------------------------------------------------------
    test("14. POST /api/v1/quality/alerts broadcasts urgent safety alert with PSA-YYYY-XXXXXX", async () => {
        const res = await request(app)
            .post("/api/v1/quality/alerts")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                title: "URGENT SAFETY ALERT: National Salbutamol Inhaler Batch Recall",
                urgencyLevel: "STAT_CRITICAL",
                targetAudience: "ALL_CLINICAL_STAFF",
                message: "FDA Ghana recall for Salbutamol Metered Dose Inhalers Batch SB-9042 due to valve delivery variance. Quarantine all pharmacy and ward stocks immediately.",
                actionRequired: "Return all stocks to central pharmacy; switch active prescriptions to alternative approved batch.",
                issuedBy: "Medical Directorate & Chief Pharmacist"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.alertCode).toMatch(/^PSA-\d{4}-\d{6}$/);
        expect(res.body.data.urgencyLevel).toBe("STAT_CRITICAL");
        expect(res.body.data.broadcastActive).toBe(true);

        testAlertId = res.body.data.id;
        testAlertCode = res.body.data.alertCode;
    });

    test("15. POST /api/v1/quality/alerts/:id/acknowledge increments acknowledgment and GET /api/v1/quality/stats returns telemetry", async () => {
        // Staff acknowledgment
        const ackRes = await request(app)
            .post(`/api/v1/quality/alerts/${testAlertId}/acknowledge`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(ackRes.status).toBe(200);
        expect(ackRes.body.success).toBe(true);
        expect(ackRes.body.data.acknowledgedCount).toBeGreaterThanOrEqual(1);

        // Verify Command Center Telemetry
        const statsRes = await request(app)
            .get("/api/v1/quality/stats")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(statsRes.status).toBe(200);
        expect(statsRes.body.success).toBe(true);
        expect(typeof statsRes.body.data.totalIncidentsReported).toBe("number");
        expect(typeof statsRes.body.data.hospitalSafetyIndex).toBe("number");
        expect(statsRes.body.data.hospitalSafetyIndex).toBeGreaterThan(0);
        expect(statsRes.body.data.hospitalSafetyIndex).toBeLessThanOrEqual(100);
        expect(typeof statsRes.body.data.averageAuditComplianceScore).toBe("number");
    });
});
