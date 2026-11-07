"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 8 INTEGRATION TEST SUITE: LABORATORY & PATHOLOGY
Zero Fake/Mock Data - Real PostgreSQL 16 Persistence
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 8: Laboratory Diagnostics, Specimen Barcode Accessioning, Panic Engine & Verification", () => {
    let devToken;
    let labTechToken;
    let labTechUser;
    let testHospital;
    let testPatient;
    let testEncounter;
    let fbcRequestId;
    let statRequestId;
    let sampleBarcode;

    const uniqueId = Date.now();
    const labTechEmail = `labtech_${uniqueId}@gbs.com`;

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
                    name: "GBS Central Diagnostic Hospital",
                    code: "GBS-LAB-01",
                    email: "lab@gbshospital.com",
                    phone: "+233200000002",
                    address: "Medical Center, Accra",
                    city: "Accra",
                    region: "Greater Accra",
                    country: "Ghana"
                }
            });
        }
        expect(testHospital).toBeDefined();

        // 3. Create and approve Lab Technician user
        const techSignup = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                email: labTechEmail,
                password: "Password123!",
                firstName: "Yaw",
                lastName: "Boakye-Scientist",
                role: "LAB_TECHNICIAN"
            });
        expect(techSignup.status).toBe(201);
        const techId = techSignup.body.data.id;

        const approveRes = await request(app)
            .patch(`/api/v1/users/${techId}/approve`)
            .set("Authorization", `Bearer ${devToken}`);
        expect(approveRes.status).toBe(200);

        const techLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: labTechEmail,
                password: "Password123!"
            });
        expect(techLogin.status).toBe(200);
        labTechToken = techLogin.body.data.token;
        labTechUser = techLogin.body.data.user;
        expect(labTechToken).toBeDefined();

        // 4. Register real test Patient
        const patientRes = await request(app)
            .post("/api/v1/patients/register")
            .set("Authorization", `Bearer ${devToken}`)
            .send({
                hospitalId: testHospital.id,
                firstName: "Kwabena",
                lastName: `Osei_${uniqueId}`,
                gender: "MALE",
                dateOfBirth: "1994-06-20",
                phone: `+23324${String(uniqueId).slice(-7)}`,
                bloodGroup: "A_POSITIVE",
                genotype: "AS"
            });
        expect(patientRes.status).toBe(201);
        testPatient = patientRes.body.data.patient;

        // 5. Check in patient at OPD
        const checkinRes = await request(app)
            .post("/api/v1/clinical/opd/check-in")
            .set("Authorization", `Bearer ${devToken}`)
            .send({
                hospitalId: testHospital.id,
                patientId: testPatient.id,
                department: "GENERAL_OPD",
                priority: "PRIORITY",
                chiefComplaint: "Severe pallor, high grade fever, dizziness and jaundice"
            });
        expect(checkinRes.status).toBe(201);
        testEncounter = checkinRes.body.data.encounter;
    });

    afterAll(async () => {
        try {
            if (fbcRequestId || statRequestId) {
                const reqIds = [fbcRequestId, statRequestId].filter(Boolean);
                await prisma.laboratoryTestResult.deleteMany({ where: { requestId: { in: reqIds } } });
                await prisma.laboratorySample.deleteMany({ where: { requestId: { in: reqIds } } });
                await prisma.laboratoryRequest.deleteMany({ where: { id: { in: reqIds } } });
            }
            if (testEncounter) {
                await prisma.opdQueueTicket.deleteMany({ where: { encounterId: testEncounter.id } });
                await prisma.patientEncounter.deleteMany({ where: { id: testEncounter.id } });
            }
            if (testPatient) {
                await prisma.medicalFolder.deleteMany({ where: { patientId: testPatient.id } });
                await prisma.patient.deleteMany({ where: { id: testPatient.id } });
            }
            await prisma.user.deleteMany({ where: { email: labTechEmail } });
        } catch (err) {
            // Ignore teardown cleanup errors
        }
    });

    test("1. Doctor orders Full Blood Count (FBC) diagnostic test panel", async () => {
        const res = await request(app)
            .post("/api/v1/laboratory/requests")
            .set("Authorization", `Bearer ${devToken}`)
            .send({
                encounterId: testEncounter.id,
                testName: "Full Blood Count (FBC)",
                testCode: "LAB-FBC",
                priority: "ROUTINE",
                clinicalNotes: "Investigate microcytic anemia vs acute infection",
                specimenType: "WHOLE_BLOOD"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.requestNumber).toMatch(/^LAB-\d{4}-\d{6}$/);
        expect(res.body.data.testName).toBe("Full Blood Count (FBC)");
        expect(res.body.data.department).toBe("Hematology");
        expect(res.body.data.status).toBe("REQUESTED");
        expect(res.body.data.patient.mrn).toBe(testPatient.patientNumber);

        fbcRequestId = res.body.data.id;
    });

    test("2. Doctor orders urgent STAT_EMERGENCY diagnostic investigation", async () => {
        const res = await request(app)
            .post("/api/v1/laboratory/requests")
            .set("Authorization", `Bearer ${devToken}`)
            .send({
                encounterId: testEncounter.id,
                testName: "Malaria Parasite (MP) by Microscopy",
                testCode: "LAB-MAL",
                priority: "STAT_EMERGENCY",
                clinicalNotes: "Rule out cerebral malaria in febrile patient",
                specimenType: "WHOLE_BLOOD"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.priority).toBe("STAT_EMERGENCY");
        expect(res.body.data.department).toBe("Parasitology");

        statRequestId = res.body.data.id;
    });

    test("3. Queries pending laboratory worklist prioritized by STAT_EMERGENCY first", async () => {
        const res = await request(app)
            .get("/api/v1/laboratory/requests?status=REQUESTED")
            .set("Authorization", `Bearer ${labTechToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(2);

        // First item in prioritized queue must be STAT_EMERGENCY
        const first = res.body.data[0];
        expect(first.priority).toBe("STAT_EMERGENCY");
    });

    test("4. Phlebotomist collects specimen sample and generates barcode SMP-YYYY-XXXXXX", async () => {
        const res = await request(app)
            .post(`/api/v1/laboratory/requests/${fbcRequestId}/collect-sample`)
            .set("Authorization", `Bearer ${devToken}`)
            .send({
                specimenType: "WHOLE_BLOOD",
                tubeColor: "EDTA_PURPLE",
                collectionVolume: "4.0 mL",
                notes: "Venipuncture right antecubital fossa"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.sampleBarcode).toMatch(/^SMP-\d{4}-\d{6}$/);
        expect(res.body.data.tubeColor).toBe("EDTA_PURPLE");
        expect(res.body.data.status).toBe("COLLECTED");
        expect(res.body.data.requestStatus).toBe("SAMPLE_COLLECTED");

        sampleBarcode = res.body.data.sampleBarcode;
    });

    test("5. Rejects duplicate sample collection with 409 INVALID_REQUEST_STATUS", async () => {
        const res = await request(app)
            .post(`/api/v1/laboratory/requests/${fbcRequestId}/collect-sample`)
            .set("Authorization", `Bearer ${devToken}`)
            .send({
                specimenType: "WHOLE_BLOOD"
            });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("INVALID_REQUEST_STATUS");
    });

    test("6. Laboratory accessioning receives specimen into workqueue", async () => {
        const res = await request(app)
            .post(`/api/v1/laboratory/samples/${sampleBarcode}/receive`)
            .set("Authorization", `Bearer ${labTechToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.sampleBarcode).toBe(sampleBarcode);
        expect(res.body.data.status).toBe("RECEIVED_IN_LAB");
        expect(res.body.data.requestStatus).toBe("RECEIVED_IN_LAB");
        expect(res.body.data.receivedByName).toBeDefined();
    });

    test("7. Lab Technician records test parameter results with reference range evaluation", async () => {
        const res = await request(app)
            .post(`/api/v1/laboratory/requests/${fbcRequestId}/results`)
            .set("Authorization", `Bearer ${labTechToken}`)
            .send({
                summaryResult: "Normal FBC parameters",
                parameters: [
                    { parameterName: "Hemoglobin", parameterCode: "HB", measuredValue: "14.5", unit: "g/dL" },
                    { parameterName: "White Blood Cells (WBC)", parameterCode: "WBC", measuredValue: "6.8", unit: "10^9/L" },
                    { parameterName: "Platelets", parameterCode: "PLT", measuredValue: "260", unit: "10^9/L" },
                    { parameterName: "Hematocrit (PCV)", parameterCode: "PCV", measuredValue: "42.5", unit: "%" }
                ]
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("COMPLETED");
        expect(res.body.data.hasCriticalPanicAlert).toBe(false);
        expect(res.body.data.parameters.length).toBe(4);

        const hbParam = res.body.data.parameters.find(p => p.parameterCode === "HB");
        expect(hbParam).toBeDefined();
        expect(hbParam.abnormalFlag).toBe("NORMAL");
    });

    test("8. Critical Panic Value Engine detects life-threatening abnormal parameters", async () => {
        // Collect and receive the STAT Malaria/blood request
        await request(app)
            .post(`/api/v1/laboratory/requests/${statRequestId}/collect-sample`)
            .set("Authorization", `Bearer ${devToken}`)
            .send({ specimenType: "WHOLE_BLOOD", tubeColor: "EDTA_PURPLE" });

        const reqDossier = await request(app)
            .get(`/api/v1/laboratory/requests/${statRequestId}`)
            .set("Authorization", `Bearer ${devToken}`);
        const statBarcode = reqDossier.body.data.samples[0].sampleBarcode;

        await request(app)
            .post(`/api/v1/laboratory/samples/${statBarcode}/receive`)
            .set("Authorization", `Bearer ${labTechToken}`);

        // Enter critical low hemoglobin (4.2 g/dL - Panic threshold is < 7.0 g/dL)
        const res = await request(app)
            .post(`/api/v1/laboratory/requests/${statRequestId}/results`)
            .set("Authorization", `Bearer ${labTechToken}`)
            .send({
                summaryResult: "Critical severe anemia with heavy parasitemia",
                parameters: [
                    { parameterName: "Hemoglobin", parameterCode: "HB", measuredValue: "4.2", unit: "g/dL" },
                    { parameterName: "Malaria Parasite (P. falciparum)", parameterCode: "MP", measuredValue: "Positive (+++)", unit: "visual" }
                ]
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.hasCriticalPanicAlert).toBe(true);

        const hb = res.body.data.parameters.find(p => p.parameterCode === "HB");
        expect(hb.abnormalFlag).toBe("CRITICAL_PANIC_LOW");
    });

    test("9. Rejects verification when results have not been entered with 409", async () => {
        // Create an unfulfilled request
        const freshReq = await request(app)
            .post("/api/v1/laboratory/requests")
            .set("Authorization", `Bearer ${devToken}`)
            .send({
                encounterId: testEncounter.id,
                testName: "Renal Function Tests (BUE & Cr)",
                testCode: "LAB-RFT"
            });
        const freshId = freshReq.body.data.id;

        const res = await request(app)
            .post(`/api/v1/laboratory/requests/${freshId}/verify`)
            .set("Authorization", `Bearer ${devToken}`);

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("NOT_READY_FOR_VERIFICATION");

        // Clean up
        await prisma.laboratoryRequest.delete({ where: { id: freshId } });
    });

    test("10. Pathologist / Senior Scientist verifies and releases official report", async () => {
        const res = await request(app)
            .post(`/api/v1/laboratory/requests/${fbcRequestId}/verify`)
            .set("Authorization", `Bearer ${devToken}`)
            .send({ notes: "Reviewed and approved for medical chart" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("VERIFIED");
        expect(res.body.data.verifiedByName).toBeDefined();
        expect(res.body.data.verifiedAt).toBeDefined();
    });

    test("11. Retrieves comprehensive laboratory investigation dossier with chain-of-custody", async () => {
        const res = await request(app)
            .get(`/api/v1/laboratory/requests/${fbcRequestId}`)
            .set("Authorization", `Bearer ${devToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const data = res.body.data;
        expect(data.requestNumber).toMatch(/^LAB-\d{4}-\d{6}$/);
        expect(data.status).toBe("VERIFIED");
        expect(data.patient.mrn).toBe(testPatient.patientNumber);
        expect(data.samples.length).toBeGreaterThanOrEqual(1);
        expect(data.samples[0].sampleBarcode).toBe(sampleBarcode);
        expect(data.samples[0].receivedByName).toBeDefined();
        expect(data.parameters.length).toBe(4);
        expect(data.verification.isVerified).toBe(true);
    });

    test("12. Laboratory dashboard telemetry aggregates real-time operational counts and authentic theme metadata", async () => {
        const res = await request(app)
            .get("/api/v1/laboratory/dashboard/telemetry")
            .set("Authorization", `Bearer ${labTechToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const { operationalStats, themeMetadata } = res.body.data;
        expect(operationalStats.totalRequests).toBeGreaterThanOrEqual(2);
        expect(operationalStats.verifiedTodayCount).toBeGreaterThanOrEqual(1);
        expect(operationalStats.criticalPanicAlertsTodayCount).toBeGreaterThanOrEqual(1);

        expect(themeMetadata.role).toBe("LAB_TECHNICIAN");
        expect(themeMetadata.heroImage).toBe("/assets/images/roles/lab_pathology_hero.jpg");
        expect(themeMetadata.icon).toBe("/assets/images/icons/microscope_flask_icon.png");
        expect(themeMetadata.badge).toBe("CLINICAL_PATHOLOGY_LABORATORY");
    });

    test("13. Rejects unauthenticated access to laboratory endpoints with 401", async () => {
        const res = await request(app)
            .get("/api/v1/laboratory/requests");

        expect(res.status).toBe(401);
    });
});
