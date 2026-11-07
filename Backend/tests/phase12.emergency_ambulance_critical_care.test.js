"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 12 INTEGRATION TEST SUITE
Emergency & Accident Subsystem, Ambulance Fleet,
GPS Telemetry, Dispatch Lifecycle & Critical Care
LOCATION: tests/phase12.emergency_ambulance_critical_care.test.js
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 12: Emergency & Ambulance Management Subsystem", () => {
    let adminToken;
    let doctorToken;
    let testAmbulanceId;
    let testDispatchId;
    let testEmergencyCaseId;

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

        // Ensure Doctor account exists & authenticate
        let doctorUser = await prisma.user.findFirst({
            where: { email: "test.emergency.doc@gbs.com" }
        });

        if (!doctorUser) {
            const docRole = await prisma.role.findUnique({ where: { name: "DOCTOR" } });
            doctorUser = await prisma.user.create({
                data: {
                    firstName: "Kwame",
                    lastName: "EmergencyDoc",
                    email: "test.emergency.doc@gbs.com",
                    password: adminRes.body.data.user.id, // dummy hash for test
                    roleId: docRole.id,
                    active: true
                }
            });
        }

        const devRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "developer@gbs.com",
                password: "Admin123"
            });
        doctorToken = devRes.body.data.token; // Developer has full clinical access
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    test("1. GET /api/v1/emergency/stats - should return operational telemetry and patient safety guardrails", async () => {
        const res = await request(app)
            .get("/api/v1/emergency/stats")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("fleet");
        expect(res.body.data).toHaveProperty("dispatches");
        expect(res.body.data).toHaveProperty("emergencyRoom");
        expect(res.body.data.patientSafetyGuardrails.emergencyAccessAlwaysAvailable).toBe(true);
        expect(res.body.data.patientSafetyGuardrails.clinicalOverrideLogging).toBe(true);
    });

    test("2. POST /api/v1/emergency/ambulances - should register a new ambulance in the fleet", async () => {
        const uniqueSuffix = Date.now().toString().slice(-4);
        const res = await request(app)
            .post("/api/v1/emergency/ambulances")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                vehicleNumber: `AMB-${uniqueSuffix}`,
                registrationPlate: `GV-${uniqueSuffix}-26`,
                type: "ADVANCED_LIFE_SUPPORT",
                assignedDriver: "Kofi Mensah",
                assignedParamedic: "Akua Sarpong",
                equipmentChecklist: {
                    defibrillator: true,
                    oxygenTank: true,
                    ventilator: true,
                    suctionUnit: true
                }
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.vehicleNumber).toBe(`AMB-${uniqueSuffix}`);
        expect(res.body.data.status).toBe("AVAILABLE");
        testAmbulanceId = res.body.data.id;
    });

    test("3. GET /api/v1/emergency/ambulances - should list fleet ambulances", async () => {
        const res = await request(app)
            .get("/api/v1/emergency/ambulances")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.some(a => a.id === testAmbulanceId)).toBe(true);
    });

    test("4. PATCH /api/v1/emergency/ambulances/:id/telemetry - should update live GPS tracking coordinates", async () => {
        const res = await request(app)
            .patch(`/api/v1/emergency/ambulances/${testAmbulanceId}/telemetry`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                latitude: 5.6145,
                longitude: -0.1982,
                currentSpeedKmh: 68.5,
                heading: 145.0,
                fuelLevelPercent: 92
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.latitude).toBeCloseTo(5.6145, 4);
        expect(res.body.data.currentSpeedKmh).toBe(68.5);
        expect(res.body.data.fuelLevelPercent).toBe(92);
    });

    test("5. POST /api/v1/emergency/dispatches - should dispatch ambulance callout and transition vehicle to DISPATCHED", async () => {
        const res = await request(app)
            .post("/api/v1/emergency/dispatches")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                ambulanceId: testAmbulanceId,
                callerName: "Emmanuel Osei",
                callerPhone: "+233244112233",
                incidentLocation: "Independence Avenue, Ridge, Accra",
                pickupLatitude: 5.5680,
                pickupLongitude: -0.1945,
                triageSeverity: "RED_RESUSCITATION",
                chiefComplaint: "Major motor vehicle accident with severe trauma and chest pain"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.dispatchNumber).toMatch(/^DISP-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("DISPATCHED");
        testDispatchId = res.body.data.id;

        // Verify ambulance status transitioned to DISPATCHED
        const amb = await prisma.ambulance.findUnique({ where: { id: testAmbulanceId } });
        expect(amb.status).toBe("DISPATCHED");
    });

    test("6. PATCH /api/v1/emergency/dispatches/:id/status - should update status to ON_SCENE and compute response time", async () => {
        const res = await request(app)
            .patch(`/api/v1/emergency/dispatches/${testDispatchId}/status`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                status: "ON_SCENE",
                vitalSignsAtScene: {
                    bloodPressure: "90/60",
                    pulse: 115,
                    spO2: 91,
                    glasgowComaScale: 13
                }
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("ON_SCENE");
        expect(res.body.data.arrivedSceneAt).toBeTruthy();
        expect(typeof res.body.data.responseTimeSeconds).toBe("number");

        const amb = await prisma.ambulance.findUnique({ where: { id: testAmbulanceId } });
        expect(amb.status).toBe("ON_SCENE");
    });

    test("7. PATCH /api/v1/emergency/dispatches/:id/status - should transition status to TRANSPORTING", async () => {
        const res = await request(app)
            .patch(`/api/v1/emergency/dispatches/${testDispatchId}/status`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                status: "TRANSPORTING",
                handoverNotes: "Patient intubated with cervical collar applied. En route to Trauma Resuscitation Bay 1."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("TRANSPORTING");
        expect(res.body.data.departedSceneAt).toBeTruthy();

        const amb = await prisma.ambulance.findUnique({ where: { id: testAmbulanceId } });
        expect(amb.status).toBe("TRANSPORTING");
    });

    test("8. PATCH /api/v1/emergency/dispatches/:id/status - should complete dispatch, compute transit time and release ambulance to AVAILABLE", async () => {
        const res = await request(app)
            .patch(`/api/v1/emergency/dispatches/${testDispatchId}/status`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                status: "COMPLETED"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("COMPLETED");
        expect(res.body.data.clearedAt).toBeTruthy();
        expect(typeof res.body.data.transitTimeSeconds).toBe("number");

        const amb = await prisma.ambulance.findUnique({ where: { id: testAmbulanceId } });
        expect(amb.status).toBe("AVAILABLE");
    });

    test("9. POST /api/v1/emergency/cases - should register emergency room case with override logging enabled", async () => {
        const res = await request(app)
            .post("/api/v1/emergency/cases")
            .set("Authorization", `Bearer ${doctorToken}`)
            .send({
                patientName: "John Doe (Trauma)",
                triageCategory: "RED_RESUSCITATION",
                arrivalMode: "AMBULANCE",
                dispatchId: testDispatchId,
                assignedBay: "TRAUMA_BAY_1",
                attendingPhysician: "Dr. K. Mensah, MD (Trauma Surgeon)",
                triageNurse: "Staff Nurse S. Johnson",
                clinicalNotes: "Massive hemothorax with blunt chest trauma following highway collision. Chest tube placed."
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.caseNumber).toMatch(/^EMG-\d{4}-\d{6}$/);
        expect(res.body.data.triageCategory).toBe("RED_RESUSCITATION");
        expect(res.body.data.emergencyOverrideLogged).toBe(true);
        expect(res.body.data.status).toBe("TRIAGED");
        testEmergencyCaseId = res.body.data.id;
    });

    test("10. PATCH /api/v1/emergency/cases/:id - should transition status to STABILIZED and record stabilizedAt", async () => {
        const res = await request(app)
            .patch(`/api/v1/emergency/cases/${testEmergencyCaseId}`)
            .set("Authorization", `Bearer ${doctorToken}`)
            .send({
                status: "STABILIZED",
                clinicalNotes: "Bleeding arrested, chest tube draining, BP stabilized to 110/70. Preparing for emergency thoracotomy."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("STABILIZED");
        expect(res.body.data.stabilizedAt).toBeTruthy();
    });

    test("11. PATCH /api/v1/emergency/cases/:id - should transfer emergency case to OT/ICU with dispositionAt", async () => {
        const res = await request(app)
            .patch(`/api/v1/emergency/cases/${testEmergencyCaseId}`)
            .set("Authorization", `Bearer ${doctorToken}`)
            .send({
                status: "TRANSFERRED_OT",
                clinicalNotes: "Patient wheeled to Main Operating Theatre Suite 1 for exploratory surgery."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("TRANSFERRED_OT");
        expect(res.body.data.dispositionAt).toBeTruthy();
    });

    test("12. GET /api/v1/emergency/cases - should list emergency cases with relations", async () => {
        const res = await request(app)
            .get("/api/v1/emergency/cases")
            .set("Authorization", `Bearer ${doctorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.some(c => c.id === testEmergencyCaseId)).toBe(true);
    });

    test("13. GET /api/v1/emergency/stats - should reject unauthenticated requests (401 AUTH_REQUIRED)", async () => {
        const res = await request(app).get("/api/v1/emergency/stats");
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("AUTH_REQUIRED");
    });

    test("14. GET /api/v1/emergency/stats - should verify live telemetry updates dynamically from database records", async () => {
        const res = await request(app)
            .get("/api/v1/emergency/stats")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.fleet.total).toBeGreaterThanOrEqual(1);
        expect(res.body.data.dispatches.averageResponseTimeMinutes).toBeGreaterThan(0);
    });
});
