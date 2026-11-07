"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 4 / PROCEDURE 4 INTEGRATION TEST SUITE
Outpatient Department (OPD) Patient Queuing,
Nurse Triage, Adult NEWS2 Scoring, Vital Signs & Encounter Workflows
LOCATION: tests/phase4.opd_triage_vitals.test.js
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 4 / Procedure 4: OPD Queuing, Nurse Triage, NEWS2 Vitals & Clinical Encounters", () => {
    let developerToken = null;
    let hospitalId = null;
    let testPatient1 = null;
    let testPatient2 = null;
    let routineEncounter = null;
    let routineTicket = null;
    let emergencyEncounter = null;
    let emergencyTicket = null;

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

        // Register two test patients via API
        const uniqueTs = Date.now();
        const p1Res = await request(app)
            .post("/api/v1/patients/register")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                hospitalId,
                firstName: "Kwame",
                lastName: `Mensah_${uniqueTs}`,
                dateOfBirth: "1988-04-12",
                gender: "MALE",
                phone: `+23324${Math.floor(1000000 + Math.random() * 9000000)}`,
                bloodGroup: "O_POSITIVE",
                genotype: "AA"
            });
        expect(p1Res.status).toBe(201);
        testPatient1 = p1Res.body.data.patient;

        const p2Res = await request(app)
            .post("/api/v1/patients/register")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                hospitalId,
                firstName: "Ama",
                lastName: `Boateng_${uniqueTs}`,
                dateOfBirth: "1995-11-23",
                gender: "FEMALE",
                phone: `+23324${Math.floor(1000000 + Math.random() * 9000000)}`,
                bloodGroup: "A_POSITIVE",
                genotype: "AS"
            });
        expect(p2Res.status).toBe(201);
        testPatient2 = p2Res.body.data.patient;
    });

    // 1. OPD Routine Patient Check-in & Queue Token Generation
    test("POST /api/v1/clinical/opd/check-in - Routine check-in generates OPD-xxx token and opens encounter", async () => {
        const res = await request(app)
            .post("/api/v1/clinical/opd/check-in")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                hospitalId,
                patientId: testPatient1.id,
                department: "GENERAL_OPD",
                priority: "ROUTINE",
                chiefComplaint: "General checkup and mild headaches for 3 days"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.ticket.ticketNumber).toMatch(/^OPD-\d{3}$/);
        expect(res.body.data.encounter.encounterNumber).toMatch(/^ENC-\d{4}-\d{6}$/);
        expect(res.body.data.encounter.status).toBe("WAITING_TRIAGE");
        expect(res.body.data.encounter.triageStatus).toBe("PENDING");
        expect(res.body.data.encounter.priority).toBe("ROUTINE");
        expect(res.body.data.patient.mrn).toBe(testPatient1.patientNumber);
        expect(res.body.data.patient.shelfLocation).toBeDefined();

        routineEncounter = res.body.data.encounter;
        routineTicket = res.body.data.ticket;
    });

    // 2. OPD Emergency Patient Check-in
    test("POST /api/v1/clinical/opd/check-in - Emergency check-in generates EMG-xxx token with elevated triage risk", async () => {
        const res = await request(app)
            .post("/api/v1/clinical/opd/check-in")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                hospitalId,
                patientId: testPatient2.id,
                department: "EMERGENCY_OPD",
                priority: "EMERGENCY",
                chiefComplaint: "Severe acute chest pain and shortness of breath"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.ticket.ticketNumber).toMatch(/^EMG-\d{3}$/);
        expect(res.body.data.encounter.priority).toBe("EMERGENCY");
        expect(res.body.data.encounter.triageRiskLevel).toBe("HIGH");

        emergencyEncounter = res.body.data.encounter;
        emergencyTicket = res.body.data.ticket;
    });

    // 3. Nurse Triage Queue Priority Ordering
    test("GET /api/v1/clinical/triage/queue - Returns queue sorted with EMERGENCY ahead of ROUTINE", async () => {
        const res = await request(app)
            .get(`/api/v1/clinical/triage/queue?hospitalId=${hospitalId}`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(2);

        // First item in queue MUST be EMERGENCY
        const first = res.body.data[0];
        expect(first.priority).toBe("EMERGENCY");
        expect(first.ticketNumber).toMatch(/^EMG-/);
        expect(first.patient.mrn).toBeDefined();
        expect(first.patient.shelfLocation).toBeDefined();
        expect(first.waitTimeMinutes).toBeGreaterThanOrEqual(0);
    });

    // 4. Nurse Records Normal Vital Signs with BMI and NEWS2 Calculation
    test("POST /api/v1/clinical/triage/:id/vitals - Records normal vitals, computes BMI and NEWS2 score = 0", async () => {
        const res = await request(app)
            .post(`/api/v1/clinical/triage/${routineEncounter.id}/vitals`)
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                temperature: 36.8,
                pulseRate: 72,
                respiratoryRate: 16,
                systolicBP: 120,
                diastolicBP: 80,
                oxygenSaturation: 98,
                weight: 70,
                height: 175,
                bloodGlucose: 5.4,
                painScore: 2,
                consciousness: "ALERT",
                triageNotes: "Patient ambulatory, alert and oriented. Normal vital signs."
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.vitalSigns.bmi).toBe(22.9);
        expect(res.body.data.vitalSigns.bmiCategory).toBe("NORMAL");
        expect(res.body.data.news2.news2Score).toBe(0);
        expect(res.body.data.news2.riskCategory).toBe("ROUTINE");
        expect(res.body.data.encounter.triageStatus).toBe("COMPLETED");
        expect(res.body.data.encounter.status).toBe("WAITING_DOCTOR");
        expect(res.body.data.ticket.status).toBe("WAITING_DOCTOR");
    });

    // 5. Nurse Records Critical Vital Signs with NEWS2 Calculation & Emergency Escalation
    test("POST /api/v1/clinical/triage/:id/vitals - Critical vitals trigger high NEWS2 score and emergency escalation", async () => {
        const res = await request(app)
            .post(`/api/v1/clinical/triage/${emergencyEncounter.id}/vitals`)
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                temperature: 39.5,         // temp > 39.1 -> 2
                pulseRate: 135,            // pulse >= 131 -> 3
                respiratoryRate: 28,       // rr >= 25 -> 3
                systolicBP: 85,            // sbp <= 90 -> 3
                diastolicBP: 55,
                oxygenSaturation: 89,      // spo2 <= 91 -> 3
                weight: 65,
                height: 162,
                bloodGlucose: 14.2,
                painScore: 8,
                consciousness: "VOICE",    // non-alert -> 3
                triageNotes: "Patient diaphoresis, tachypneic and hypotensive. Critical acute distress."
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        // Total NEWS2 score = 2 + 3 + 3 + 3 + 3 + 3 = 17
        expect(res.body.data.news2.news2Score).toBe(17);
        expect(res.body.data.news2.riskCategory).toBe("CRITICAL");
        expect(res.body.data.news2.triggersImmediateEscalation).toBe(true);
        expect(res.body.data.encounter.priority).toBe("EMERGENCY");
        expect(res.body.data.encounter.triageRiskLevel).toBe("CRITICAL");
        expect(res.body.data.encounter.status).toBe("WAITING_DOCTOR");
    });

    // 6. Assign Doctor and Consulting Room to Encounter
    test("POST /api/v1/clinical/encounters/:id/assign-doctor - Assigns consulting room and doctor to encounter", async () => {
        const res = await request(app)
            .post(`/api/v1/clinical/encounters/${routineEncounter.id}/assign-doctor`)
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                doctorId: "DOC-001",
                doctorName: "Dr. Kwesi Appiah",
                room: "Consulting Room 2"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("ASSIGNED_DOCTOR");
        expect(res.body.data.assignedRoom).toBe("Consulting Room 2");
        expect(res.body.data.assignedDoctorName).toBe("Dr. Kwesi Appiah");
    });

    // 7. Doctor Calls Patient into Consulting Room
    test("POST /api/v1/clinical/encounters/:id/call-in - Transitions encounter to IN_CONSULTATION", async () => {
        const res = await request(app)
            .post(`/api/v1/clinical/encounters/${routineEncounter.id}/call-in`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("IN_CONSULTATION");
        expect(res.body.data.consultationStartedAt).toBeDefined();

        // Verify ticket also updated
        const ticket = await prisma.opdQueueTicket.findUnique({
            where: { id: routineTicket.id }
        });
        expect(ticket.status).toBe("IN_CONSULTATION");
        expect(ticket.calledAt).toBeDefined();
    });

    // 8. Doctor Consultation Queue Retrieval
    test("GET /api/v1/clinical/doctor/queue - Returns waiting patients prioritized by emergency and NEWS2 risk", async () => {
        const res = await request(app)
            .get(`/api/v1/clinical/doctor/queue?hospitalId=${hospitalId}`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);

        // First patient in doctor queue must have EMERGENCY priority or CRITICAL risk
        const first = res.body.data[0];
        expect(first.priority).toBe("EMERGENCY");
        expect(["CRITICAL", "HIGH"]).toContain(first.triageRiskLevel);

        // Find the specific emergency patient encounter created in this test run
        const target = res.body.data.find(enc => enc.encounterId === emergencyEncounter.id);
        expect(target).toBeDefined();
        expect(target.priority).toBe("EMERGENCY");
        expect(target.triageRiskLevel).toBe("CRITICAL");
        expect(target.latestVitals).toBeDefined();
        expect(target.latestVitals.news2Score).toBe(17);
        expect(target.patient.mrn).toBe(testPatient2.patientNumber);
    });

    // 9. Complete Doctor Consultation
    test("POST /api/v1/clinical/encounters/:id/complete - Completes consultation and updates queue ticket", async () => {
        const res = await request(app)
            .post(`/api/v1/clinical/encounters/${routineEncounter.id}/complete`)
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                notes: "Consultation finished. Prescribed Paracetamol 500mg TDS for 3 days. Patient discharged home."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("COMPLETED");
        expect(res.body.data.consultationCompletedAt).toBeDefined();

        // Verify ticket is COMPLETED
        const ticket = await prisma.opdQueueTicket.findUnique({
            where: { id: routineTicket.id }
        });
        expect(ticket.status).toBe("COMPLETED");
        expect(ticket.completedAt).toBeDefined();
    });

    // 10. Nurse Dashboard Telemetry & Clinical Statistics
    test("GET /api/v1/clinical/nurse/dashboard - Live real-time statistics for OPD and triage department", async () => {
        const res = await request(app)
            .get(`/api/v1/clinical/nurse/dashboard?hospitalId=${hospitalId}`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.telemetry.totalCheckedInToday).toBeGreaterThanOrEqual(2);
        expect(res.body.data.telemetry.completedToday).toBeGreaterThanOrEqual(1);
        expect(res.body.data.telemetry.criticalAlertsCount).toBeGreaterThanOrEqual(1);
        expect(res.body.data.recentVitals.length).toBeGreaterThanOrEqual(2);

        const recent = res.body.data.recentVitals;
        const criticalEntry = recent.find(v => v.news2Score === 17);
        expect(criticalEntry).toBeDefined();
        expect(criticalEntry.riskCategory).toBe("CRITICAL");
    });

    // 11. Single Clinical Encounter Details Lookup
    test("GET /api/v1/clinical/encounters/:id - Returns full encounter breakdown with patient and vitals", async () => {
        const res = await request(app)
            .get(`/api/v1/clinical/encounters/${routineEncounter.id}`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(routineEncounter.id);
        expect(res.body.data.patient.patientNumber).toBe(testPatient1.patientNumber);
        expect(res.body.data.vitalSigns.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data.queueTicket.ticketNumber).toBe(routineTicket.ticketNumber);
    });

    // 12. Security & RBAC Enforcement on Clinical Endpoints
    test("POST /api/v1/clinical/opd/check-in - Rejects unauthenticated request with 401", async () => {
        const res = await request(app)
            .post("/api/v1/clinical/opd/check-in")
            .send({
                hospitalId,
                patientId: testPatient1.id
            });

        expect(res.status).toBe(401);
    });
});
