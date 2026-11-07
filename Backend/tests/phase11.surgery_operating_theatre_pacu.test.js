"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 11 INTEGRATION TEST SUITE: SURGERY, OPERATING THEATRE & PACU
Zero Fake/Mock Data - Real PostgreSQL 16 Persistence
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 11: Operating Theatre, Surgical Scheduling, Anesthesia & Perioperative Subsystem", () => {
    let devToken;
    let surgeonToken;
    let surgeonUser;
    let nurseToken;
    let receptionistToken;
    let testHospital;
    let electivePatient;
    let emergencyPatient;
    let electiveEncounter;
    let emergencyEncounter;
    let primaryTheatreId;
    let electiveCaseId;
    let electiveCaseNumber;
    let emergencyCaseId;
    let emergencyCaseNumber;

    const uniqueId = Date.now();
    const surgeonEmail = `surgeon_${uniqueId}@gbs.com`;
    const nurseEmail = `otnurse_${uniqueId}@gbs.com`;
    const receptionistEmail = `reception_ot_${uniqueId}@gbs.com`;

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
                    name: "GBS Surgical Centre of Excellence",
                    code: "GBS-OT-01",
                    email: "surgery@gbshospital.com",
                    phone: "+233200000005",
                    address: "Surgical Pavilion, Ring Road, Accra",
                    city: "Accra",
                    region: "Greater Accra",
                    country: "Ghana"
                }
            });
        }
        expect(testHospital).toBeDefined();

        // 3. Create and approve Surgeon user
        const surgeonSignup = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                email: surgeonEmail,
                password: "Password123!",
                firstName: "Dr. Kwesi",
                lastName: "Appiah-Surgeon",
                role: "SURGEON"
            });
        expect(surgeonSignup.status).toBe(201);
        const surgeonId = surgeonSignup.body.data.id;

        const approveSurgeon = await request(app)
            .patch(`/api/v1/users/${surgeonId}/approve`)
            .set("Authorization", `Bearer ${devToken}`);
        expect(approveSurgeon.status).toBe(200);

        const surgeonLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: surgeonEmail,
                password: "Password123!"
            });
        expect(surgeonLogin.status).toBe(200);
        surgeonToken = surgeonLogin.body.data.token;
        surgeonUser = surgeonLogin.body.data.user;

        // 4. Create and approve OT Nurse user
        const nurseSignup = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                email: nurseEmail,
                password: "Password123!",
                firstName: "Sister Joyce",
                lastName: "Mensah-PACU",
                role: "NURSE"
            });
        expect(nurseSignup.status).toBe(201);
        const nurseId = nurseSignup.body.data.id;

        const approveNurse = await request(app)
            .patch(`/api/v1/users/${nurseId}/approve`)
            .set("Authorization", `Bearer ${devToken}`);
        expect(approveNurse.status).toBe(200);

        const nurseLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: nurseEmail,
                password: "Password123!"
            });
        expect(nurseLogin.status).toBe(200);
        nurseToken = nurseLogin.body.data.token;

        // 5. Create and approve Receptionist user (for RBAC testing)
        const recSignup = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                email: receptionistEmail,
                password: "Password123!",
                firstName: "Adwoa",
                lastName: "Receptionist",
                role: "RECEPTIONIST"
            });
        expect(recSignup.status).toBe(201);
        const recId = recSignup.body.data.id;

        await request(app)
            .patch(`/api/v1/users/${recId}/approve`)
            .set("Authorization", `Bearer ${devToken}`);

        const recLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: receptionistEmail,
                password: "Password123!"
            });
        expect(recLogin.status).toBe(200);
        receptionistToken = recLogin.body.data.token;

        // 6. Create Elective surgical patient & encounter
        const electiveMrn = `MRN-OT-E-${uniqueId}`;
        electivePatient = await prisma.patient.create({
            data: {
                hospitalId: testHospital.id,
                patientNumber: electiveMrn,
                firstName: "Kweku",
                lastName: "Baah-Appendicitis",
                dateOfBirth: new Date("1992-04-12"),
                gender: "MALE",
                phone: `+23324${String(uniqueId).slice(-7)}`
            }
        });

        electiveEncounter = await prisma.patientEncounter.create({
            data: {
                hospitalId: testHospital.id,
                patientId: electivePatient.id,
                encounterNumber: `ENC-OT-E-${uniqueId}`,
                encounterType: "INPATIENT",
                status: "OPEN",
                chiefComplaint: "Acute lower right quadrant pain"
            }
        });

        // 7. Create Emergency STAT surgical patient & encounter
        const emergencyMrn = `MRN-OT-S-${uniqueId}`;
        emergencyPatient = await prisma.patient.create({
            data: {
                hospitalId: testHospital.id,
                patientNumber: emergencyMrn,
                firstName: "Akua",
                lastName: "Donkor-Maternity",
                dateOfBirth: new Date("1996-08-20"),
                gender: "FEMALE",
                phone: `+23320${String(uniqueId).slice(-7)}`,
                nhisNumber: `NHIS-GH-778899-${uniqueId}`
            }
        });

        emergencyEncounter = await prisma.patientEncounter.create({
            data: {
                hospitalId: testHospital.id,
                patientId: emergencyPatient.id,
                encounterNumber: `ENC-OT-S-${uniqueId}`,
                encounterType: "EMERGENCY",
                status: "OPEN",
                chiefComplaint: "Obstructed labor, fetal distress"
            }
        });
    });

    afterAll(async () => {
        // Cleanup test cases and records
        try {
            await prisma.pacuRecord.deleteMany({
                where: { surgicalCase: { patientId: { in: [electivePatient.id, emergencyPatient.id] } } }
            });
            await prisma.anesthesiaRecord.deleteMany({
                where: { surgicalCase: { patientId: { in: [electivePatient.id, emergencyPatient.id] } } }
            });
            await prisma.surgicalChecklist.deleteMany({
                where: { surgicalCase: { patientId: { in: [electivePatient.id, emergencyPatient.id] } } }
            });
            await prisma.surgicalCase.deleteMany({
                where: { patientId: { in: [electivePatient.id, emergencyPatient.id] } }
            });
            await prisma.patientEncounter.deleteMany({
                where: { id: { in: [electiveEncounter.id, emergencyEncounter.id] } }
            });
            await prisma.patient.deleteMany({
                where: { id: { in: [electivePatient.id, emergencyPatient.id] } }
            });
        } catch {
            // Ignore cascade cleanup warnings
        }
    });

    // ----------------------------------------------------
    // TEST 1: Seed Operating Theatres & Surgical Catalog
    // ----------------------------------------------------
    test("1. Seed standard operating theatre suites and surgical catalog items", async () => {
        const theatreSeedRes = await request(app)
            .post("/api/v1/surgery/theatres/seed")
            .set("Authorization", `Bearer ${devToken}`);
        expect(theatreSeedRes.status).toBe(201);
        expect(theatreSeedRes.body.success).toBe(true);
        expect(theatreSeedRes.body.data.length).toBeGreaterThanOrEqual(3);

        const catalogSeedRes = await request(app)
            .post("/api/v1/surgery/catalog/seed")
            .set("Authorization", `Bearer ${devToken}`);
        expect(catalogSeedRes.status).toBe(201);
        expect(catalogSeedRes.body.success).toBe(true);
        expect(catalogSeedRes.body.data.length).toBeGreaterThanOrEqual(6);

        // Store primary operating theatre ID for upcoming tests
        const mainOT = await prisma.operatingTheatre.findUnique({
            where: { code: "OT-01" }
        });
        expect(mainOT).toBeDefined();
        primaryTheatreId = mainOT.id;
    });

    // ----------------------------------------------------
    // TEST 2: Retrieve Active Operating Theatres & Catalog
    // ----------------------------------------------------
    test("2. Retrieve operating theatre suites and standard surgical procedure catalog", async () => {
        const theatreRes = await request(app)
            .get("/api/v1/surgery/theatres")
            .set("Authorization", `Bearer ${surgeonToken}`);
        expect(theatreRes.status).toBe(200);
        expect(theatreRes.body.success).toBe(true);
        expect(Array.isArray(theatreRes.body.data)).toBe(true);
        expect(theatreRes.body.data.some(t => t.code === "OT-01")).toBe(true);

        const catalogRes = await request(app)
            .get("/api/v1/surgery/catalog")
            .set("Authorization", `Bearer ${surgeonToken}`);
        expect(catalogRes.status).toBe(200);
        expect(catalogRes.body.success).toBe(true);
        expect(Array.isArray(catalogRes.body.data)).toBe(true);
        expect(catalogRes.body.data.some(c => c.code === "SURG-APP-01")).toBe(true);
    });

    // ----------------------------------------------------
    // TEST 3: Book Elective Surgical Case
    // ----------------------------------------------------
    test("3. Book an elective surgical procedure with team assignments and pre-op requirements", async () => {
        const res = await request(app)
            .post("/api/v1/surgery/cases")
            .set("Authorization", `Bearer ${surgeonToken}`)
            .send({
                encounterId: electiveEncounter.id,
                theatreId: primaryTheatreId,
                procedureCode: "SURG-APP-01",
                priority: "ELECTIVE",
                preOpDiagnosis: "Acute appendicitis with localized peritonitis",
                informedConsentSigned: true,
                npoStatus: "Fasting since 22:00 last night (NPO 8 hours)",
                bloodProductsReserved: "2 units packed RBC cross-matched at Blood Bank",
                leadSurgeonName: "Dr. Kwesi Appiah-Surgeon",
                assistantSurgeonName: "Dr. Ama Boateng",
                anesthesiologistName: "Dr. Eric Osei-Anesthetist",
                scrubNurseName: "Sister Joyce Mensah",
                circulatingNurseName: "Nurse Mensah Kwame"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.caseNumber).toMatch(/^SURG-\d{4}-\d{6}$/);
        expect(res.body.data.procedureName).toBe("Open / Laparoscopic Appendectomy");
        expect(res.body.data.priority).toBe("ELECTIVE");
        expect(res.body.data.status).toBe("BOOKED");
        expect(res.body.data.informedConsentSigned).toBe(true);
        expect(res.body.data.checklist).toBeDefined();
        expect(res.body.data.checklist.signInCompleted).toBe(false);

        electiveCaseId = res.body.data.id;
        electiveCaseNumber = res.body.data.caseNumber;
    });

    // ----------------------------------------------------
    // TEST 4: Book Emergency STAT Surgical Case
    // ----------------------------------------------------
    test("4. Book an Emergency STAT surgical procedure with immediate priority flag", async () => {
        const res = await request(app)
            .post("/api/v1/surgery/cases")
            .set("Authorization", `Bearer ${surgeonToken}`)
            .send({
                encounterId: emergencyEncounter.id,
                procedureCode: "SURG-CS-01",
                priority: "EMERGENCY_STAT",
                preOpDiagnosis: "Obstructed Labour with Fetal Bradycardia (STAT C-Section)",
                informedConsentSigned: true,
                npoStatus: "Emergency NPO protocol / Rapid sequence induction",
                bloodProductsReserved: "4 units O-negative blood requested STAT",
                leadSurgeonName: "Dr. Kwesi Appiah-Surgeon",
                anesthesiologistName: "Dr. Eric Osei-Anesthetist"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.caseNumber).toMatch(/^SURG-\d{4}-\d{6}$/);
        expect(res.body.data.priority).toBe("EMERGENCY_STAT");
        expect(res.body.data.procedureCategory).toBe("OBSTETRICS_GYNAECOLOGY");

        emergencyCaseId = res.body.data.id;
        emergencyCaseNumber = res.body.data.caseNumber;
    });

    // ----------------------------------------------------
    // TEST 5: Validation Guards - Missing Clinical Encounter or Procedure Name
    // ----------------------------------------------------
    test("5. Validation Guards: reject case booking missing encounter ID or procedure information", async () => {
        const missingEncounterRes = await request(app)
            .post("/api/v1/surgery/cases")
            .set("Authorization", `Bearer ${surgeonToken}`)
            .send({
                procedureCode: "SURG-APP-01"
            });
        expect(missingEncounterRes.status).toBe(400);
        const errorMsg1 = missingEncounterRes.body.error?.message || missingEncounterRes.body.message || JSON.stringify(missingEncounterRes.body);
        expect(errorMsg1).toContain("Encounter ID is required");

        const missingProcRes = await request(app)
            .post("/api/v1/surgery/cases")
            .set("Authorization", `Bearer ${surgeonToken}`)
            .send({
                encounterId: electiveEncounter.id
            });
        expect(missingProcRes.status).toBe(400);
        const errorMsg2 = missingProcRes.body.error?.message || missingProcRes.body.message || JSON.stringify(missingProcRes.body);
        expect(errorMsg2).toContain("procedure name is required");
    });

    // ----------------------------------------------------
    // TEST 6: Priority-Ranked Surgical Worklist Querying
    // ----------------------------------------------------
    test("6. Retrieve surgical cases worklist verifying EMERGENCY_STAT cases take top clinical precedence", async () => {
        const res = await request(app)
            .get("/api/v1/surgery/cases")
            .set("Authorization", `Bearer ${surgeonToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(2);

        // Find positions of emergency vs elective in the returned list
        const emergencyIndex = res.body.data.findIndex(c => c.id === emergencyCaseId);
        const electiveIndex = res.body.data.findIndex(c => c.id === electiveCaseId);

        expect(emergencyIndex).toBeGreaterThanOrEqual(0);
        expect(electiveIndex).toBeGreaterThanOrEqual(0);
        // Emergency STAT case must appear before elective case
        expect(emergencyIndex).toBeLessThan(electiveIndex);
    });

    // ----------------------------------------------------
    // TEST 7: Retrieve Surgical Case Dossier by ID & Case Number
    // ----------------------------------------------------
    test("7. Fetch single surgical case dossier by ID and caseNumber with full relational data", async () => {
        const byIdRes = await request(app)
            .get(`/api/v1/surgery/cases/${electiveCaseId}`)
            .set("Authorization", `Bearer ${surgeonToken}`);
        expect(byIdRes.status).toBe(200);
        expect(byIdRes.body.data.id).toBe(electiveCaseId);
        expect(byIdRes.body.data.encounter.patient.patientNumber).toBe(electivePatient.patientNumber);

        const byNumberRes = await request(app)
            .get(`/api/v1/surgery/cases/${electiveCaseNumber}`)
            .set("Authorization", `Bearer ${surgeonToken}`);
        expect(byNumberRes.status).toBe(200);
        expect(byNumberRes.body.data.id).toBe(electiveCaseId);
    });

    // ----------------------------------------------------
    // TEST 8: Execute WHO Surgical Safety Checklist (Sign-In, Time-Out, Sign-Out)
    // ----------------------------------------------------
    test("8. Complete the full 3-phase WHO Surgical Safety Checklist", async () => {
        // Phase 1: Sign In (Before Induction of Anesthesia)
        const signInRes = await request(app)
            .patch(`/api/v1/surgery/cases/${electiveCaseId}/checklist`)
            .set("Authorization", `Bearer ${nurseToken}`)
            .send({
                patientIdentityConfirmed: true,
                siteMarked: true,
                anesthesiaSafetyCheckComplete: true,
                pulseOximeterFunctioning: true,
                knownAllergyChecked: true,
                difficultAirwayAspirationRiskChecked: true,
                riskBloodLossChecked: true,
                signInCompleted: true
            });
        expect(signInRes.status).toBe(200);
        expect(signInRes.body.data.signInCompleted).toBe(true);
        expect(signInRes.body.data.timeOutCompleted).toBe(false);

        // Phase 2: Time Out (Before Skin Incision)
        const timeOutRes = await request(app)
            .patch(`/api/v1/surgery/cases/${electiveCaseId}/checklist`)
            .set("Authorization", `Bearer ${surgeonToken}`)
            .send({
                teamIntroductionsComplete: true,
                verbalConfirmationPatientSite: true,
                anticipatedCriticalEventsReviewed: true,
                antibioticProphylaxisGiven: true,
                essentialImagingDisplayed: true,
                timeOutCompleted: true
            });
        expect(timeOutRes.status).toBe(200);
        expect(timeOutRes.body.data.timeOutCompleted).toBe(true);
        expect(timeOutRes.body.data.signOutCompleted).toBe(false);

        // Phase 3: Sign Out (Before Patient Leaves Operating Room)
        const signOutRes = await request(app)
            .patch(`/api/v1/surgery/cases/${electiveCaseId}/checklist`)
            .set("Authorization", `Bearer ${nurseToken}`)
            .send({
                procedureConfirmedRecorded: true,
                instrumentNeedleSpongeCountCorrect: true,
                specimensLabelledAccurately: true,
                equipmentIssuesAddressed: true,
                keyConcernsRecoveryReviewed: true,
                signOutCompleted: true
            });
        expect(signOutRes.status).toBe(200);
        expect(signOutRes.body.data.signOutCompleted).toBe(true);
        expect(signOutRes.body.data.completedAt).toBeDefined();
    });

    // ----------------------------------------------------
    // TEST 9: Anesthesia Protocol Recording & Intra-Operative Monitoring
    // ----------------------------------------------------
    test("9. Record anesthesia protocol, ASA physical classification, and intra-op fluid balance", async () => {
        const res = await request(app)
            .post(`/api/v1/surgery/cases/${electiveCaseId}/anesthesia`)
            .set("Authorization", `Bearer ${surgeonToken}`)
            .send({
                anesthesiaType: "GENERAL_ENDOTRACHEAL",
                asaStatus: "ASA_II",
                airwayAssessment: "Mallampati Class I, full neck range of motion, thyromental distance > 6.5 cm",
                inductionTime: new Date(Date.now() - 3600000).toISOString(),
                intubationTime: new Date(Date.now() - 3300000).toISOString(),
                extubationTime: new Date(Date.now() - 600000).toISOString(),
                agentsAdministered: "Propofol 150mg, Fentanyl 100mcg, Rocuronium 50mg, Sevoflurane 2%",
                totalFluidsInfusedMl: 1200,
                totalBloodLossMl: 50,
                urineOutputMl: 250,
                notes: "Smooth induction and emergence. Hemodynamically stable throughout."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.anesthesiaType).toBe("GENERAL_ENDOTRACHEAL");
        expect(res.body.data.asaStatus).toBe("ASA_II");
        expect(res.body.data.totalFluidsInfusedMl).toBe(1200);
        expect(res.body.data.totalBloodLossMl).toBe(50);
    });

    // ----------------------------------------------------
    // TEST 10: Status Transition to SURGERY_IN_PROGRESS & Live Theatre Status
    // ----------------------------------------------------
    test("10. Transition surgical case to SURGERY_IN_PROGRESS and verify operating theatre room occupancy", async () => {
        const res = await request(app)
            .patch(`/api/v1/surgery/cases/${electiveCaseId}/status`)
            .set("Authorization", `Bearer ${surgeonToken}`)
            .send({
                status: "SURGERY_IN_PROGRESS",
                theatreId: primaryTheatreId
            });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("SURGERY_IN_PROGRESS");
        expect(res.body.data.startTime).toBeDefined();

        // Check that theatre room is marked OCCUPIED_IN_SURGERY
        const theatre = await prisma.operatingTheatre.findUnique({
            where: { id: primaryTheatreId }
        });
        expect(theatre.status).toBe("OCCUPIED_IN_SURGERY");
        expect(theatre.currentCaseId).toBe(electiveCaseId);
    });

    // ----------------------------------------------------
    // TEST 11: Surgeon Operative Note Documentation & PACU Transfer
    // ----------------------------------------------------
    test("11. Document surgeon operative report, operative findings, and transfer to PACU recovery", async () => {
        const res = await request(app)
            .post(`/api/v1/surgery/cases/${electiveCaseId}/operative-report`)
            .set("Authorization", `Bearer ${surgeonToken}`)
            .send({
                postOpDiagnosis: "Acute Suppurative Retrocecal Appendicitis",
                operativeFindings: "Inflamed, hyperemic retrocecal appendix with extensive purulent exudate. No frank perforation or abscess formation. Base of cecum was healthy.",
                operativeTechnique: "Gridiron incision at McBurney's point. Mesoappendix ligated with 2-0 Vicryl. Appendix base crushed, ligated, and stump invaginated using purse-string suture. Abdomen closed in layers.",
                estimatedBloodLossMl: 45,
                implantsUsed: "None",
                specimensRemoved: "Appendix sent to Histopathology laboratory"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("PACU_RECOVERY");
        expect(res.body.data.operativeFindings).toContain("Inflamed, hyperemic retrocecal appendix");
        expect(res.body.data.endTime).toBeDefined();

        // Verify theatre room transitioned to CLEANING
        const theatre = await prisma.operatingTheatre.findUnique({
            where: { id: primaryTheatreId }
        });
        expect(theatre.status).toBe("CLEANING");
    });

    // ----------------------------------------------------
    // TEST 12: PACU Modified Aldrete Recovery Scoring & Discharge Clearance
    // ----------------------------------------------------
    test("12. PACU recovery assessment: verify inadequate Aldrete score prevents discharge, and Aldrete >= 9 clears patient", async () => {
        // Step A: Inadequate recovery score (Total score = 5/10)
        const lowScoreRes = await request(app)
            .post(`/api/v1/surgery/cases/${electiveCaseId}/pacu`)
            .set("Authorization", `Bearer ${nurseToken}`)
            .send({
                aldreteActivity: 1,      // Moves 2 extremities
                aldreteRespiration: 1,   // Dyspnea / limited breathing
                aldreteCirculation: 1,   // BP within 20-50% of pre-op level
                aldreteConsciousness: 1, // Arousable on calling
                aldreteO2Saturation: 1,  // Needs supplemental O2
                painScore: 6,
                nauseaVomitingStatus: "MILD",
                recoveryNotes: "Patient still somnolent, monitoring oxygen saturation on nasal cannula."
            });

        expect(lowScoreRes.status).toBe(200);
        expect(lowScoreRes.body.data.aldreteTotalScore).toBe(5);
        expect(lowScoreRes.body.data.clearedForDischarge).toBe(false);
        expect(lowScoreRes.body.evaluation.isCleared).toBe(false);

        // Verify surgical case remains in PACU_RECOVERY
        const midCase = await prisma.surgicalCase.findUnique({
            where: { id: electiveCaseId }
        });
        expect(midCase.status).toBe("PACU_RECOVERY");

        // Step B: Satisfactory recovery score (Aldrete Total score = 10/10)
        const fullScoreRes = await request(app)
            .post(`/api/v1/surgery/cases/${electiveCaseId}/pacu`)
            .set("Authorization", `Bearer ${nurseToken}`)
            .send({
                aldreteActivity: 2,      // Moves all 4 extremities
                aldreteRespiration: 2,   // Breathes deeply and coughs freely
                aldreteCirculation: 2,   // BP within 20% of pre-op level
                aldreteConsciousness: 2, // Fully awake and alert
                aldreteO2Saturation: 2,  // Room air O2 saturation > 92%
                painScore: 1,
                nauseaVomitingStatus: "NONE",
                postOpDestination: "SURGICAL_WARD",
                recoveryNotes: "Patient fully awake, vitals stable on room air. Cleared for transfer to surgical ward."
            });

        expect(fullScoreRes.status).toBe(200);
        expect(fullScoreRes.body.data.aldreteTotalScore).toBe(10);
        expect(fullScoreRes.body.data.clearedForDischarge).toBe(true);
        expect(fullScoreRes.body.evaluation.isCleared).toBe(true);

        // Verify surgical case automatically transitioned to COMPLETED
        const completedCase = await prisma.surgicalCase.findUnique({
            where: { id: electiveCaseId }
        });
        expect(completedCase.status).toBe("COMPLETED");
    });

    // ----------------------------------------------------
    // TEST 13: Surgery & Operating Theatre Command Center Telemetry
    // ----------------------------------------------------
    test("13. Retrieve Real-Time Operating Theatre & Perioperative Command Center telemetry", async () => {
        const res = await request(app)
            .get("/api/v1/surgery/telemetry")
            .set("Authorization", `Bearer ${surgeonToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.totalCasesToday).toBeGreaterThanOrEqual(2);
        expect(res.body.data.emergencyCasesToday).toBeGreaterThanOrEqual(1);
        expect(res.body.data.completedSurgeriesToday).toBeGreaterThanOrEqual(1);
        expect(res.body.data.theatres).toBeDefined();
        expect(res.body.data.theatreSafety.scavengingSystemOperational).toBe(true);
        expect(res.body.data.theatreSafety.medicalGasPipelinePressureBar).toBe(4.2);
    });

    // ----------------------------------------------------
    // TEST 14: Security RBAC Enforcement
    // ----------------------------------------------------
    test("14. Security RBAC: reject unauthenticated requests and forbid non-clinical roles from documenting surgical reports", async () => {
        // Unauthenticated access
        const unauthRes = await request(app)
            .post("/api/v1/surgery/cases")
            .send({
                procedureCode: "SURG-APP-01"
            });
        expect(unauthRes.status).toBe(401);

        // Non-clinical role (Receptionist) attempting to document surgeon operative note
        const forbiddenRes = await request(app)
            .post(`/api/v1/surgery/cases/${electiveCaseId}/operative-report`)
            .set("Authorization", `Bearer ${receptionistToken}`)
            .send({
                operativeFindings: "Unauthorized attempt"
            });
        expect(forbiddenRes.status).toBe(403);
    });
});
