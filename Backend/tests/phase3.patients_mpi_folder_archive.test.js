"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 3 / PROCEDURE 3 INTEGRATION TEST SUITE
Master Patient Index (MPI), Patient Registration,
Physical Medical Folder Archive & Chain of Custody
LOCATION: tests/phase3.patients_mpi_folder_archive.test.js
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 3 / Procedure 3: Patient Management, MPI, Medical Folder Archive & Retrieval", () => {
    let developerToken = null;
    let hospitalId = null;
    let registeredPatient = null;
    let physicalFolder = null;
    let retrievalRequestId = null;

    const uniqueTimestamp = Date.now();
    const testPatientData = {
        firstName: "Abena",
        lastName: `Osei_${uniqueTimestamp}`,
        middleName: "Serwaa",
        dateOfBirth: "1994-06-15",
        gender: "FEMALE",
        phone: `+23324${Math.floor(1000000 + Math.random() * 9000000)}`,
        email: `abena_${uniqueTimestamp}@gmail.com`,
        address: "7 Kwame Nkrumah Avenue, Adabraka",
        nationalId: `GHA-${uniqueTimestamp}-1`,
        nhisNumber: `NHIS-${uniqueTimestamp}`,
        occupation: "Financial Analyst",
        maritalStatus: "MARRIED",
        nationality: "Ghanaian",
        bloodGroup: "O_POSITIVE",
        genotype: "AA",
        emergencyContactName: "Kofi Osei",
        emergencyContactPhone: "+233244889900",
        emergencyContactRelation: "Spouse",
        chronicConditions: "Mild Asthma",
        knownAllergies: "Penicillin, Peanuts",
        medicalHistory: "Appendectomy (2018)"
    };

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

        // Ensure at least one Hospital exists in DB
        let hospital = await prisma.hospital.findFirst();
        if (!hospital) {
            hospital = await prisma.hospital.create({
                data: {
                    name: `Korle-Bu Teaching Hospital ${uniqueTimestamp}`,
                    code: `KBTH-${uniqueTimestamp}`,
                    city: "Accra",
                    country: "Ghana",
                    active: true
                }
            });
        }
        hospitalId = hospital.id;
        testPatientData.hospitalId = hospitalId;
    });

    afterAll(async () => {
        // Clean up test records
        if (registeredPatient && registeredPatient.id) {
            try {
                if (physicalFolder && physicalFolder.id) {
                    await prisma.folderMovementLog.deleteMany({ where: { folderId: physicalFolder.id } });
                    await prisma.folderRetrievalRequest.deleteMany({ where: { folderId: physicalFolder.id } });
                    await prisma.medicalFolder.deleteMany({ where: { id: physicalFolder.id } });
                }
                await prisma.patientProfile.deleteMany({ where: { patientId: registeredPatient.id } });
                await prisma.patient.delete({ where: { id: registeredPatient.id } });
            } catch (err) {
                // Ignore cleanup errors
            }
        }
        await prisma.$disconnect();
    });

    // 1. Patient Registration into MPI & Automated Physical Folder Provisioning
    test("POST /api/v1/patients/register - Should register patient, allocate MRN and physical shelf slot", async () => {
        const res = await request(app)
            .post("/api/v1/patients/register")
            .set("Authorization", `Bearer ${developerToken}`)
            .send(testPatientData);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);

        const { patient, physicalFolder: folder } = res.body.data;
        registeredPatient = patient;
        physicalFolder = folder;

        // Verify Patient Identifiers
        expect(patient).toBeDefined();
        expect(patient.patientNumber).toMatch(/^MRN-\d{4}-\w{6}$/);
        expect(patient.firstName).toBe("Abena");
        expect(patient.nationalId).toBe(testPatientData.nationalId);
        expect(patient.nhisNumber).toBe(testPatientData.nhisNumber);
        expect(patient.bloodGroup).toBe("O_POSITIVE");
        expect(patient.genotype).toBe("AA");

        // Verify Automated Physical Folder Provisioning
        expect(folder).toBeDefined();
        expect(folder.folderNumber).toMatch(/^FLD-\d{4}-\w{6}$/);
        expect(folder.barcode).toMatch(/^BAR-\d{4}-\w{6}$/);
        expect(folder.shelfLocation).toMatch(/^SHELF-[A-Z]\d-BAY\d{2}-RACK\d{2}$/);
        expect(folder.status).toBe("IN_ARCHIVE");
    });

    // 2. Reject Duplicate National ID Registration
    test("POST /api/v1/patients/register - Should reject duplicate National ID", async () => {
        const res = await request(app)
            .post("/api/v1/patients/register")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                ...testPatientData,
                firstName: "Another",
                lastName: "Person",
                phone: "+233200998877"
            });

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("PATIENT_NATIONAL_ID_EXISTS");
    });

    // 3. Master Patient Index (MPI) Multi-Field Search
    test("GET /api/v1/patients/search - MPI Search by MRN, National ID, Phone, and Name", async () => {
        // Search by MRN
        const mrnRes = await request(app)
            .get(`/api/v1/patients/search?mrn=${registeredPatient.patientNumber}`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(mrnRes.status).toBe(200);
        expect(mrnRes.body.success).toBe(true);
        expect(mrnRes.body.data.length).toBeGreaterThanOrEqual(1);
        expect(mrnRes.body.data[0].patientNumber).toBe(registeredPatient.patientNumber);
        expect(mrnRes.body.data[0].physicalFolder.shelfLocation).toBe(physicalFolder.shelfLocation);

        // Search by National ID
        const natRes = await request(app)
            .get(`/api/v1/patients/search?nationalId=${registeredPatient.nationalId}`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(natRes.status).toBe(200);
        expect(natRes.body.data[0].id).toBe(registeredPatient.id);

        // General Query Search (Phone)
        const qRes = await request(app)
            .get(`/api/v1/patients/search?query=${testPatientData.phone}`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(qRes.status).toBe(200);
        expect(qRes.body.data[0].id).toBe(registeredPatient.id);
    });

    // 4. Retrieve Comprehensive Patient Record
    test("GET /api/v1/patients/:id - Should retrieve complete patient file and physical folder", async () => {
        const res = await request(app)
            .get(`/api/v1/patients/${registeredPatient.id}`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(registeredPatient.id);
        expect(res.body.data.folder).toBeDefined();
        expect(res.body.data.folder.folderNumber).toBe(physicalFolder.folderNumber);
        expect(res.body.data.profile.chronicConditions).toBe("Mild Asthma");
    });

    // 5. Update Patient Demographics & Profile
    test("PUT /api/v1/patients/:id - Should update patient contact and clinical profile", async () => {
        const res = await request(app)
            .put(`/api/v1/patients/${registeredPatient.id}`)
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                occupation: "Senior Portfolio Manager",
                chronicConditions: "Mild Asthma (Controlled)"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.occupation).toBe("Senior Portfolio Manager");
    });

    // 6. Patient Role Dashboard Payload
    test("GET /api/v1/patients/:id/dashboard - Should return authentic patient dashboard and role imagery metadata", async () => {
        const res = await request(app)
            .get(`/api/v1/patients/${registeredPatient.id}/dashboard`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.patient.patientNumber).toBe(registeredPatient.patientNumber);
        expect(res.body.data.medicalFolder.status).toBe("IN_ARCHIVE");
        expect(res.body.data.dashboardRoleTheme.role).toBe("PATIENT");
        expect(res.body.data.dashboardRoleTheme.bannerImageUrl).toContain("patient_dashboard_hero.jpg");
    });

    // 7. Request Physical Folder Retrieval (Doctor/Clinic)
    test("POST /api/v1/medical-records/folders/request - Doctor requests physical file pull", async () => {
        const res = await request(app)
            .post("/api/v1/medical-records/folders/request")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                patientId: registeredPatient.id,
                destinationDepartment: "Consulting Room 4 (General OPD)",
                priority: "URGENT",
                notes: "Patient checked in for morning consultation."
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("PENDING");
        expect(res.body.data.priority).toBe("URGENT");
        expect(res.body.data.shelfLocation).toBe(physicalFolder.shelfLocation);

        retrievalRequestId = res.body.data.requestId;
    });

    // 8. Folder Retriever Work Queue
    test("GET /api/v1/medical-records/folders/retrieval-queue - Work queue prioritized for FOLDER_RETRIEVER", async () => {
        const res = await request(app)
            .get("/api/v1/medical-records/folders/retrieval-queue")
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);

        const found = res.body.data.find(req => req.requestId === retrievalRequestId);
        expect(found).toBeDefined();
        expect(found.folder.shelfLocation).toBe(physicalFolder.shelfLocation);
        expect(found.priority).toBe("URGENT");
    });

    // 9. Folder Retriever Lifecycle: Shelf Pull to Clinic Delivery
    test("POST /requests/:id/retrieve & POST /requests/:id/deliver - Physical movement tracking", async () => {
        // Step A: Mark Pulled from Shelf
        const pullRes = await request(app)
            .post(`/api/v1/medical-records/folders/requests/${retrievalRequestId}/retrieve`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(pullRes.status).toBe(200);
        expect(pullRes.body.data.status).toBe("RETRIEVING");

        // Step B: Mark Delivered to OPD
        const deliverRes = await request(app)
            .post(`/api/v1/medical-records/folders/requests/${retrievalRequestId}/deliver`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(deliverRes.status).toBe(200);
        expect(deliverRes.body.data.status).toBe("DELIVERED");
        expect(deliverRes.body.data.destinationDepartment).toBe("Consulting Room 4 (General OPD)");
    });

    // 10. Return Folder to Archive Shelf
    test("POST /api/v1/medical-records/folders/:folderId/return - Re-shelve folder into archive", async () => {
        const res = await request(app)
            .post(`/api/v1/medical-records/folders/${physicalFolder.id}/return`)
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                returnNotes: "Consultation concluded, physical file returned to archive slot."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("IN_ARCHIVE");
        expect(res.body.data.shelfLocation).toBe(physicalFolder.shelfLocation);
    });

    // 11. Complete Chain of Custody Audit Trail
    test("GET /api/v1/medical-records/folders/:folderId/audit-trail - Verify full movement custody trail", async () => {
        const res = await request(app)
            .get(`/api/v1/medical-records/folders/${physicalFolder.id}/audit-trail`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.chainOfCustodyLogs.length).toBeGreaterThanOrEqual(4);

        const actions = res.body.data.chainOfCustodyLogs.map(l => l.action);
        expect(actions).toContain("INITIAL_SHELVED");
        expect(actions).toContain("REQUESTED");
        expect(actions).toContain("CHECKED_OUT");
        expect(actions).toContain("DELIVERED");
        expect(actions).toContain("RETURNED_TO_SHELF");
    });

    // 12. Folder Retriever Role Dashboard Summary
    test("GET /api/v1/medical-records/folders/retriever-dashboard - Live archive telemetry for FOLDER_RETRIEVER role", async () => {
        const res = await request(app)
            .get("/api/v1/medical-records/folders/retriever-dashboard")
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.statistics.totalFolders).toBeGreaterThanOrEqual(1);
        expect(res.body.data.dashboardRoleTheme.role).toBe("FOLDER_RETRIEVER");
        expect(res.body.data.dashboardRoleTheme.bannerImageUrl).toContain("medical_archive_hero.jpg");
    });
});
