"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 14 INTEGRATION TEST SUITE
Mortuary Management, Cold Storage Vaults,
Autopsy Examination & Deceased Patient Family Release
LOCATION: tests/phase14.mortuary_cold_storage_deceased_release.test.js
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 14: Mortuary Management & Deceased Patient Services Subsystem", () => {
    let adminToken;
    let testChamberId;
    let testChamberCode;
    let testCorpseId;
    let testCorpseNumber;
    let testCoronerCorpseId;
    let testAutopsyId;
    let testReleaseId;

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
    // Security & Auth Gate
    // -------------------------------------------------------------
    test("1. GET /api/v1/mortuary/telemetry requires authentication (401 without token)", async () => {
        const res = await request(app).get("/api/v1/mortuary/telemetry");
        expect(res.status).toBe(401);
    });

    // -------------------------------------------------------------
    // Cold Storage Chambers & Vault Provisioning
    // -------------------------------------------------------------
    test("2. POST /api/v1/mortuary/chambers provisions a refrigerated cold storage vault chamber (VLT-XX)", async () => {
        const payload = {
            vaultName: "Cold Storage Vault Alpha",
            storageTier: "REFRIGERATED",
            targetTemperature: 3.0,
            capacity: 2
        };

        const res = await request(app)
            .post("/api/v1/mortuary/chambers")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.chamberCode).toMatch(/^VLT-\d{2}$/);
        expect(res.body.data.storageTier).toBe("REFRIGERATED");
        expect(res.body.data.targetTemperature).toBe(3.0);
        expect(res.body.data.occupiedCount).toBe(0);

        testChamberId = res.body.data.id;
        testChamberCode = res.body.data.chamberCode;
    });

    test("3. GET /api/v1/mortuary/chambers lists all chambers with occupancy tracking", async () => {
        const res = await request(app)
            .get("/api/v1/mortuary/chambers")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data.some(c => c.id === testChamberId)).toBe(true);
    });

    test("4. PATCH /api/v1/mortuary/chambers/:id/temperature updates temperature telemetry", async () => {
        const res = await request(app)
            .patch(`/api/v1/mortuary/chambers/${testChamberId}/temperature`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ temperature: 2.8 });

        expect(res.status).toBe(200);
        expect(res.body.data.currentTemperature).toBe(2.8);
    });

    // -------------------------------------------------------------
    // Corpse Intake & Inventory Registration
    // -------------------------------------------------------------
    test("5. POST /api/v1/mortuary/corpses registers clinical deceased intake (CRP-YYYY-XXXXXX, DC-YYYY-XXXXXX) and allocates compartment", async () => {
        const payload = {
            deceasedName: "Emmanuel K. Darko",
            gender: "MALE",
            age: 68,
            dateOfDeath: "2026-10-30T18:45:00.000Z",
            timeOfDeath: "18:45",
            placeOfDeath: "Intensive Care Unit (ICU)",
            caseCategory: "NON_CORONER_CLINICAL",
            certifyingPhysician: "Dr. Kwabena Frimpong",
            immediateCauseOfDeath: "Acute Cardiopulmonary Failure",
            underlyingCauseOfDeath: "End-Stage Congestive Heart Failure",
            intakeNurseOrOfficer: "Officer Seth Mensah",
            chamberId: testChamberId,
            propertyItems: [
                { item: "Gold signet ring", bagTag: "BAG-2026-001" },
                { item: "Leather wallet with Ghana Card", bagTag: "BAG-2026-002" }
            ]
        };

        const res = await request(app)
            .post("/api/v1/mortuary/corpses")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.corpseNumber).toMatch(/^CRP-\d{4}-\d{6}$/);
        expect(res.body.data.deathCertificateNumber).toMatch(/^DC-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("IN_STORAGE");
        expect(res.body.data.isCoronerCleared).toBe(true);
        expect(res.body.data.compartmentNumber).toBe(`${testChamberCode}-BAY-01`);

        testCorpseId = res.body.data.id;
        testCorpseNumber = res.body.data.corpseNumber;

        // Verify chamber occupancy incremented
        const chamberCheck = await prisma.mortuaryChamber.findUnique({ where: { id: testChamberId } });
        expect(chamberCheck.occupiedCount).toBe(1);
    });

    test("6. POST /api/v1/mortuary/corpses registers police coroner case with coroner hold flag", async () => {
        const payload = {
            deceasedName: "Unidentified Male (Motorway Hit & Run)",
            gender: "MALE",
            age: 35,
            placeOfDeath: "Tema Motorway km 14 (Brought-in-Dead)",
            caseCategory: "POLICE_CORONER",
            certifyingPhysician: "Dr. Kwame EmergencyDoc",
            immediateCauseOfDeath: "Massive traumatic craniocerebral injury",
            intakeNurseOrOfficer: "Detective Sgt. Ofori (Airport Police)"
        };

        const res = await request(app)
            .post("/api/v1/mortuary/corpses")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.data.caseCategory).toBe("POLICE_CORONER");
        expect(res.body.data.isCoronerCleared).toBe(false); // Mandatory legal hold active

        testCoronerCorpseId = res.body.data.id;
    });

    test("7. GET /api/v1/mortuary/corpses returns inventory with overstay and daysInStorage calculations", async () => {
        const res = await request(app)
            .get("/api/v1/mortuary/corpses")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(2);
        expect(res.body.data[0].daysInStorage).toBeDefined();
        expect(typeof res.body.data[0].isOverstay).toBe("boolean");
    });

    test("8. GET /api/v1/mortuary/corpses/:id returns detailed corpse record with property items inventory", async () => {
        const res = await request(app)
            .get(`/api/v1/mortuary/corpses/${testCorpseId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.corpseNumber).toBe(testCorpseNumber);
        expect(res.body.data.propertyItems.length).toBe(2);
        expect(res.body.data.propertyItems[0].item).toBe("Gold signet ring");
    });

    // -------------------------------------------------------------
    // Autopsy & Post-Mortem Examination
    // -------------------------------------------------------------
    test("9. POST /api/v1/mortuary/autopsies schedules clinical post-mortem examination (AUT-YYYY-XXXXXX)", async () => {
        const payload = {
            corpseId: testCoronerCorpseId,
            autopsyType: "MEDICO_LEGAL_CORONER",
            leadPathologist: "Prof. Kofi Antwi (Consultant Forensic Pathologist)",
            assistingTechnician: "Tech Boateng",
            scheduledDate: "2026-10-31T09:00:00.000Z"
        };

        const res = await request(app)
            .post("/api/v1/mortuary/autopsies")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.data.autopsyNumber).toMatch(/^AUT-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("SCHEDULED");

        testAutopsyId = res.body.data.id;

        // Verify corpse status updated to AUTOPSY_IN_PROGRESS
        const corpseCheck = await prisma.corpseRecord.findUnique({ where: { id: testCoronerCorpseId } });
        expect(corpseCheck.status).toBe("AUTOPSY_IN_PROGRESS");
    });

    test("10. POST /api/v1/mortuary/autopsies/:id/complete documents pathologist findings, toxicology specimens, and coroner approval", async () => {
        const payload = {
            externalFindings: "Multiple blunt force abrasions and compound parietal skull fracture consistent with vehicular impact.",
            internalFindings: "Subdural hematoma (180 mL), basal skull fracture, cerebral contusions. Heart and thoracic organs intact.",
            finalPostMortemDiagnosis: "Severe Traumatic Brain Injury secondary to pedestrian motor vehicle collision.",
            toxicologySamplesTaken: true,
            histopathologySamplesTaken: true,
            coronerApprovalIssued: true,
            coronerOfficerName: "Coroner Magistrate Justice Addo"
        };

        const res = await request(app)
            .post(`/api/v1/mortuary/autopsies/${testAutopsyId}/complete`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("COMPLETED");
        expect(res.body.data.toxicologySamplesTaken).toBe(true);
        expect(res.body.data.coronerApprovalIssued).toBe(true);

        // Verify corpse is now coroner cleared and READY_FOR_RELEASE
        const corpseCheck = await prisma.corpseRecord.findUnique({ where: { id: testCoronerCorpseId } });
        expect(corpseCheck.isCoronerCleared).toBe(true);
        expect(corpseCheck.status).toBe("READY_FOR_RELEASE");
    });

    // -------------------------------------------------------------
    // Deceased Family Release & Handover Protocol
    // -------------------------------------------------------------
    test("11. POST /api/v1/mortuary/releases blocks release if Next-of-Kin credentials or legal clearance are missing", async () => {
        // Try releasing without Next-of-Kin National ID
        const res = await request(app)
            .post("/api/v1/mortuary/releases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                corpseId: testCorpseId,
                nextOfKinName: "Yaa Darko"
                // Missing nextOfKinNationalId and relationshipToDeceased
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain("Release Protocol Violation");
    });

    test("12. POST /api/v1/mortuary/releases authorizes deceased release clearance (REL-YYYY-XXXXXX), co-signs handover, and frees chamber", async () => {
        const payload = {
            corpseId: testCorpseId,
            nextOfKinName: "Yaa Darko",
            nextOfKinPhone: "+233244889900",
            nextOfKinNationalId: "GHA-123456789-1",
            relationshipToDeceased: "Daughter (Eldest Child)",
            funeralHomeOrUndertaker: "Transitions Funeral Home (Accra)",
            hearseVehiclePlate: "GW-512-26",
            releasingOfficer: "Seth Mensah (Chief Mortuary Officer)",
            burialPermitNumber: "BP-AMA-2026-9812",
            notes: "Body inspected and confirmed by family. Property bag BAG-2026-001 and BAG-2026-002 intact and handed over."
        };

        const res = await request(app)
            .post("/api/v1/mortuary/releases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.data.releaseNumber).toMatch(/^REL-\d{4}-\d{6}$/);
        expect(res.body.data.handoverSignatureConfirmed).toBe(true);
        expect(res.body.data.billingSettled).toBe(true);

        testReleaseId = res.body.data.id;

        // Verify corpse status updated to RELEASED_TO_FAMILY and unlinked from chamber
        const corpseCheck = await prisma.corpseRecord.findUnique({ where: { id: testCorpseId } });
        expect(corpseCheck.status).toBe("RELEASED_TO_FAMILY");
        expect(corpseCheck.chamberId).toBeNull();

        // Verify chamber occupancy decremented back to 0
        const chamberCheck = await prisma.mortuaryChamber.findUnique({ where: { id: testChamberId } });
        expect(chamberCheck.occupiedCount).toBe(0);
    });

    // -------------------------------------------------------------
    // Real-Time Mortuary Command Center Telemetry
    // -------------------------------------------------------------
    test("13. GET /api/v1/mortuary/stats returns real-time Mortuary Command Center telemetry", async () => {
        const res = await request(app)
            .get("/api/v1/mortuary/stats")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.summary).toBeDefined();
        expect(res.body.data.chamberOccupancy).toBeDefined();
        expect(res.body.data.chambersTelemetry).toBeDefined();
        expect(typeof res.body.data.summary.totalBodiesAdmitted).toBe("number");
        expect(typeof res.body.data.chamberOccupancy.occupancyPercentage).toBe("number");
    });
});
