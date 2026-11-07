"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 6 / PROCEDURE 6 INTEGRATION TEST SUITE
Inpatient Department (IPD) Admission, Ward & Bed Management,
Bed Transfer, Daily Nursing Charts, Discharges & IPD Dashboard
LOCATION: tests/phase6.inpatient_ward_bed_admissions.test.js
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 6 / Procedure 6: Inpatient Department (IPD), Ward & Bed Management, Nursing Charts & Discharges", () => {
    let developerToken = null;
    let hospitalId = null;
    let testPatient = null;
    let testWard = null;
    let testRoom = null;
    let testBed1 = null;
    let testBed2 = null;
    let activeAdmission = null;

    beforeAll(async () => {
        // Authenticate as Developer
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "developer@gbs.com",
                password: "Admin123"
            });
        expect(loginRes.status).toBe(200);
        developerToken = loginRes.body.data.token;

        // Ensure hospital exists
        let hospital = await prisma.hospital.findFirst();
        if (!hospital) {
            hospital = await prisma.hospital.create({
                data: {
                    name: "Korle-Bu Teaching Hospital",
                    code: "KBTH-001",
                    email: "info@kbth.gov.gh",
                    phone: "+233302665401",
                    address: "Guggisberg Avenue, Korle-Bu, Accra",
                    city: "Accra",
                    region: "Greater Accra",
                    country: "Ghana"
                }
            });
        }
        hospitalId = hospital.id;

        // Register a test inpatient
        const uniqueTs = Date.now();
        const patientRes = await request(app)
            .post("/api/v1/patients/register")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                hospitalId,
                firstName: "Emmanuel",
                lastName: `Tetteh_${uniqueTs}`,
                dateOfBirth: "1982-03-25",
                gender: "MALE",
                phone: `+23324${Math.floor(1000000 + Math.random() * 9000000)}`,
                bloodGroup: "O_POSITIVE",
                genotype: "AA"
            });
        expect(patientRes.status).toBe(201);
        testPatient = patientRes.body.data.patient;
    });

    // 1. Create Hospital Ward
    test("POST /api/v1/admissions/wards - Creates a new inpatient ward with unique code", async () => {
        const uniqueCode = `MW_${Date.now().toString().slice(-4)}`;
        const res = await request(app)
            .post("/api/v1/admissions/wards")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                hospitalId,
                name: "Male Medical Ward",
                code: uniqueCode,
                description: "Adult male general internal medicine inpatient ward",
                capacity: 0
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe("Male Medical Ward");
        expect(res.body.data.code).toBe(uniqueCode);
        expect(res.body.data.active).toBe(true);

        testWard = res.body.data;
    });

    // 2. Create Room within Ward
    test("POST /api/v1/admissions/rooms - Creates a room inside the ward", async () => {
        const uniqueRoomCode = `RM_${Date.now().toString().slice(-4)}`;
        const res = await request(app)
            .post("/api/v1/admissions/rooms")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                hospitalId,
                wardId: testWard.id,
                name: "Ward Room 101",
                code: uniqueRoomCode,
                floor: "1st Floor - Block B",
                roomType: "GENERAL"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.wardId).toBe(testWard.id);
        expect(res.body.data.name).toBe("Ward Room 101");

        testRoom = res.body.data;
    });

    // 3. Create Beds in Room
    test("POST /api/v1/admissions/beds - Creates Bed 01 and Bed 02 with status AVAILABLE", async () => {
        const bed1Res = await request(app)
            .post("/api/v1/admissions/beds")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                hospitalId,
                roomId: testRoom.id,
                bedNumber: "01",
                bedType: "STANDARD",
                description: "Window side electric hospital bed"
            });

        expect(bed1Res.status).toBe(201);
        expect(bed1Res.body.success).toBe(true);
        expect(bed1Res.body.data.status).toBe("AVAILABLE");
        testBed1 = bed1Res.body.data;

        const bed2Res = await request(app)
            .post("/api/v1/admissions/beds")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                hospitalId,
                roomId: testRoom.id,
                bedNumber: "02",
                bedType: "STANDARD",
                description: "Corridor side electric hospital bed"
            });

        expect(bed2Res.status).toBe(201);
        expect(bed2Res.body.data.status).toBe("AVAILABLE");
        testBed2 = bed2Res.body.data;
    });

    // 4. Ward Bed Matrix & Map
    test("GET /api/v1/admissions/wards/:id/bed-matrix - Returns ward room and bed live map", async () => {
        const res = await request(app)
            .get(`/api/v1/admissions/wards/${testWard.id}/bed-matrix?hospitalId=${hospitalId}`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.wardId).toBe(testWard.id);
        expect(res.body.data.rooms.length).toBeGreaterThanOrEqual(1);

        const room = res.body.data.rooms.find(r => r.roomId === testRoom.id);
        expect(room).toBeDefined();
        expect(room.beds.length).toBeGreaterThanOrEqual(2);
        expect(room.beds.every(b => b.status === "AVAILABLE")).toBe(true);
    });

    // 5. Admit Patient to Bed 01
    test("POST /api/v1/admissions/admit - Admits patient to Bed 01 and marks bed as OCCUPIED", async () => {
        const res = await request(app)
            .post("/api/v1/admissions/admit")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                hospitalId,
                patientId: testPatient.id,
                wardId: testWard.id,
                roomId: testRoom.id,
                bedId: testBed1.id,
                admissionType: "EMERGENCY",
                admissionDiagnosis: "Acute lobar pneumonia with moderate respiratory distress",
                admittingDoctorName: "Dr. Mensah Osei",
                notes: "Patient admitted for intravenous antibiotics, supplemental oxygen and chest physiotherapy."
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.admissionNumber).toMatch(/^ADM-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("ADMITTED");
        expect(res.body.data.admissionDiagnosis).toBe("Acute lobar pneumonia with moderate respiratory distress");
        expect(res.body.data.patient.mrn).toBe(testPatient.patientNumber);
        expect(res.body.data.location.bedNumber).toBe("01");

        activeAdmission = res.body.data;

        // Verify Bed 01 status in database is OCCUPIED
        const bedInDb = await prisma.hospitalBed.findUnique({
            where: { id: testBed1.id }
        });
        expect(bedInDb.status).toBe("OCCUPIED");
    });

    // 6. Collision Prevention - Reject duplicate admission to occupied bed
    test("POST /api/v1/admissions/admit - Rejects admission to already occupied Bed 01 with 409", async () => {
        const res = await request(app)
            .post("/api/v1/admissions/admit")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                hospitalId,
                patientId: testPatient.id,
                wardId: testWard.id,
                roomId: testRoom.id,
                bedId: testBed1.id,
                admissionType: "GENERAL"
            });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("BED_NOT_AVAILABLE");
    });

    // 7. Verify Ward Bed Matrix shows Patient Occupancy
    test("GET /api/v1/admissions/wards/:id/bed-matrix - Verifies Bed 01 displays active occupant details", async () => {
        const res = await request(app)
            .get(`/api/v1/admissions/wards/${testWard.id}/bed-matrix?hospitalId=${hospitalId}`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        const room = res.body.data.rooms.find(r => r.roomId === testRoom.id);
        const bed1 = room.beds.find(b => b.bedId === testBed1.id);
        expect(bed1.status).toBe("OCCUPIED");
        expect(bed1.currentOccupant).toBeDefined();
        expect(bed1.currentOccupant.patientMrn).toBe(testPatient.patientNumber);
        expect(bed1.currentOccupant.diagnosis).toContain("pneumonia");

        const bed2 = room.beds.find(b => b.bedId === testBed2.id);
        expect(bed2.status).toBe("AVAILABLE");
        expect(bed2.currentOccupant).toBeNull();
    });

    // 8. Inpatient Bed Transfer from Bed 01 to Bed 02
    test("POST /api/v1/admissions/:id/transfer-bed - Transfers patient to Bed 02 and frees Bed 01", async () => {
        const res = await request(app)
            .post(`/api/v1/admissions/${activeAdmission.id}/transfer-bed`)
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                newWardId: testWard.id,
                newRoomId: testRoom.id,
                newBedId: testBed2.id,
                transferReason: "Closer bed allocation for continuous arterial oxygen monitoring."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.bedId).toBe(testBed2.id);
        expect(res.body.data.newLocation.bedNumber).toBe("02");

        // Verify Bed 01 is now AVAILABLE and Bed 02 is OCCUPIED
        const b1 = await prisma.hospitalBed.findUnique({ where: { id: testBed1.id } });
        const b2 = await prisma.hospitalBed.findUnique({ where: { id: testBed2.id } });
        expect(b1.status).toBe("AVAILABLE");
        expect(b2.status).toBe("OCCUPIED");
    });

    // 9. Record Inpatient Daily Nursing Charts & Rounding Notes
    test("POST /api/v1/admissions/:id/nursing-charts - Records shift vitals, fluid intake/output and notes", async () => {
        const res = await request(app)
            .post(`/api/v1/admissions/${activeAdmission.id}/nursing-charts`)
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                shift: "MORNING",
                temperature: 37.4,
                pulseRate: 82,
                respiratoryRate: 18,
                bloodPressure: "125/82",
                oxygenSaturation: 98,
                observation: "Patient resting comfortably in fowlers position. Mild cough with mucoid sputum.",
                nursingNote: "Administered IV Ceftriaxone 1g and IV Paracetamol 1g. Maintained nasal prongs oxygen at 2L/min.",
                intakeOutputNotes: "Oral fluids 600ml, IV fluids 500ml. Urine output 450ml clear straw.",
                medicationsAdministered: "IV Ceftriaxone 1g, IV Paracetamol 1g, Salbutamol nebulization"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.shift).toBe("MORNING");
        expect(res.body.data.temperature).toBe(37.4);
        expect(res.body.data.bloodPressure).toBe("125/82");
        expect(res.body.data.oxygenSaturation).toBe(98);
        expect(res.body.data.nurseName).toBeDefined();

        // Retrieve charts
        const listRes = await request(app)
            .get(`/api/v1/admissions/${activeAdmission.id}/nursing-charts`)
            .set("Authorization", `Bearer ${developerToken}`);
        expect(listRes.status).toBe(200);
        expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    });

    // 10. Get Active Inpatients List
    test("GET /api/v1/admissions/active - Returns currently admitted inpatients with length of stay", async () => {
        const res = await request(app)
            .get(`/api/v1/admissions/active?hospitalId=${hospitalId}`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);

        const entry = res.body.data.find(a => a.admissionId === activeAdmission.id);
        expect(entry).toBeDefined();
        expect(entry.patient.mrn).toBe(testPatient.patientNumber);
        expect(entry.location.bedNumber).toBe("02");
        expect(entry.daysAdmitted).toBeGreaterThanOrEqual(1);
    });

    // 11. Discharge Inpatient from Ward
    test("POST /api/v1/admissions/:id/discharge - Discharges patient and releases Bed 02 to AVAILABLE", async () => {
        const res = await request(app)
            .post(`/api/v1/admissions/${activeAdmission.id}/discharge`)
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                dischargeSummary: "Patient completed 5-day intravenous antibiotic therapy. Chest clear on auscultation. Afebrile. Discharged home on oral Amoxicillin.",
                dischargeCondition: "RECOVERED",
                dischargeDisposition: "HOME"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("DISCHARGED");
        expect(res.body.data.dischargedAt).toBeDefined();
        expect(res.body.data.dischargeCondition).toBe("RECOVERED");

        // Verify Bed 02 is now AVAILABLE
        const b2 = await prisma.hospitalBed.findUnique({ where: { id: testBed2.id } });
        expect(b2.status).toBe("AVAILABLE");
    });

    // 12. Inpatient Department (IPD) Dashboard Real-Life Telemetry
    test("GET /api/v1/admissions/dashboard - Live real-time statistics for wards and beds with authentic imagery", async () => {
        const res = await request(app)
            .get(`/api/v1/admissions/dashboard?hospitalId=${hospitalId}`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.telemetry.totalWardsCount).toBeGreaterThanOrEqual(1);
        expect(res.body.data.telemetry.totalBedsCount).toBeGreaterThanOrEqual(2);
        expect(res.body.data.telemetry.admissionsToday).toBeGreaterThanOrEqual(1);
        expect(res.body.data.telemetry.dischargesToday).toBeGreaterThanOrEqual(1);

        // Verify authentic ward role theme metadata
        const theme = res.body.data.dashboardRoleTheme;
        expect(theme.department).toBe("INPATIENT_DEPARTMENT");
        expect(theme.bannerImageUrl).toContain("inpatient_ward_hero.jpg");
        expect(theme.avatarBadgeUrl).toContain("ward_cross_badge.png");
        expect(theme.themeColor).toBe("#0D9488");
    });

    // 13. Security Enforcement - Reject unauthenticated access
    test("POST /api/v1/admissions/admit - Rejects unauthenticated request with 401", async () => {
        const res = await request(app)
            .post("/api/v1/admissions/admit")
            .send({
                hospitalId,
                patientId: testPatient.id,
                bedId: testBed1.id
            });

        expect(res.status).toBe(401);
    });
});
