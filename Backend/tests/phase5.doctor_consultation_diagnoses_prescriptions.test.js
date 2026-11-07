"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 5 / PROCEDURE 5 INTEGRATION TEST SUITE
Doctor Clinical Consultation, ICD-10 Diagnoses,
Electronic Prescriptions, Lab Investigations & Doctor Dashboard
LOCATION: tests/phase5.doctor_consultation_diagnoses_prescriptions.test.js
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 5 / Procedure 5: Doctor Consultation, ICD-10 Diagnosis, Prescriptions & Lab Requests", () => {
    let developerToken = null;
    let hospitalId = null;
    let testPatient = null;
    let encounter = null;
    let ticket = null;

    beforeAll(async () => {
        // Authenticate as Developer (has full physician authority)
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

        // Register a test patient
        const uniqueTs = Date.now();
        const patientRes = await request(app)
            .post("/api/v1/patients/register")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                hospitalId,
                firstName: "Kofi",
                lastName: `Adjei_${uniqueTs}`,
                dateOfBirth: "1990-08-14",
                gender: "MALE",
                phone: `+23324${Math.floor(1000000 + Math.random() * 9000000)}`,
                bloodGroup: "B_POSITIVE",
                genotype: "AA"
            });
        expect(patientRes.status).toBe(201);
        testPatient = patientRes.body.data.patient;

        // OPD Check-in
        const checkinRes = await request(app)
            .post("/api/v1/clinical/opd/check-in")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                hospitalId,
                patientId: testPatient.id,
                department: "GENERAL_OPD",
                priority: "PRIORITY",
                chiefComplaint: "High fevers, severe headache, chills and vomiting for 2 days"
            });
        expect(checkinRes.status).toBe(201);
        encounter = checkinRes.body.data.encounter;
        ticket = checkinRes.body.data.ticket;

        // Record Nurse Triage Vitals
        const vitalsRes = await request(app)
            .post(`/api/v1/clinical/triage/${encounter.id}/vitals`)
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                temperature: 38.9,
                pulseRate: 104,
                respiratoryRate: 20,
                systolicBP: 118,
                diastolicBP: 76,
                oxygenSaturation: 97,
                weight: 72,
                height: 178,
                bloodGlucose: 5.8,
                consciousness: "ALERT",
                triageNotes: "Patient febrile, flushed, and experiencing chills."
            });
        expect(vitalsRes.status).toBe(201);

        // Doctor assigns room and calls patient in
        const callinRes = await request(app)
            .post(`/api/v1/clinical/encounters/${encounter.id}/call-in`)
            .set("Authorization", `Bearer ${developerToken}`);
        expect(callinRes.status).toBe(200);
    });

    // 1. Search ICD-10 Clinical Diagnostic Catalog
    test("GET /api/v1/clinical/catalog/diagnoses - Search catalog for Malaria and Hypertension", async () => {
        const res = await request(app)
            .get("/api/v1/clinical/catalog/diagnoses?query=malaria")
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBeGreaterThanOrEqual(1);

        const malariaItem = res.body.data.find(d => d.code === "B50.9");
        expect(malariaItem).toBeDefined();
        expect(malariaItem.name).toContain("Plasmodium falciparum");
        expect(malariaItem.category).toBe("Infectious & Parasitic");
    });

    // 2. Search Clinical Medications Formulary
    test("GET /api/v1/clinical/catalog/medications - Search formulary for Coartem and Paracetamol", async () => {
        const res = await request(app)
            .get("/api/v1/clinical/catalog/medications?query=coartem")
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBeGreaterThanOrEqual(1);

        const coartem = res.body.data[0];
        expect(coartem.name).toContain("Artemether");
        expect(coartem.dosage).toBe("20mg / 120mg");
        expect(coartem.frequency).toBe("BD");
        expect(coartem.category).toBe("Antimalarials");
    });

    // 3. Search Laboratory Investigations Catalog
    test("GET /api/v1/clinical/catalog/lab-tests - Search catalog for Full Blood Count and Malaria tests", async () => {
        const res = await request(app)
            .get("/api/v1/clinical/catalog/lab-tests?query=fbc")
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBeGreaterThanOrEqual(1);

        const fbc = res.body.data[0];
        expect(fbc.testCode).toBe("LAB-FBC");
        expect(fbc.testName).toContain("Full Blood Count");
        expect(fbc.department).toBe("Hematology");
    });

    // 4. Record Doctor Clinical Consultation with ICD-10 Diagnoses, Prescriptions & Lab Requests
    test("POST /api/v1/clinical/encounters/:id/consultation - Records SOAP note, ICD-10 diagnoses, e-prescriptions and lab requests", async () => {
        const res = await request(app)
            .post(`/api/v1/clinical/encounters/${encounter.id}/consultation`)
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                consultationType: "INITIAL",
                history: "Patient presents with a 2-day history of intermittent high-grade fever, severe rigors, generalized body aches, bitter taste in mouth, and persistent nausea. No cough, chest pain, or dysuria.",
                examination: "General: Ill-looking young male, conscious, alert, febrile to touch (38.9°C), not pale, anicteric, hydrated. CVS: S1S2 present, pulse 104 bpm regular. RS: Vesicular breath sounds bilaterally. Abdomen: Soft, mild epigastric tenderness, no hepatosplenomegaly.",
                assessment: "Acute uncomplicated Plasmodium falciparum malaria with acute gastritis.",
                plan: "Initiate oral Artemisinin-based Combination Therapy (ACT), prescribe antipyretics, administer oral H2-receptor/PPI therapy, request urgent Malaria microscopy and Full Blood Count.",
                diagnoses: [
                    {
                        diagnosisCode: "B50.9",
                        diagnosisType: "PRIMARY",
                        notes: "Confirmed clinically with classic paroxysms."
                    },
                    {
                        diagnosisCode: "K29.7",
                        diagnosisName: "Gastritis, unspecified",
                        diagnosisType: "SECONDARY",
                        notes: "Secondary to antimalarial ingestion and fever."
                    }
                ],
                prescriptions: [
                    {
                        medicationName: "Artemether / Lumefantrine (Coartem)",
                        dosage: "20mg / 120mg",
                        frequency: "BD",
                        duration: "3 days",
                        instructions: "Take 4 tablets stat, 4 tablets at 8 hours, then 4 tablets twice daily with meals."
                    },
                    {
                        medicationName: "Paracetamol",
                        dosage: "1000mg",
                        frequency: "TDS",
                        duration: "3 days",
                        instructions: "Take 2 tablets every 8 hours for fever."
                    },
                    {
                        medicationName: "Omeprazole",
                        dosage: "20mg",
                        frequency: "OD",
                        duration: "14 days",
                        instructions: "Take 1 capsule in the morning before breakfast."
                    }
                ],
                laboratoryRequests: [
                    {
                        testCode: "LAB-MAL-MIC",
                        testName: "Malaria Parasite (MP) Microscopy & Density"
                    },
                    {
                        testCode: "LAB-FBC",
                        testName: "Full Blood Count (FBC / CBC)"
                    }
                ]
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);

        const data = res.body.data;
        expect(data.consultation.id).toBeDefined();
        expect(data.consultation.consultationType).toBe("INITIAL");
        expect(data.consultation.assessment).toContain("Plasmodium falciparum");

        // Verify Diagnoses
        expect(data.diagnoses.length).toBe(2);
        const primaryDiag = data.diagnoses.find(d => d.diagnosisCode === "B50.9");
        expect(primaryDiag).toBeDefined();
        expect(primaryDiag.diagnosisName).toContain("Plasmodium falciparum malaria");
        expect(primaryDiag.diagnosisType).toBe("PRIMARY");

        // Verify Prescriptions
        expect(data.prescriptions.length).toBe(3);
        const coartemRx = data.prescriptions.find(p => p.medicationName.includes("Artemether"));
        expect(coartemRx).toBeDefined();
        expect(coartemRx.status).toBe("PENDING");
        expect(coartemRx.frequency).toBe("BD");

        // Verify Lab Requests
        expect(data.laboratoryRequests.length).toBe(2);
        const mpLab = data.laboratoryRequests.find(l => l.testCode === "LAB-MAL-MIC");
        expect(mpLab).toBeDefined();
        expect(mpLab.status).toBe("REQUESTED");
    });

    // 5. Retrieve Full Consultation Details by Encounter ID
    test("GET /api/v1/clinical/encounters/:id/consultation - Returns complete consultation dossier", async () => {
        const res = await request(app)
            .get(`/api/v1/clinical/encounters/${encounter.id}/consultation`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.encounterId).toBe(encounter.id);
        expect(res.body.data.patient.patientNumber).toBe(testPatient.patientNumber);
        expect(res.body.data.consultations.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data.diagnoses.length).toBe(2);
        expect(res.body.data.prescriptions.length).toBe(3);
        expect(res.body.data.laboratoryRequests.length).toBe(2);
        expect(res.body.data.latestVitals.temperature).toBe(38.9);
    });

    // 6. Longitudinal Patient Clinical History
    test("GET /api/v1/clinical/patients/:patientId/clinical-history - Returns complete patient medical record", async () => {
        const res = await request(app)
            .get(`/api/v1/clinical/patients/${testPatient.id}/clinical-history`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.patient.id).toBe(testPatient.id);
        expect(res.body.data.totalEncounters).toBeGreaterThanOrEqual(1);

        const targetEnc = res.body.data.encounters.find(e => e.encounterId === encounter.id);
        expect(targetEnc).toBeDefined();
        expect(targetEnc.diagnoses.length).toBe(2);
        expect(targetEnc.prescriptions.length).toBe(3);
        expect(targetEnc.laboratoryRequests.length).toBe(2);
        expect(targetEnc.latestVitals).toBeDefined();
    });

    // 7. Complete Consultation Workflow
    test("POST /api/v1/clinical/encounters/:id/complete - Marks consultation and ticket as COMPLETED", async () => {
        const res = await request(app)
            .post(`/api/v1/clinical/encounters/${encounter.id}/complete`)
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                notes: "Consultation finalized. Patient instructed on drug adherence and hydration. Return immediately if high fever persists or dark urine occurs."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("COMPLETED");
        expect(res.body.data.consultationCompletedAt).toBeDefined();

        // Verify ticket in DB
        const ticketInDb = await prisma.opdQueueTicket.findUnique({
            where: { id: ticket.id }
        });
        expect(ticketInDb.status).toBe("COMPLETED");
        expect(ticketInDb.completedAt).toBeDefined();
    });

    // 8. Doctor Role Real-Life Dashboard Telemetry & Visual Metadata
    test("GET /api/v1/clinical/doctor/dashboard - Returns live PostgreSQL metrics and authentic doctor imagery", async () => {
        const res = await request(app)
            .get(`/api/v1/clinical/doctor/dashboard?hospitalId=${hospitalId}`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const telemetry = res.body.data.telemetry;
        expect(telemetry.consultationsCompletedToday).toBeGreaterThanOrEqual(1);
        expect(telemetry.activePrescriptionsCount).toBeGreaterThanOrEqual(3);
        expect(telemetry.pendingLabResultsCount).toBeGreaterThanOrEqual(2);

        // Verify recent consultations contains our patient
        const recent = res.body.data.recentConsultations;
        expect(recent.length).toBeGreaterThanOrEqual(1);
        const match = recent.find(c => c.patientMrn === testPatient.patientNumber);
        expect(match).toBeDefined();
        expect(match.primaryDiagnosis).toContain("Plasmodium falciparum");

        // Verify authentic doctor role visual theme
        const theme = res.body.data.dashboardRoleTheme;
        expect(theme.role).toBe("DOCTOR");
        expect(theme.bannerImageUrl).toContain("doctor_clinical_hero.jpg");
        expect(theme.avatarBadgeUrl).toContain("stethoscope_badge.png");
        expect(theme.themeColor).toBe("#0284C7");
    });

    // 9. Security Enforcement - Reject unauthenticated access
    test("POST /api/v1/clinical/encounters/:id/consultation - Rejects unauthenticated request with 401", async () => {
        const res = await request(app)
            .post(`/api/v1/clinical/encounters/${encounter.id}/consultation`)
            .send({
                consultationType: "INITIAL",
                assessment: "Unauthorized consultation attempt"
            });

        expect(res.status).toBe(401);
    });
});
