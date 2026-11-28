"use strict";

/*
================================================================================
PHASE 45: FILE 9 — 12-PHASE WORKING SYSTEM & FULL CROSS-MODULE E2E INTEGRATION
================================================================================
Verifies all 12 File 9 Working-System phases end-to-end against real PostgreSQL:
1. Live 12/12 Working-System Readiness Audit endpoint (Developer-only) & Health probe.
2. Multi-role registration, admin approval, authentication & strict backend RBAC isolation.
3. Full connected Patient Journey across communicating dashboards without skipping a step:
   Patient Registration -> MPI -> Auto Medical Folder -> OPD Check-In -> Nurse Triage Vitals
   -> Doctor Consultation -> ICD-10 Diagnosis + Prescription + Lab Order -> Pharmacy Pending Queue
   -> Billing Invoice Automated Total -> Payment Automated Balance -> Executive Overview Stats.
4. Automatic cross-module propagation to All-Users Voice/Video Call Directory, concurrent
   8-dashboard parallel load reliability, and immutable SHA-256 audit chain integrity.
*/

const request = require("supertest");
process.env.NODE_ENV = "test";

const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");
const { rcce } = require("../src/core/gbs-rcce.bootstrap");
const { waitForPendingAuditWrites } = require("../src/core/middleware/rcce-audit.middleware");

describe("Phase 45: File 9 — 12-Phase Working System & Cross-Module End-to-End Integration", () => {
    let devToken;
    let adminToken;
    let receptionistToken;
    let nurseToken;
    let doctorToken;
    let accountantToken;
    let patientToken;
    let hospitalId;

    let doctorUserId;
    let patientUserId;
    let testPatient = null;
    let testEncounter = null;
    let testBillId = null;

    const stamp = Date.now();
    const pwd = "Phase45WorkingSys2026!";
    const createdUserEmails = [];
    const createdUserIds = [];

    async function createApprovedRoleUser(roleName, firstName, lastName) {
        const email = `phase45.${roleName.toLowerCase()}.${stamp}@gbs.local`;
        createdUserEmails.push(email);
        const signupRes = await request(app)
            .post("/api/v1/auth/signup")
            .send({ email, password: pwd, firstName, lastName, role: roleName });
        expect(signupRes.statusCode).toBe(201);
        const userId = signupRes.body.data.id;
        createdUserIds.push(userId);

        const approveRes = await request(app)
            .patch(`/api/v1/users/${userId}/approve`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(approveRes.statusCode).toBe(200);

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email, password: pwd });
        expect(loginRes.statusCode).toBe(200);

        return { userId, token: loginRes.body.data.token, user: loginRes.body.data.user };
    }

    beforeAll(async () => {
        const [devLogin, adminLogin] = await Promise.all([
            request(app).post("/api/v1/auth/login").send({
                email: process.env.DEVELOPER_ROOT_EMAIL || "gabosei48@gmail.com",
                password: process.env.DEVELOPER_ROOT_PASSWORD || "CiTestDevPassword2026!"
            }),
            request(app).post("/api/v1/auth/login").send({
                email: "admin@gbs.com",
                password: process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin123"
            })
        ]);
        expect(devLogin.statusCode).toBe(200);
        expect(adminLogin.statusCode).toBe(200);
        devToken = devLogin.body.data.token;
        adminToken = adminLogin.body.data.token;

        const hospital = await prisma.hospital.findFirst({ orderBy: { createdAt: "asc" } });
        expect(hospital).toBeTruthy();
        hospitalId = hospital.id;

        const recep = await createApprovedRoleUser("RECEPTIONIST", "Esi", "FrontDesk45");
        const nurse = await createApprovedRoleUser("NURSE", "Akosua", "Triage45");
        const doc = await createApprovedRoleUser("DOCTOR", "Yaw", "Clinician45");
        const acct = await createApprovedRoleUser("ACCOUNTANT", "Kojo", "Finance45");
        const pat = await createApprovedRoleUser("PATIENT", "Abena", "Portal45");

        receptionistToken = recep.token;
        nurseToken = nurse.token;
        doctorToken = doc.token;
        accountantToken = acct.token;
        patientToken = pat.token;
        doctorUserId = doc.userId;
        patientUserId = pat.userId;
    }, 60000);

    afterAll(async () => {
        await waitForPendingAuditWrites(2000);
        if (testPatient) {
            await prisma.patientPayment.deleteMany({ where: { bill: { patientId: testPatient.id } } }).catch(() => {});
            await prisma.billItem.deleteMany({ where: { bill: { patientId: testPatient.id } } }).catch(() => {});
            await prisma.patientBill.deleteMany({ where: { patientId: testPatient.id } }).catch(() => {});
            if (testEncounter) {
                await prisma.laboratoryRequest.deleteMany({ where: { encounterId: testEncounter.id } }).catch(() => {});
                await prisma.patientPrescription.deleteMany({ where: { encounterId: testEncounter.id } }).catch(() => {});
                await prisma.patientDiagnosis.deleteMany({ where: { encounterId: testEncounter.id } }).catch(() => {});
                await prisma.patientConsultation.deleteMany({ where: { encounterId: testEncounter.id } }).catch(() => {});
                await prisma.patientVitalSign.deleteMany({ where: { encounterId: testEncounter.id } }).catch(() => {});
                await prisma.patientEncounter.delete({ where: { id: testEncounter.id } }).catch(() => {});
            }
            await prisma.medicalFolder.deleteMany({ where: { patientId: testPatient.id } }).catch(() => {});
            await prisma.patient.delete({ where: { id: testPatient.id } }).catch(() => {});
        }
        if (createdUserIds.length > 0) {
            await prisma.auditLog.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
            await prisma.session.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
            await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
        }
        await new Promise((r) => setTimeout(r, 250));
    });

    test("1. Live 12-Phase Working-System Audit proves 12/12 PRODUCTION_READY_WORKING_SYSTEM & enforces Developer isolation", async () => {
        // Non-developer roles must be strictly blocked
        const adminBlocked = await request(app)
            .get("/api/v1/rcce/developer/remote/working-system-audit")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(adminBlocked.statusCode).toBe(403);

        const patientBlocked = await request(app)
            .get("/api/v1/rcce/developer/remote/working-system-audit")
            .set("Authorization", `Bearer ${patientToken}`);
        expect(patientBlocked.statusCode).toBe(403);

        // Authenticated Developer runs live 12-phase probe
        const res = await request(app)
            .get("/api/v1/rcce/developer/remote/working-system-audit")
            .set("Authorization", `Bearer ${devToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        const audit = res.body.data;
        expect(audit.totalPhases).toBe(12);
        expect(audit.verifiedCount).toBe(12);
        expect(audit.readinessPercent).toBe(100);
        expect(audit.classification).toBe("PRODUCTION_READY_WORKING_SYSTEM");
        expect(audit.phases.every((p) => p.verified === true)).toBe(true);
    });

    test("2. Backend RBAC boundaries protect clinical, billing, and developer domains across roles", async () => {
        // Patient cannot register other patients or generate hospital invoices
        const patRegBlocked = await request(app)
            .post("/api/v1/patients/register")
            .set("Authorization", `Bearer ${patientToken}`)
            .send({ hospitalId, firstName: "Blocked", lastName: "Attempt", dateOfBirth: "1992-01-01", gender: "FEMALE" });
        expect(patRegBlocked.statusCode).toBe(403);

        const patBillBlocked = await request(app)
            .post("/api/v1/billing/bills")
            .set("Authorization", `Bearer ${patientToken}`)
            .send({ patientId: "invalid", items: [] });
        expect(patBillBlocked.statusCode).toBe(403);

        // Doctor cannot access unlisted Developer Control Overview
        const docDevBlocked = await request(app)
            .get("/api/v1/rcce/developer/overview")
            .set("Authorization", `Bearer ${doctorToken}`);
        expect(docDevBlocked.statusCode).toBe(403);
    });

    test("3. Full End-to-End Connected Patient Journey flows seamlessly across 8 communicating hospital modules", async () => {
        // STEP 1 (Receptionist -> Patients & Medical Records): Register Patient
        const regRes = await request(app)
            .post("/api/v1/patients/register")
            .set("Authorization", `Bearer ${receptionistToken}`)
            .send({
                hospitalId,
                firstName: "Nana",
                lastName: `OseiE2E_${stamp}`,
                dateOfBirth: "1991-05-18",
                gender: "MALE",
                phone: `+23324${String(stamp).slice(-7)}`,
                bloodGroup: "O_POSITIVE",
                genotype: "AA"
            });
        expect(regRes.statusCode).toBe(201);
        testPatient = regRes.body.data.patient;
        expect(testPatient.id).toBeTruthy();

        // STEP 2 (MPI & Medical Folder Integration): Patient appears immediately in MPI Search + Folder Dashboard
        const mpiRes = await request(app)
            .get(`/api/v1/patients/search?q=OseiE2E_${stamp}`)
            .set("Authorization", `Bearer ${receptionistToken}`);
        expect(mpiRes.statusCode).toBe(200);
        const mpiList = Array.isArray(mpiRes.body.data) ? mpiRes.body.data : (mpiRes.body.data?.patients || []);
        expect(mpiList.some((p) => p.id === testPatient.id)).toBe(true);

        const patDashRes = await request(app)
            .get(`/api/v1/patients/${testPatient.id}/dashboard`)
            .set("Authorization", `Bearer ${doctorToken}`);
        expect(patDashRes.statusCode).toBe(200);

        // STEP 3 (Receptionist -> OPD Queue): Check Patient into OPD
        const checkInRes = await request(app)
            .post("/api/v1/clinical/opd/check-in")
            .set("Authorization", `Bearer ${receptionistToken}`)
            .send({
                hospitalId,
                patientId: testPatient.id,
                department: "GENERAL_OPD",
                priority: "ROUTINE",
                chiefComplaint: "Persistent fever and headache (File 9 E2E verification)"
            });
        expect(checkInRes.statusCode).toBe(201);
        testEncounter = checkInRes.body.data.encounter;
        expect(testEncounter.status).toBe("WAITING_TRIAGE");

        // STEP 4 (Nurse -> Triage Vitals): Record Vitals -> Automated NEWS2 Scoring & Doctor Queue handoff
        const vitalsRes = await request(app)
            .post(`/api/v1/clinical/triage/${testEncounter.id}/vitals`)
            .set("Authorization", `Bearer ${nurseToken}`)
            .send({
                temperature: 38.4,
                pulseRate: 96,
                respiratoryRate: 18,
                systolicBP: 120,
                diastolicBP: 78,
                oxygenSaturation: 98,
                weight: 74,
                height: 176,
                consciousness: "ALERT",
                triageNotes: "E2E verified vitals"
            });
        expect(vitalsRes.statusCode).toBe(201);

        // STEP 5 (Doctor -> Call-In & SOAP Consultation with ICD-10, Prescription & Lab Order)
        const callInRes = await request(app)
            .post(`/api/v1/clinical/encounters/${testEncounter.id}/call-in`)
            .set("Authorization", `Bearer ${doctorToken}`);
        expect(callInRes.statusCode).toBe(200);

        const consultRes = await request(app)
            .post(`/api/v1/clinical/encounters/${testEncounter.id}/consultation`)
            .set("Authorization", `Bearer ${doctorToken}`)
            .send({
                consultationType: "INITIAL",
                history: "Fever and headache for 2 days.",
                examination: "Alert, oriented, mild pyrexia.",
                assessment: "Uncomplicated malaria suspected.",
                plan: "Oral Paracetamol and FBC lab check.",
                diagnoses: [{ diagnosisCode: "B50.9", diagnosisType: "PRIMARY", notes: "E2E diagnosis" }],
                prescriptions: [{
                    medicationName: "Paracetamol",
                    dosage: "1000mg",
                    frequency: "TDS",
                    duration: "3 days",
                    instructions: "Take after meals"
                }],
                laboratoryRequests: [{ testCode: "LAB-FBC", testName: "Full Blood Count (FBC / CBC)" }]
            });
        expect(consultRes.statusCode).toBe(201);
        expect(consultRes.body.data.prescriptions.length).toBe(1);
        expect(consultRes.body.data.laboratoryRequests.length).toBe(1);

        // STEP 6 (Cross-Module Propagation -> Pharmacy Pending Queue & Patient Clinical History)
        const pharmQueueRes = await request(app)
            .get("/api/v1/pharmacy/prescriptions/pending")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(pharmQueueRes.statusCode).toBe(200);
        const pendingRx = Array.isArray(pharmQueueRes.body.data)
            ? pharmQueueRes.body.data
            : (pharmQueueRes.body.data?.prescriptions || []);
        expect(pendingRx.some((rx) => rx.encounterId === testEncounter.id)).toBe(true);

        const histRes = await request(app)
            .get(`/api/v1/clinical/patients/${testPatient.id}/clinical-history`)
            .set("Authorization", `Bearer ${doctorToken}`);
        expect(histRes.statusCode).toBe(200);

        // STEP 7 (Accountant -> Billing Invoice Automated Total & Payment Automated Balance)
        const billRes = await request(app)
            .post("/api/v1/billing/bills")
            .set("Authorization", `Bearer ${accountantToken}`)
            .send({
                encounterId: testEncounter.id,
                payorType: "CASH",
                description: "File 9 E2E outpatient consultation and laboratory invoice",
                items: [
                    { category: "CONSULTATION", serviceCode: "TARIFF-CONS-GEN", serviceName: "General OPD Consultation", quantity: 1, unitPrice: 80 },
                    { category: "LABORATORY", serviceCode: "LAB-FBC", serviceName: "Full Blood Count (FBC)", quantity: 1, unitPrice: 45 }
                ]
            });
        expect(billRes.statusCode).toBe(201);
        const createdBill = billRes.body.data.bill || billRes.body.data;
        testBillId = createdBill.id;
        expect(parseFloat(createdBill.grossAmount)).toBe(125);
        expect(parseFloat(createdBill.patientPayableAmount)).toBe(125);
        expect(parseFloat(createdBill.balanceDue)).toBe(125);

        const payRes = await request(app)
            .post(`/api/v1/billing/bills/${testBillId}/pay`)
            .set("Authorization", `Bearer ${accountantToken}`)
            .send({
                amount: 125,
                paymentMethod: "MOBILE_MONEY",
                referenceNumber: `MOMO-E2E-${stamp}`,
                notes: "Full E2E settlement"
            });
        expect([200, 201]).toContain(payRes.statusCode);
        const updatedBill = await prisma.patientBill.findUnique({ where: { id: testBillId } });
        expect(parseFloat(updatedBill.balanceDue)).toBe(0);
        expect(updatedBill.paymentStatus).toBe("PAID");

        // STEP 8 (Executive Overview Stats live PostgreSQL reflection)
        const overviewRes = await request(app).get("/api/v1/health/overview-stats");
        expect(overviewRes.statusCode).toBe(200);
        expect(overviewRes.body.data.metrics.totalPatients).toBeGreaterThanOrEqual(1);
        expect(overviewRes.body.data.metrics.totalConsultations).toBeGreaterThanOrEqual(1);
        expect(overviewRes.body.data.metrics.totalPrescriptions).toBeGreaterThanOrEqual(1);
    });

    test("4. Cross-Module Calling Directory Sync, Concurrent 8-Dashboard Load & SHA-256 Audit Integrity", async () => {
        // Newly approved Doctor & Patient automatically discover each other in All-Users Call Directory
        const patDirRes = await request(app)
            .get("/api/v1/communications/directory?search=Clinician45")
            .set("Authorization", `Bearer ${patientToken}`);
        expect(patDirRes.statusCode).toBe(200);
        expect((patDirRes.body.data.contacts || []).some((c) => c.id === doctorUserId)).toBe(true);

        const docDirRes = await request(app)
            .get("/api/v1/communications/directory?search=Portal45")
            .set("Authorization", `Bearer ${doctorToken}`);
        expect(docDirRes.statusCode).toBe(200);
        expect((docDirRes.body.data.contacts || []).some((c) => c.id === patientUserId)).toBe(true);

        // Concurrent 8-dashboard simultaneous load verification (Phase 11 reliability)
        const parallelResults = await Promise.all([
            request(app).get("/api/v1/health"),
            request(app).get("/api/v1/patients/search?q=Nana").set("Authorization", `Bearer ${receptionistToken}`),
            request(app).get("/api/v1/clinical/triage/queue").set("Authorization", `Bearer ${nurseToken}`),
            request(app).get("/api/v1/clinical/doctor/queue").set("Authorization", `Bearer ${doctorToken}`),
            request(app).get("/api/v1/pharmacy/prescriptions/pending").set("Authorization", `Bearer ${adminToken}`),
            request(app).get("/api/v1/billing/dashboard").set("Authorization", `Bearer ${accountantToken}`),
            request(app).get("/api/v1/communications/directory").set("Authorization", `Bearer ${patientToken}`),
            request(app).get("/api/v1/international/countries")
        ]);
        for (const r of parallelResults) {
            expect(r.statusCode).toBe(200);
        }

        // Verify SHA-256 audit chain integrity on recent PostgreSQL audit entries
        await waitForPendingAuditWrites(2000);
        const recentAudits = await prisma.auditLog.findMany({
            where: { integrityHash: { not: null } },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: { id: true, previousHash: true, integrityHash: true }
        });
        const report = await rcce.audit.verifyIntegrity(recentAudits);
        expect(report.integrityIntact).toBe(true);
    });
});
