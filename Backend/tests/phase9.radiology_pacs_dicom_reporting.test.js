"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 9 INTEGRATION TEST SUITE: RADIOLOGY, PACS & DICOM
Zero Fake/Mock Data - Real PostgreSQL 16 Persistence
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 9: Radiology, PACS Imaging, DICOM Metadata, Modality Worklists & Diagnostic Reporting", () => {
    let devToken;
    let radiologistToken;
    let radiologistUser;
    let doctorToken;
    let testHospital;
    let testPatient;
    let testEncounter;
    let cxrOrderId;
    let cxrAccessionNumber;
    let ctOrderId;
    let ctAccessionNumber;
    let acquiredStudyUid;
    let normalReportId;
    let criticalReportId;

    const uniqueId = Date.now();
    const radiologistEmail = `radiologist_${uniqueId}@gbs.com`;
    const doctorEmail = `doc_rad_${uniqueId}@gbs.com`;

    beforeAll(async () => {
        // 1. Authenticate as Developer
        const devLoginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "developer@gbs.com",
                password: "Admin123"
            });
        expect(devLoginRes.status).toBe(200);
        devToken = devLoginRes.body.data.token;
        expect(devToken).toBeDefined();

        // 2. Fetch or create test hospital
        testHospital = await prisma.hospital.findFirst({
            orderBy: { createdAt: "asc" }
        });
        if (!testHospital) {
            testHospital = await prisma.hospital.create({
                data: {
                    name: "GBS Central Diagnostic & Imaging Hospital",
                    code: "GBS-RAD-01",
                    email: "radiology@gbshospital.com",
                    phone: "+233200000003",
                    address: "Radiology Center, Ridge, Accra",
                    city: "Accra",
                    region: "Greater Accra",
                    country: "Ghana"
                }
            });
        }
        expect(testHospital).toBeDefined();

        // 3. Create and approve Radiologist user
        const radSignup = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                email: radiologistEmail,
                password: "Password123!",
                firstName: "Kofi",
                lastName: "Ansah-Radiologist",
                role: "RADIOLOGIST"
            });
        expect(radSignup.status).toBe(201);
        const radId = radSignup.body.data.id;

        const approveRadRes = await request(app)
            .patch(`/api/v1/users/${radId}/approve`)
            .set("Authorization", `Bearer ${devToken}`);
        expect(approveRadRes.status).toBe(200);

        const radLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: radiologistEmail,
                password: "Password123!"
            });
        expect(radLogin.status).toBe(200);
        radiologistToken = radLogin.body.data.token;
        radiologistUser = radLogin.body.data.user;
        expect(radiologistToken).toBeDefined();

        // 4. Create and approve Doctor user
        const docSignup = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                email: doctorEmail,
                password: "Password123!",
                firstName: "Ama",
                lastName: "Mensah-Doctor",
                role: "DOCTOR"
            });
        expect(docSignup.status).toBe(201);
        const docId = docSignup.body.data.id;

        const approveDocRes = await request(app)
            .patch(`/api/v1/users/${docId}/approve`)
            .set("Authorization", `Bearer ${devToken}`);
        expect(approveDocRes.status).toBe(200);

        const docLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: doctorEmail,
                password: "Password123!"
            });
        expect(docLogin.status).toBe(200);
        doctorToken = docLogin.body.data.token;
        expect(doctorToken).toBeDefined();

        // 5. Register real test Patient
        const patientNumber = `MRN-RAD-${uniqueId}`;
        testPatient = await prisma.patient.create({
            data: {
                hospitalId: testHospital.id,
                patientNumber,
                firstName: "Esi",
                lastName: "Quaye-Imaging",
                dateOfBirth: new Date("1985-04-12"),
                gender: "FEMALE",
                phone: `+23324${String(uniqueId).slice(-7)}`,
                bloodGroup: "B_POSITIVE"
            }
        });
        expect(testPatient).toBeDefined();

        // 6. Open Clinical Encounter
        testEncounter = await prisma.patientEncounter.create({
            data: {
                hospitalId: testHospital.id,
                patientId: testPatient.id,
                encounterNumber: `ENC-RAD-${uniqueId}`,
                encounterType: "OUTPATIENT",
                status: "OPEN",
                chiefComplaint: "Severe chronic cough and chest pain with acute headache"
            }
        });
        expect(testEncounter).toBeDefined();
    });

    afterAll(async () => {
        // Clean up Phase 9 records safely in reverse dependency order
        if (testPatient) {
            await prisma.radiologyReport.deleteMany({
                where: { order: { patientId: testPatient.id } }
            });
            await prisma.dicomStudy.deleteMany({
                where: { order: { patientId: testPatient.id } }
            });
            await prisma.radiologyOrder.deleteMany({
                where: { patientId: testPatient.id }
            });
            if (testEncounter) {
                await prisma.patientEncounter.delete({
                    where: { id: testEncounter.id }
                }).catch(() => {});
            }
            await prisma.patient.delete({
                where: { id: testPatient.id }
            }).catch(() => {});
        }
        await prisma.user.deleteMany({
            where: { email: { in: [radiologistEmail, doctorEmail] } }
        }).catch(() => {});
    });

    // Test 1: Seed Reference Radiology Catalog
    test("1. POST /api/v1/radiology/catalog/seed - Seed standard diagnostic imaging procedures", async () => {
        const res = await request(app)
            .post("/api/v1/radiology/catalog/seed")
            .set("Authorization", `Bearer ${devToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);

        const cxrItem = res.body.data.find(i => i.code === "RAD-CXR");
        expect(cxrItem).toBeDefined();
        expect(cxrItem.modality).toBe("XRAY");
        expect(cxrItem.bodyPart).toBe("CHEST");
    });

    // Test 2: Order Routine Chest X-Ray
    test("2. POST /api/v1/radiology/orders - Order routine Chest X-Ray examination", async () => {
        const res = await request(app)
            .post("/api/v1/radiology/orders")
            .set("Authorization", `Bearer ${doctorToken}`)
            .send({
                encounterId: testEncounter.id,
                procedureCode: "RAD-CXR",
                priority: "ROUTINE",
                clinicalIndication: "Persistent productive cough, rule out consolidation/pneumonia"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBeDefined();
        expect(res.body.data.accessionNumber).toMatch(/^RAD-\d{4}-\d{6}$/);
        expect(res.body.data.modality).toBe("XRAY");
        expect(res.body.data.procedureName).toBe("Chest X-Ray PA & Lateral");
        expect(res.body.data.priority).toBe("ROUTINE");
        expect(res.body.data.status).toBe("ORDERED");

        cxrOrderId = res.body.data.id;
        cxrAccessionNumber = res.body.data.accessionNumber;
    });

    // Test 3: Order Emergency STAT CT Brain
    test("3. POST /api/v1/radiology/orders - Order emergency STAT Brain CT scan", async () => {
        const res = await request(app)
            .post("/api/v1/radiology/orders")
            .set("Authorization", `Bearer ${doctorToken}`)
            .send({
                encounterId: testEncounter.id,
                procedureCode: "RAD-CT-BRAIN",
                priority: "STAT_EMERGENCY",
                clinicalIndication: "Sudden onset worst headache of life, acute neurological deficit"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBeDefined();
        expect(res.body.data.accessionNumber).toMatch(/^RAD-\d{4}-\d{6}$/);
        expect(res.body.data.modality).toBe("CT_SCAN");
        expect(res.body.data.priority).toBe("STAT_EMERGENCY");
        expect(res.body.data.status).toBe("ORDERED");

        ctOrderId = res.body.data.id;
        ctAccessionNumber = res.body.data.accessionNumber;
    });

    // Test 4: Validation Guard: Reject Missing Encounter or Procedure Name
    test("4. POST /api/v1/radiology/orders - Validation guard rejects missing encounter ID (400)", async () => {
        const res = await request(app)
            .post("/api/v1/radiology/orders")
            .set("Authorization", `Bearer ${doctorToken}`)
            .send({
                procedureName: "Pelvic Ultrasound",
                modality: "ULTRASOUND"
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("MISSING_ENCOUNTER_ID");
    });

    // Test 5: Query Modality Worklist & Verify STAT Priority Ranking
    test("5. GET /api/v1/radiology/orders - Query worklist and verify STAT_EMERGENCY ranked at top", async () => {
        const res = await request(app)
            .get("/api/v1/radiology/orders")
            .set("Authorization", `Bearer ${radiologistToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(2);

        // First item in prioritized worklist should be a STAT_EMERGENCY item
        const firstOrder = res.body.data[0];
        expect(firstOrder.priority).toBe("STAT_EMERGENCY");
    });

    // Test 6: Schedule Examination
    test("6. PATCH /api/v1/radiology/orders/:id/schedule - Schedule procedure for imaging room", async () => {
        const scheduledTime = new Date(Date.now() + 3600000).toISOString();
        const res = await request(app)
            .patch(`/api/v1/radiology/orders/${cxrOrderId}/schedule`)
            .set("Authorization", `Bearer ${radiologistToken}`)
            .send({
                scheduledDate: scheduledTime,
                performingRadiographerName: "Tech. Emmanuel Osei"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("SCHEDULED");
        expect(res.body.data.performingRadiographerName).toBe("Tech. Emmanuel Osei");
    });

    // Test 7: Acquire DICOM Study (PACS Ingestion & Telemetry)
    test("7. POST /api/v1/radiology/orders/:id/acquire - Radiographer acquires DICOM study with window presets", async () => {
        const res = await request(app)
            .post(`/api/v1/radiology/orders/${cxrOrderId}/acquire`)
            .set("Authorization", `Bearer ${radiologistToken}`)
            .send({
                modality: "XRAY",
                seriesCount: 2,
                instanceCount: 2,
                kvp: 110.0,
                exposureTime: 80.0,
                sliceThickness: 2.5,
                pixelSpacing: "0.14\\0.14",
                patientPosition: "PA_AND_LATERAL",
                acquisitionDevice: "Carestream DRX-Evolution Plus",
                notes: "Good inspiration, no patient motion artifacts"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBeDefined();
        expect(res.body.data.studyInstanceUid).toMatch(/^1\.2\.840\.10008\./);
        expect(res.body.data.windowWidth).toBe(1500); // Standard Chest Lung Window
        expect(res.body.data.windowCenter).toBe(-600);
        expect(res.body.data.kvp).toBe(110.0);
        expect(res.body.data.imageStorageUri).toContain(cxrAccessionNumber);

        acquiredStudyUid = res.body.data.studyInstanceUid;

        // Verify order status automatically transitioned to ACQUIRED
        const orderCheck = await prisma.radiologyOrder.findUnique({
            where: { id: cxrOrderId }
        });
        expect(orderCheck.status).toBe("ACQUIRED");
    });

    // Test 8: Retrieve PACS Study Dossier by Study UID
    test("8. GET /api/v1/pacs/studies/:uid - Retrieve complete DICOM study dossier from PACS archive", async () => {
        const res = await request(app)
            .get(`/api/v1/pacs/studies/${acquiredStudyUid}`)
            .set("Authorization", `Bearer ${radiologistToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.studyInstanceUid).toBe(acquiredStudyUid);
        expect(res.body.data.modality).toBe("XRAY");
        expect(res.body.data.viewingParameters.windowWidth).toBe(1500);
        expect(res.body.data.viewingParameters.windowCenter).toBe(-600);
        expect(res.body.data.patient).toBeDefined();
        expect(res.body.data.patient.id).toBe(testPatient.id);
        expect(res.body.data.order.status).toBe("ACQUIRED");
    });

    // Test 9: Author Standard Normal Diagnostic Report
    test("9. POST /api/v1/radiology/orders/:id/report - Radiologist authors normal diagnostic report", async () => {
        const res = await request(app)
            .post(`/api/v1/radiology/orders/${cxrOrderId}/report`)
            .set("Authorization", `Bearer ${radiologistToken}`)
            .send({
                findings: "Both lung fields are clear and well-expanded. Heart size is within normal limits. Both costophrenic angles and cardiophrenic sulci are sharp. Bony thorax and soft tissues unremarkable.",
                impression: "Normal chest radiograph. No acute cardiopulmonary disease.",
                technique: "PA and lateral upright digital chest radiographs",
                classification: "NORMAL"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBeDefined();
        expect(res.body.data.reportNumber).toMatch(/^REP-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("PRELIMINARY");
        expect(res.body.data.classification).toBe("NORMAL");
        expect(res.body.data.criticalAlert).toBe(false);

        normalReportId = res.body.data.id;

        // Verify order status transitioned to REPORTED
        const orderCheck = await prisma.radiologyOrder.findUnique({
            where: { id: cxrOrderId }
        });
        expect(orderCheck.status).toBe("REPORTED");
    });

    // Test 10: Author Emergency Critical Panic Finding Report (Red-Flag Alert Engine)
    test("10. POST /api/v1/radiology/orders/:id/report - Automated Critical Panic finding detection on CT Brain", async () => {
        // First acquire CT study
        await request(app)
            .post(`/api/v1/radiology/orders/${ctOrderId}/acquire`)
            .set("Authorization", `Bearer ${radiologistToken}`)
            .send({
                modality: "CT_SCAN",
                seriesCount: 3,
                instanceCount: 160,
                kvp: 120.0,
                exposureTime: 150.0,
                sliceThickness: 1.25,
                acquisitionDevice: "GE Revolution EVO 128-slice"
            });

        // Radiologist enters narrative containing acute panic findings
        const res = await request(app)
            .post(`/api/v1/radiology/orders/${ctOrderId}/report`)
            .set("Authorization", `Bearer ${radiologistToken}`)
            .send({
                findings: "Hyperdense crescentic extra-axial fluid collection in the right frontoparietal region measuring up to 14mm in depth. Significant mass effect with 6mm leftward midline shift and early subfalcine herniation. Underlying brain parenchyma shows diffuse cerebral edema.",
                impression: "Acute right subdural hematoma with significant midline shift and impending brain herniation. Immediate neurosurgical decompression indicated.",
                technique: "Non-contrast volumetric axial CT acquisition of brain with 1.25mm thin slices",
                classification: "ABNORMAL"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.criticalAlert).toBe(true);
        expect(res.body.data.classification).toBe("ABNORMAL");
        expect(res.body.data.criticalAlertNotes).toContain("CRITICAL PANIC RADIOLOGY FINDING DETECTED");
        expect(res.body.data.criticalAlertNotes).toContain("subdural hematoma");
        expect(res.body.data.criticalAlertNotes).toContain("midline shift");

        criticalReportId = res.body.data.id;
    });

    // Test 11: Electronic Verification & Final Sign-Off of Report
    test("11. PATCH /api/v1/radiology/reports/:id/verify - Radiologist verifies report with electronic signature", async () => {
        const res = await request(app)
            .patch(`/api/v1/radiology/reports/${normalReportId}/verify`)
            .set("Authorization", `Bearer ${radiologistToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("VERIFIED_FINAL");
        expect(res.body.data.signedAt).toBeDefined();
        expect(res.body.data.verifiedByName).toContain("Kofi Ansah");

        // Verify order transitioned to VERIFIED
        const orderCheck = await prisma.radiologyOrder.findUnique({
            where: { id: cxrOrderId }
        });
        expect(orderCheck.status).toBe("VERIFIED");
    });

    // Test 12: PACS & Radiology Command Center Telemetry
    test("12. GET /api/v1/radiology/telemetry - Retrieve real-time departmental telemetry & metrics", async () => {
        const res = await request(app)
            .get("/api/v1/radiology/telemetry")
            .set("Authorization", `Bearer ${radiologistToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.totalOrdersToday).toBeGreaterThanOrEqual(2);
        expect(res.body.data.verifiedReportsToday).toBeGreaterThanOrEqual(1);
        expect(res.body.data.criticalPanicAlertsToday).toBeGreaterThanOrEqual(1);
        expect(res.body.data.modalityBreakdown).toBeDefined();
        expect(res.body.data.modalityBreakdown["XRAY"]).toBeGreaterThanOrEqual(1);
        expect(res.body.data.modalityBreakdown["CT_SCAN"]).toBeGreaterThanOrEqual(1);
        expect(res.body.data.systemHealth.pacsArchiveOnline).toBe(true);
    });

    // Test 13: RBAC Security Guard: Unauthenticated & Unauthorized Enforcement
    test("13. GET /api/v1/radiology/orders - Reject unauthenticated access (401)", async () => {
        const res = await request(app)
            .get("/api/v1/radiology/orders");

        expect(res.status).toBe(401);
    });
});
