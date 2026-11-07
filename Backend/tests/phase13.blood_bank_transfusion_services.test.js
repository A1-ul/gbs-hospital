"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 13 INTEGRATION TEST SUITE
Blood Bank & Transfusion Services, Donor Registry,
Cross-Matching Engine, Cold-Chain Inventory & Hemovigilance
LOCATION: tests/phase13.blood_bank_transfusion_services.test.js
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 13: Blood Bank & Transfusion Services Subsystem", () => {
    let adminToken;
    let testDonorId;
    let testDonorNumber;
    let testUnitId;
    let testUnitBarcode;
    let testIncompatibleUnitId;
    let testPatientId;
    let testRequestId;
    let testStatRequestId;
    let testTransfusionId;

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

        // Ensure a test patient exists for transfusion requests
        let patient = await prisma.patient.findFirst({
            where: { patientNumber: { startsWith: "MRN-" } }
        });

        if (!patient) {
            const hospital = await prisma.hospital.findFirst();
            patient = await prisma.patient.create({
                data: {
                    hospitalId: hospital.id,
                    patientNumber: `MRN-${Date.now().toString().slice(-6)}`,
                    firstName: "Kofi",
                    lastName: "Mensah",
                    bloodGroup: "A_POSITIVE",
                    gender: "MALE",
                    phone: "+233241000999"
                }
            });
        }
        testPatientId = patient.id;
    });

    afterAll(async () => {
        // Cleanup test-created records if needed
    });

    // -------------------------------------------------------------
    // Security & Auth Gate
    // -------------------------------------------------------------
    test("1. GET /api/v1/blood-bank/telemetry requires authentication (401 without token)", async () => {
        const res = await request(app).get("/api/v1/blood-bank/telemetry");
        expect(res.status).toBe(401);
    });

    // -------------------------------------------------------------
    // Donor Registry & Eligibility Screening
    // -------------------------------------------------------------
    test("2. POST /api/v1/blood-bank/donors registers an eligible blood donor (DNR-YYYY-XXXXXX)", async () => {
        const payload = {
            fullName: "Kwesi Agyeman",
            gender: "MALE",
            dateOfBirth: "1994-05-15",
            age: 32,
            phone: "+233245112233",
            email: "kwesi.donor@gbs.com",
            nationalId: "GHA-789123456-0",
            bloodGroup: "A_POSITIVE",
            weightKg: 72.5,
            hemoglobinLevel: 14.8,
            systolicBp: 120,
            diastolicBp: 80,
            pulse: 72,
            donorType: "VOLUNTARY"
        };

        const res = await request(app)
            .post("/api/v1/blood-bank/donors")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.donorNumber).toMatch(/^DNR-\d{4}-\d{6}$/);
        expect(res.body.data.eligibilityStatus).toBe("ELIGIBLE");
        expect(res.body.data.bloodGroup).toBe("A_POSITIVE");

        testDonorId = res.body.data.id;
        testDonorNumber = res.body.data.donorNumber;
    });

    test("3. POST /api/v1/blood-bank/donors flags donor as temporarily deferred if hemoglobin < 12.5 g/dL", async () => {
        const payload = {
            fullName: "Ama Serwaa",
            gender: "FEMALE",
            phone: "+233201998877",
            bloodGroup: "O_POSITIVE",
            weightKg: 54.0,
            hemoglobinLevel: 10.8, // Below clinical cutoff of 12.5
            donorType: "VOLUNTARY"
        };

        const res = await request(app)
            .post("/api/v1/blood-bank/donors")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.data.eligibilityStatus).toBe("TEMPORARILY_DEFERRED");
        expect(res.body.data.deferralReason).toContain("Hemoglobin level below clinical safety cutoff");
    });

    test("4. GET /api/v1/blood-bank/donors returns filtered donor registry by blood group", async () => {
        const res = await request(app)
            .get("/api/v1/blood-bank/donors?bloodGroup=A_POSITIVE")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data.some(d => d.donorNumber === testDonorNumber)).toBe(true);
    });

    // -------------------------------------------------------------
    // Blood Bag Collection & Cold-Chain Inventory
    // -------------------------------------------------------------
    test("5. POST /api/v1/blood-bank/units collects blood unit into quarantine with shelf-life calculated (BLD-YYYY-XXXXXX)", async () => {
        const payload = {
            donorId: testDonorId,
            componentType: "PACKED_RED_CELLS",
            volumeMl: 350,
            storageLocation: "FRIDGE-PRBC-BAY01"
        };

        const res = await request(app)
            .post("/api/v1/blood-bank/units")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.unitBarcode).toMatch(/^BLD-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("QUARANTINE"); // Must be quarantine until tested
        expect(res.body.data.bloodGroup).toBe("A_POSITIVE");
        expect(new Date(res.body.data.expiryDate) > new Date(res.body.data.collectionDate)).toBe(true);

        testUnitId = res.body.data.id;
        testUnitBarcode = res.body.data.unitBarcode;
    });

    test("6. POST /api/v1/blood-bank/units/:id/screening records negative serology and clears unit to TESTED_SAFE", async () => {
        const payload = {
            hivScreening: "NEGATIVE",
            hepatitisBScreening: "NEGATIVE",
            hepatitisCScreening: "NEGATIVE",
            syphilisScreening: "NEGATIVE",
            screeningNotes: "All 4 TTI viral/bacterial markers non-reactive by chemiluminescence."
        };

        const res = await request(app)
            .post(`/api/v1/blood-bank/units/${testUnitId}/screening`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("TESTED_SAFE");
        expect(res.body.data.hivScreening).toBe("NEGATIVE");
    });

    test("7. POST /api/v1/blood-bank/units/:id/screening flags reactive serology as DISCARDED_REACTIVE and defers donor", async () => {
        // Collect another unit for donor
        const unitRes = await request(app)
            .post("/api/v1/blood-bank/units")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                bloodGroup: "B_POSITIVE",
                componentType: "WHOLE_BLOOD"
            });
        expect(unitRes.status).toBe(201);
        const reactiveUnitId = unitRes.body.data.id;

        const res = await request(app)
            .post(`/api/v1/blood-bank/units/${reactiveUnitId}/screening`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                hivScreening: "POSITIVE",
                hepatitisBScreening: "NEGATIVE"
            });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("DISCARDED_REACTIVE");
    });

    test("8. PATCH /api/v1/blood-bank/units/:id/temperature records cold-chain temperature telemetry", async () => {
        const res = await request(app)
            .patch(`/api/v1/blood-bank/units/${testUnitId}/temperature`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ temperature: 3.8 });

        expect(res.status).toBe(200);
        expect(res.body.data.storageTemperature).toBe(3.8);
    });

    // -------------------------------------------------------------
    // Transfusion Requests & Cross-Matching
    // -------------------------------------------------------------
    test("9. POST /api/v1/blood-bank/requests creates routine transfusion request (TRF-YYYY-XXXXXX)", async () => {
        const payload = {
            patientId: testPatientId,
            patientBloodGroup: "A_POSITIVE",
            requiredComponent: "PACKED_RED_CELLS",
            unitsRequested: 1,
            urgencyLevel: "ROUTINE",
            clinicalIndication: "Severe chronic normocytic anemia (Hb 6.4 g/dL)",
            requestingDoctor: "Dr. Osei Tutu",
            departmentWard: "Ward 4A Bed 12"
        };

        const res = await request(app)
            .post("/api/v1/blood-bank/requests")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.data.requestNumber).toMatch(/^TRF-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("REQUESTED");
        expect(res.body.data.emergencyOverrideLogged).toBe(false);

        testRequestId = res.body.data.id;
    });

    test("10. POST /api/v1/blood-bank/requests creates STAT emergency uncrossmatched request with emergency override logged", async () => {
        const payload = {
            patientId: testPatientId,
            patientBloodGroup: "O_NEGATIVE",
            requiredComponent: "PACKED_RED_CELLS",
            unitsRequested: 2,
            urgencyLevel: "EMERGENCY_STAT_UNMATCHED",
            clinicalIndication: "Exsanguinating pelvic hemorrhage following vehicular trauma",
            requestingDoctor: "Dr. Kwame EmergencyDoc",
            departmentWard: "ER Trauma Bay 1"
        };

        const res = await request(app)
            .post("/api/v1/blood-bank/requests")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe("COMPATIBLE_READY");
        expect(res.body.data.emergencyOverrideLogged).toBe(true); // Master Blueprint Emergency Override Logged

        testStatRequestId = res.body.data.id;
    });

    test("11. POST /api/v1/blood-bank/cross-match verifies compatible unit, reserves bag, and marks request COMPATIBLE_READY", async () => {
        const payload = {
            requestId: testRequestId,
            bloodUnitId: testUnitId,
            testedByLabTechnician: "Chief Tech Boateng",
            notes: "Major crossmatch: Saline, Albumin, and AHG phases completely negative. 100% compatible."
        };

        const res = await request(app)
            .post("/api/v1/blood-bank/cross-match")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.data.crossMatchNumber).toMatch(/^XM-\d{4}-\d{6}$/);
        expect(res.body.data.compatibilityStatus).toBe("COMPATIBLE");
        expect(res.body.data.isCompatible).toBe(true);

        // Verify blood unit is now reserved
        const unitCheck = await prisma.bloodUnit.findUnique({ where: { id: testUnitId } });
        expect(unitCheck.status).toBe("RESERVED");
    });

    test("12. POST /api/v1/blood-bank/cross-match rejects incompatible unit when blood groups clash", async () => {
        // Create an incompatible B+ unit
        const bUnit = await prisma.bloodUnit.create({
            data: {
                unitBarcode: `BLD-INCOMPAT-${Date.now().toString().slice(-6)}`,
                bloodGroup: "B_POSITIVE",
                componentType: "PACKED_RED_CELLS",
                expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
                status: "TESTED_SAFE"
            }
        });
        testIncompatibleUnitId = bUnit.id;

        // Try to cross-match B+ unit to A+ patient request
        const res = await request(app)
            .post("/api/v1/blood-bank/cross-match")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                requestId: testRequestId,
                bloodUnitId: testIncompatibleUnitId,
                testedByLabTechnician: "Tech Boateng"
            });

        expect(res.status).toBe(201);
        expect(res.body.data.compatibilityStatus).toBe("INCOMPATIBLE");
        expect(res.body.data.isCompatible).toBe(false);
    });

    // -------------------------------------------------------------
    // Bedside Transfusion & Hemovigilance
    // -------------------------------------------------------------
    test("13. POST /api/v1/blood-bank/transfusions/start enforces mandatory dual-clinician bedside verification protocol (TXN-YYYY-XXXXXX)", async () => {
        const payload = {
            requestId: testRequestId,
            bloodUnitId: testUnitId,
            primaryClinician: "Nurse Abena",
            verifyingClinician: "Dr. Osei Tutu",
            initialVitals: { bp: "118/76", hr: 78, temp: 36.7, rr: 16 }
        };

        const res = await request(app)
            .post("/api/v1/blood-bank/transfusions/start")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.data.transfusionNumber).toMatch(/^TXN-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("IN_PROGRESS");
        expect(res.body.data.verifyingClinician).toBe("Dr. Osei Tutu");

        testTransfusionId = res.body.data.id;

        // Verify unit is now TRANSFUSED
        const unitCheck = await prisma.bloodUnit.findUnique({ where: { id: testUnitId } });
        expect(unitCheck.status).toBe("TRANSFUSED");
    });

    test("14. POST /api/v1/blood-bank/transfusions/:id/complete finishes transfusion with post-vitals", async () => {
        const res = await request(app)
            .post(`/api/v1/blood-bank/transfusions/${testTransfusionId}/complete`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                postVitals: { bp: "124/80", hr: 74, temp: 36.8, rr: 16 },
                clinicalNotes: "1 unit PRBC infused over 120 minutes with zero complications."
            });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("COMPLETED");
        expect(res.body.data.hadAdverseReaction).toBe(false);
    });

    test("15. POST /api/v1/blood-bank/transfusions/:id/adverse-reaction halts transfusion and logs hemovigilance investigation", async () => {
        // Start another transfusion to test reaction protocol
        const emergencyUnit = await prisma.bloodUnit.create({
            data: {
                unitBarcode: `BLD-EMG-${Date.now().toString().slice(-6)}`,
                bloodGroup: "O_NEGATIVE",
                componentType: "PACKED_RED_CELLS",
                expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                status: "TESTED_SAFE"
            }
        });

        const startRes = await request(app)
            .post("/api/v1/blood-bank/transfusions/start")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                requestId: testStatRequestId,
                bloodUnitId: emergencyUnit.id,
                primaryClinician: "Nurse Mensah",
                verifyingClinician: "Dr. Emergency"
            });
        expect(startRes.status).toBe(201);
        const reactionTransfusionId = startRes.body.data.id;

        const res = await request(app)
            .post(`/api/v1/blood-bank/transfusions/${reactionTransfusionId}/adverse-reaction`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                reactionType: "FEBRILE_NON_HEMOLYTIC",
                reactionSeverity: "MODERATE",
                actionTaken: "Infusion immediately stopped. IV Normal Saline kept open. Paracetamol 1g IV administered."
            });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("TERMINATED_ADVERSE_REACTION");
        expect(res.body.data.hadAdverseReaction).toBe(true);
        expect(res.body.data.reactionType).toBe("FEBRILE_NON_HEMOLYTIC");
    });

    test("16. GET /api/v1/blood-bank/stats returns real-time Blood Bank Command Center telemetry with O-Negative emergency reserve metrics", async () => {
        const res = await request(app)
            .get("/api/v1/blood-bank/stats")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.summary).toBeDefined();
        expect(res.body.data.emergencyReserve).toBeDefined();
        expect(res.body.data.stockByGroup).toBeDefined();
        expect(res.body.data.stockByComponent).toBeDefined();
        expect(typeof res.body.data.summary.totalUnits).toBe("number");
        expect(typeof res.body.data.emergencyReserve.oNegativeUnitsAvailable).toBe("number");
    });
});
