"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 20 INTEGRATION TEST SUITE
Migration Service Module & Enterprise Data Import Hub
Parsers (CSV/Excel/JSON), Mapping Engine, Duplicate Detection,
Preview, Approval Gate, Atomic Rollback & Real-time Telemetry
LOCATION: tests/phase20.migration_service_data_import.test.js
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 20: Migration Service Module & Enterprise Data Import Hub", () => {
    let adminToken;
    let patientJobId;
    let pharmacyJobId;
    let testTemplateName;
    const testTimestamp = Date.now();

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
    });

    // -------------------------------------------------------------
    // 1. Security & Catalogs
    // -------------------------------------------------------------
    test("1. GET /api/v1/migration/telemetry requires authentication (401 without token)", async () => {
        const res = await request(app).get("/api/v1/migration/telemetry");
        expect(res.status).toBe(401);
    });

    test("2. GET /api/v1/migration/catalogs returns supported sources and target entity schemas", async () => {
        const res = await request(app)
            .get("/api/v1/migration/catalogs")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.supportedSources).toBeDefined();

        const sourceCodes = res.body.data.supportedSources.map(s => s.code);
        expect(sourceCodes).toContain("CSV");
        expect(sourceCodes).toContain("EXCEL");
        expect(sourceCodes).toContain("JSON");
        expect(sourceCodes).toContain("GOOGLE_SHEETS");
        expect(sourceCodes).toContain("POSTGRESQL");

        expect(res.body.data.targetEntities).toBeDefined();
        expect(res.body.data.targetEntities.PATIENTS).toBeDefined();
        expect(res.body.data.targetEntities.INVENTORY_ITEMS).toBeDefined();
        expect(res.body.data.targetEntities.BILLING_TARIFFS).toBeDefined();
        expect(res.body.data.targetEntities.STAFF_RECORDS).toBeDefined();
    });

    // -------------------------------------------------------------
    // 2. Patient Data Import Pipeline
    // -------------------------------------------------------------
    test("3. POST /api/v1/migration/jobs initializes CSV import job and parses records into preview", async () => {
        const csvData = [
            "GivenName,FamilyName,Sex,DOB,PhoneNumber,NationalIdentity,NHIS_ID,ResAddress,BloodType",
            `Kwame_${testTimestamp},Appiah,MALE,1988-04-12,0244111222,GHA-${testTimestamp}-1,NHIS-${testTimestamp}-1,Accra North,O+`,
            `Akosua_${testTimestamp},Mensah,FEMALE,1992-09-25,0209333444,GHA-${testTimestamp}-2,NHIS-${testTimestamp}-2,Kumasi Central,A+`,
            `Invalid_${testTimestamp},Person,MALE,not-a-valid-date,0501234567,,,Tema Comm 4,B+`
        ].join("\n");

        const res = await request(app)
            .post("/api/v1/migration/jobs")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                targetEntity: "PATIENTS",
                sourceType: "CSV",
                fileName: `legacy_patients_${testTimestamp}.csv`,
                rawData: csvData
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.job).toBeDefined();
        expect(res.body.data.job.jobCode).toMatch(/^MIG-\d{4}-\d{6}$/);
        expect(res.body.data.job.totalRecords).toBe(3);
        expect(res.body.data.job.status).toBe("UPLOADED");
        expect(res.body.data.detectedHeaders).toContain("GivenName");
        expect(res.body.data.detectedHeaders).toContain("FamilyName");

        patientJobId = res.body.data.job.id;
    });

    test("4. POST /api/v1/migration/jobs/:jobId/mapping applies field mappings, validates types, and detects duplicates", async () => {
        const columnMappings = {
            firstName: "GivenName",
            lastName: "FamilyName",
            gender: "Sex",
            dateOfBirth: "DOB",
            phone: "PhoneNumber",
            nationalId: "NationalIdentity",
            nhisNumber: "NHIS_ID",
            address: "ResAddress",
            bloodGroup: "BloodType"
        };

        testTemplateName = `Patient_Legacy_Template_${testTimestamp}`;

        const res = await request(app)
            .post(`/api/v1/migration/jobs/${patientJobId}/mapping`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                columnMappings,
                saveAsTemplate: true,
                templateName: testTemplateName
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.job.status).toBe("PREVIEW_READY");
        expect(res.body.data.summary.total).toBe(3);
        expect(res.body.data.summary.valid).toBe(2);
        expect(res.body.data.summary.invalid).toBe(1); // 1 row with invalid dateOfBirth
    });

    test("5. POST /api/v1/migration/jobs/:jobId/approve gates migration behind human sign-off", async () => {
        const res = await request(app)
            .post(`/api/v1/migration/jobs/${patientJobId}/approve`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("APPROVED");
        expect(res.body.data.approvedBy).toBeDefined();
    });

    test("6. POST /api/v1/migration/jobs/:jobId/execute imports valid records into PostgreSQL with generated MRNs", async () => {
        const res = await request(app)
            .post(`/api/v1/migration/jobs/${patientJobId}/execute`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                duplicateStrategy: "SKIP"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.job.status).toBe("COMPLETED");
        expect(res.body.data.summary.imported).toBe(2);
        expect(res.body.data.summary.failed).toBe(1);

        // Verify patient records exist in PostgreSQL
        const patient1 = await prisma.patient.findFirst({
            where: { firstName: `Kwame_${testTimestamp}` }
        });
        expect(patient1).not.toBeNull();
        expect(patient1.patientNumber).toMatch(/^MRN-\d{4}-\d{6}$/);
        expect(patient1.gender).toBe("MALE");

        const patient2 = await prisma.patient.findFirst({
            where: { firstName: `Akosua_${testTimestamp}` }
        });
        expect(patient2).not.toBeNull();
        expect(patient2.patientNumber).toMatch(/^MRN-\d{4}-\d{6}$/);
        expect(patient2.gender).toBe("FEMALE");
    });

    test("7. GET /api/v1/migration/jobs/:jobId returns complete record-level audit trail", async () => {
        const res = await request(app)
            .get(`/api/v1/migration/jobs/${patientJobId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(patientJobId);
        expect(res.body.data.records).toBeDefined();
        expect(res.body.data.records.length).toBe(3);

        const importedItems = res.body.data.records.filter(r => r.status === "IMPORTED");
        expect(importedItems.length).toBe(2);
        expect(importedItems[0].destinationId).toBeDefined();

        const invalidItems = res.body.data.records.filter(r => r.status === "INVALID");
        expect(invalidItems.length).toBe(1);
    });

    test("8. POST /api/v1/migration/jobs/:jobId/rollback performs atomic rollback of created entities", async () => {
        const res = await request(app)
            .post(`/api/v1/migration/jobs/${patientJobId}/rollback`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                reason: "Automated regression testing rollback verification"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.job.status).toBe("ROLLED_BACK");
        expect(res.body.data.revertedCount).toBe(2);

        // Verify patient records are no longer present in PostgreSQL
        const deletedPatient1 = await prisma.patient.findFirst({
            where: { firstName: `Kwame_${testTimestamp}` }
        });
        expect(deletedPatient1).toBeNull();

        const deletedPatient2 = await prisma.patient.findFirst({
            where: { firstName: `Akosua_${testTimestamp}` }
        });
        expect(deletedPatient2).toBeNull();
    });

    // -------------------------------------------------------------
    // 3. Reusable Templates & Pharmacy Inventory Import
    // -------------------------------------------------------------
    test("9. GET /api/v1/migration/templates retrieves the saved mapping template", async () => {
        const res = await request(app)
            .get("/api/v1/migration/templates")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);

        const foundTemplate = res.body.data.find(t => t.name === testTemplateName);
        expect(foundTemplate).toBeDefined();
        expect(foundTemplate.targetEntity).toBe("PATIENTS");
        expect(foundTemplate.columnMappings.firstName).toBe("GivenName");
    });

    test("10. POST /api/v1/migration/jobs supports JSON inventory item import with pricing", async () => {
        const inventoryData = [
            {
                DrugName: `Amoxicillin_${testTimestamp}`,
                DrugClass: "ANTIBIOTICS",
                Form: "CAPSULE",
                Dose: "500mg",
                PriceGHS: 24.50,
                MinStock: 50
            },
            {
                DrugName: `Paracetamol_${testTimestamp}`,
                DrugClass: "ANALGESICS",
                Form: "TABLET",
                Dose: "1000mg",
                PriceGHS: 12.00,
                MinStock: 100
            }
        ];

        // 1. Initialize Job
        const initRes = await request(app)
            .post("/api/v1/migration/jobs")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                targetEntity: "INVENTORY_ITEMS",
                sourceType: "JSON",
                fileName: `pharmacy_import_${testTimestamp}.json`,
                rawData: inventoryData
            });

        expect(initRes.status).toBe(201);
        pharmacyJobId = initRes.body.data.job.id;

        // 2. Map Columns
        const mapRes = await request(app)
            .post(`/api/v1/migration/jobs/${pharmacyJobId}/mapping`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                columnMappings: {
                    name: "DrugName",
                    category: "DrugClass",
                    dosageForm: "Form",
                    strength: "Dose",
                    unitPrice: "PriceGHS",
                    reorderLevel: "MinStock"
                }
            });

        expect(mapRes.status).toBe(200);
        expect(mapRes.body.data.summary.valid).toBe(2);

        // 3. Approve
        const approveRes = await request(app)
            .post(`/api/v1/migration/jobs/${pharmacyJobId}/approve`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(approveRes.status).toBe(200);

        // 4. Execute
        const execRes = await request(app)
            .post(`/api/v1/migration/jobs/${pharmacyJobId}/execute`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(execRes.status).toBe(200);
        expect(execRes.body.data.summary.imported).toBe(2);

        // Verify Pharmacy items in PostgreSQL
        const drug1 = await prisma.pharmacyItem.findFirst({
            where: { name: `Amoxicillin_${testTimestamp}` }
        });
        expect(drug1).not.toBeNull();
        expect(drug1.unitPrice).toBe(24.50);

        // 5. Rollback to clean up
        const rollbackRes = await request(app)
            .post(`/api/v1/migration/jobs/${pharmacyJobId}/rollback`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ reason: "Clean up test items" });

        expect(rollbackRes.status).toBe(200);
        expect(rollbackRes.body.data.revertedCount).toBe(2);
    });

    // -------------------------------------------------------------
    // 4. Live PostgreSQL Telemetry
    // -------------------------------------------------------------
    test("11. GET /api/v1/migration/telemetry aggregates real migration job and record metrics", async () => {
        const res = await request(app)
            .get("/api/v1/migration/telemetry")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.totalJobs).toBeGreaterThanOrEqual(2);
        expect(res.body.data.targetBreakdown).toBeDefined();
        expect(res.body.data.sourceBreakdown).toBeDefined();
        expect(res.body.data.recentJobs.length).toBeGreaterThanOrEqual(2);
    });
});
