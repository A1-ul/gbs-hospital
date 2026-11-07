"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 7 INTEGRATION TEST SUITE: PHARMACY, INVENTORY & DISPENSING
Zero Fake/Mock Data - Real PostgreSQL 16 Persistence
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 7: Enterprise Pharmacy, Batch Tracking, FEFO Dispensing & Telemetry", () => {
    let devToken;
    let pharmacistToken;
    let testHospital;
    let testPatient;
    let testEncounter;
    let testPrescriptionId;
    let catalogedItemId;
    let batch1Number;
    let batch2Number;

    const uniqueId = Date.now();
    const pharmacistEmail = `pharmacist_${uniqueId}@gbs.com`;
    const medicationName = `Amoxicillin 500mg Caps_${uniqueId}`;

    beforeAll(async () => {
        // 1. Get developer token (Admin123)
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
                    name: "GBS Central Hospital",
                    code: "GBS001",
                    email: "central@gbshospital.com",
                    phone: "+233200000001",
                    address: "Main Campus, Accra",
                    city: "Accra",
                    region: "Greater Accra",
                    country: "Ghana"
                }
            });
        }
        expect(testHospital).toBeDefined();

        // 3. Create Pharmacist user and approve
        const pharmSignup = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                email: pharmacistEmail,
                password: "Password123!",
                firstName: "Kofi",
                lastName: "Mensah-Pharm",
                role: "PHARMACIST"
            });
        expect(pharmSignup.status).toBe(201);
        const pharmId = pharmSignup.body.data.id;

        const approveRes = await request(app)
            .patch(`/api/v1/users/${pharmId}/approve`)
            .set("Authorization", `Bearer ${devToken}`);
        expect(approveRes.status).toBe(200);

        const pharmLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: pharmacistEmail,
                password: "Password123!"
            });
        expect(pharmLogin.status).toBe(200);
        pharmacistToken = pharmLogin.body.data.token;
        expect(pharmacistToken).toBeDefined();

        // 4. Register real test Patient
        const patientRes = await request(app)
            .post("/api/v1/patients/register")
            .set("Authorization", `Bearer ${devToken}`)
            .send({
                hospitalId: testHospital.id,
                firstName: "Akua",
                lastName: `Adomah_${uniqueId}`,
                gender: "FEMALE",
                dateOfBirth: "1988-04-12",
                phone: `+23324${String(uniqueId).slice(-7)}`,
                bloodGroup: "O_POSITIVE",
                genotype: "AA"
            });
        expect(patientRes.status).toBe(201);
        testPatient = patientRes.body.data.patient;

        // 5. Check in patient at OPD
        const checkinRes = await request(app)
            .post("/api/v1/clinical/opd/check-in")
            .set("Authorization", `Bearer ${devToken}`)
            .send({
                hospitalId: testHospital.id,
                patientId: testPatient.id,
                department: "GENERAL_OPD",
                priority: "PRIORITY",
                chiefComplaint: "Severe fever, sore throat and dry cough"
            });
        expect(checkinRes.status).toBe(201);
        testEncounter = checkinRes.body.data.encounter;

        // 6. Record Doctor consultation with e-prescription
        const consultRes = await request(app)
            .post(`/api/v1/clinical/encounters/${testEncounter.id}/consultation`)
            .set("Authorization", `Bearer ${devToken}`)
            .send({
                history: "Patient presents with acute pharyngitis and fever.",
                examination: "Erythematous pharynx with follicular tonsillar exudates.",
                assessment: "Acute streptococcal pharyngitis (ICD-10 J02.0)",
                plan: "Initiate oral antibacterial therapy and supportive analgesia.",
                diagnoses: [
                    { diagnosisCode: "J02.0", diagnosisName: "Streptococcal pharyngitis", diagnosisType: "PRIMARY" }
                ],
                prescriptions: [
                    {
                        medicationName: medicationName,
                        dosage: "500mg",
                        frequency: "TDS",
                        duration: "5 days",
                        instructions: "Take 1 capsule 3 times daily with water after meals"
                    }
                ]
            });
        expect(consultRes.status).toBe(201);
        testPrescriptionId = consultRes.body.data.prescriptions[0].id;
        expect(testPrescriptionId).toBeDefined();
    });

    afterAll(async () => {
        try {
            if (testPrescriptionId) {
                await prisma.prescriptionDispenseItem.deleteMany({
                    where: { dispense: { prescriptionId: testPrescriptionId } }
                });
                await prisma.prescriptionDispense.deleteMany({
                    where: { prescriptionId: testPrescriptionId }
                });
                await prisma.patientPrescription.deleteMany({
                    where: { id: testPrescriptionId }
                });
            }
            if (catalogedItemId) {
                await prisma.pharmacyStockMovement.deleteMany({
                    where: { itemId: catalogedItemId }
                });
                await prisma.pharmacyBatch.deleteMany({
                    where: { itemId: catalogedItemId }
                });
                await prisma.pharmacyInventory.deleteMany({
                    where: { itemId: catalogedItemId }
                });
                await prisma.pharmacyItem.deleteMany({
                    where: { id: catalogedItemId }
                });
            }
            if (testEncounter) {
                await prisma.patientDiagnosis.deleteMany({ where: { encounterId: testEncounter.id } });
                await prisma.patientConsultation.deleteMany({ where: { encounterId: testEncounter.id } });
                await prisma.opdQueueTicket.deleteMany({ where: { encounterId: testEncounter.id } });
                await prisma.patientEncounter.deleteMany({ where: { id: testEncounter.id } });
            }
            if (testPatient) {
                await prisma.medicalFolder.deleteMany({ where: { patientId: testPatient.id } });
                await prisma.patient.deleteMany({ where: { id: testPatient.id } });
            }
            await prisma.user.deleteMany({
                where: { email: pharmacistEmail }
            });
        } catch (err) {
            // Ignore teardown cleanup errors
        }
    });

    test("1. Pharmacist catalogs a new medication item in the hospital formulary", async () => {
        const res = await request(app)
            .post("/api/v1/pharmacy/items")
            .set("Authorization", `Bearer ${pharmacistToken}`)
            .send({
                name: medicationName,
                genericName: "Amoxicillin Trihydrate",
                brandName: "Amoxil",
                dosageForm: "CAPSULE",
                strength: "500mg",
                category: "ANTIBIOTIC",
                unitPrice: 3.50,
                reorderLevel: 25,
                hospitalId: testHospital.id
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.itemCode).toMatch(/^MED-\d{4}-\d{6}$/);
        expect(res.body.data.name).toBe(medicationName);
        expect(res.body.data.unitPrice).toBe(3.50);
        expect(res.body.data.reorderLevel).toBe(25);

        catalogedItemId = res.body.data.id;

        // Verify inventory record was initialized with 0 units
        const inv = await prisma.pharmacyInventory.findFirst({
            where: { itemId: catalogedItemId }
        });
        expect(inv).toBeDefined();
        expect(inv.quantity).toBe(0);
        expect(inv.availableQuantity).toBe(0);
    });

    test("2. Rejects duplicate medication registration with 409 DUPLICATE_PHARMACY_ITEM", async () => {
        const res = await request(app)
            .post("/api/v1/pharmacy/items")
            .set("Authorization", `Bearer ${pharmacistToken}`)
            .send({
                name: medicationName,
                hospitalId: testHospital.id
            });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("DUPLICATE_PHARMACY_ITEM");
    });

    test("3. Queries pharmacy formulary items with search filter", async () => {
        const res = await request(app)
            .get(`/api/v1/pharmacy/items?search=${encodeURIComponent(medicationName)}`)
            .set("Authorization", `Bearer ${pharmacistToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);

        const found = res.body.data.find(it => it.id === catalogedItemId);
        expect(found).toBeDefined();
        expect(found.stock.totalQuantity).toBe(0);
        expect(found.stock.isOutOfStock).toBe(true);
        expect(found.stock.isLowStock).toBe(true);
    });

    test("4. Receives Batch 1 delivery (longer expiry: 365 days)", async () => {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 365);

        const res = await request(app)
            .post("/api/v1/pharmacy/batches")
            .set("Authorization", `Bearer ${pharmacistToken}`)
            .send({
                itemId: catalogedItemId,
                quantity: 50,
                expiryDate: expiryDate.toISOString(),
                unitCost: 1.80,
                supplier: "Ernest Chemists Wholesale Ghana",
                notes: "Standard monthly replenishment delivery"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.batch.batchNumber).toMatch(/^BAT-\d{4}-\d{6}$/);
        expect(res.body.data.batch.quantity).toBe(50);
        expect(res.body.data.inventory.totalQuantity).toBe(50);
        expect(res.body.data.inventory.availableQuantity).toBe(50);

        batch1Number = res.body.data.batch.batchNumber;
    });

    test("5. Receives Batch 2 delivery (shorter expiry: 45 days) for FEFO prioritization", async () => {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 45); // Expires in 45 days (earlier than Batch 1)

        const res = await request(app)
            .post("/api/v1/pharmacy/batches")
            .set("Authorization", `Bearer ${pharmacistToken}`)
            .send({
                itemId: catalogedItemId,
                quantity: 30,
                expiryDate: expiryDate.toISOString(),
                unitCost: 1.50,
                supplier: "Tobinco Pharmaceuticals Ltd",
                notes: "Urgent short-dated batch"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.batch.quantity).toBe(30);
        expect(res.body.data.inventory.totalQuantity).toBe(80); // 50 + 30
        expect(res.body.data.inventory.availableQuantity).toBe(80);

        batch2Number = res.body.data.batch.batchNumber;
    });

    test("6. Adjusts inventory stock with audit logging (removes 5 damaged units)", async () => {
        const res = await request(app)
            .post("/api/v1/pharmacy/stock/adjust")
            .set("Authorization", `Bearer ${pharmacistToken}`)
            .send({
                itemId: catalogedItemId,
                adjustmentType: "DAMAGED",
                quantity: 5,
                batchNumber: batch1Number,
                reason: "5 capsules cracked during shelf stocking"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.balanceAfter).toBe(75); // 80 - 5 = 75
    });

    test("7. Retrieves pending prescriptions waiting for pharmacy fulfillment", async () => {
        const res = await request(app)
            .get("/api/v1/pharmacy/prescriptions/pending")
            .set("Authorization", `Bearer ${pharmacistToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);

        const target = res.body.data.find(rx => rx.prescriptionId === testPrescriptionId);
        expect(target).toBeDefined();
        expect(target.medicationName).toBe(medicationName);
        expect(target.patient.name).toBe(`Akua Adomah_${uniqueId}`);
        expect(target.status).toBe("PENDING");
    });

    test("8. Executes FEFO prescription dispensing and decrements earlier expiring batch first", async () => {
        const res = await request(app)
            .post(`/api/v1/pharmacy/prescriptions/${testPrescriptionId}/dispense`)
            .set("Authorization", `Bearer ${pharmacistToken}`)
            .send({
                quantityToDispense: 15,
                counselingNotes: "Take 1 capsule three times daily for 5 full days. Do not skip doses.",
                paymentStatus: "PAID"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.dispenseNumber).toMatch(/^DSP-\d{4}-\d{6}$/);
        expect(res.body.data.prescriptionStatus).toBe("DISPENSED");
        expect(res.body.data.quantityDispensed).toBe(15);
        expect(res.body.data.totalAmount).toBe(15 * 3.50); // 52.50
        expect(res.body.data.remainingStock).toBe(60); // 75 - 15 = 60

        // Verify FEFO: Batch 2 (45 days expiry) should be used first
        const batchUsed = res.body.data.batchesUsed[0];
        expect(batchUsed.batchNumber).toBe(batch2Number);
        expect(batchUsed.quantity).toBe(15);

        // Verify database audit movement was recorded
        const movement = await prisma.pharmacyStockMovement.findFirst({
            where: {
                itemId: catalogedItemId,
                movementType: "DISPENSE"
            },
            orderBy: { createdAt: "desc" }
        });
        expect(movement).toBeDefined();
        expect(movement.quantity).toBe(-15);
        expect(movement.balanceAfter).toBe(60);
    });

    test("9. Rejects duplicate dispensing of already fulfilled prescription with 409", async () => {
        const res = await request(app)
            .post(`/api/v1/pharmacy/prescriptions/${testPrescriptionId}/dispense`)
            .set("Authorization", `Bearer ${pharmacistToken}`)
            .send({
                quantityToDispense: 15
            });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("PRESCRIPTION_ALREADY_DISPENSED");
    });

    test("10. Rejects dispensing when requested quantity exceeds available stock with 409 INSUFFICIENT_STOCK", async () => {
        // Create another consultation prescription
        const consult2 = await request(app)
            .post(`/api/v1/clinical/encounters/${testEncounter.id}/consultation`)
            .set("Authorization", `Bearer ${devToken}`)
            .send({
                history: "Follow-up consultation",
                assessment: "Infection follow-up",
                plan: "Heavy course",
                prescriptions: [
                    {
                        medicationName: medicationName,
                        dosage: "500mg",
                        frequency: "BD",
                        duration: "30 days"
                    }
                ]
            });
        expect(consult2.status).toBe(201);
        const secondRxId = consult2.body.data.prescriptions[0].id;

        // Try to dispense 1000 units when only 60 are in stock
        const res = await request(app)
            .post(`/api/v1/pharmacy/prescriptions/${secondRxId}/dispense`)
            .set("Authorization", `Bearer ${pharmacistToken}`)
            .send({
                quantityToDispense: 1000
            });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");

        // Clean up second rx
        await prisma.patientPrescription.delete({ where: { id: secondRxId } });
    });

    test("11. Retrieves dispense audit history with patient and item details", async () => {
        const res = await request(app)
            .get("/api/v1/pharmacy/dispenses")
            .set("Authorization", `Bearer ${pharmacistToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);

        const latestDispense = res.body.data[0];
        expect(latestDispense.dispenseNumber).toMatch(/^DSP-\d{4}-\d{6}$/);
        expect(latestDispense.patient).toBeDefined();
        expect(latestDispense.items.length).toBeGreaterThanOrEqual(1);
    });

    test("12. Expiry alert engine detects near-expiry batches (Batch 2 expiring in 45 days)", async () => {
        const res = await request(app)
            .get("/api/v1/pharmacy/alerts/expiry?days=60")
            .set("Authorization", `Bearer ${pharmacistToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);

        const alert = res.body.data.find(b => b.batchNumber === batch2Number);
        expect(alert).toBeDefined();
        expect(alert.itemName).toBe(medicationName);
        expect(alert.riskLevel).toBe("WARNING_60_DAYS");
        expect(alert.daysRemaining).toBeLessThanOrEqual(60);
    });

    test("13. Pharmacist dashboard telemetry aggregates real-time metrics and authentic theme metadata", async () => {
        const res = await request(app)
            .get("/api/v1/pharmacy/dashboard/telemetry")
            .set("Authorization", `Bearer ${pharmacistToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const { operationalStats, themeMetadata } = res.body.data;
        expect(operationalStats.totalFormularyItems).toBeGreaterThanOrEqual(1);
        expect(operationalStats.totalStockUnits).toBeGreaterThanOrEqual(60);
        expect(operationalStats.dispensedTodayCount).toBeGreaterThanOrEqual(1);
        expect(operationalStats.totalDispenseRevenueToday).toBeGreaterThanOrEqual(52.50);

        expect(themeMetadata.role).toBe("PHARMACIST");
        expect(themeMetadata.heroImage).toBe("/assets/images/roles/pharmacist_dispensary_hero.jpg");
        expect(themeMetadata.icon).toBe("/assets/images/icons/medication_pill_icon.png");
        expect(themeMetadata.colorPalette.primary).toBe("#059669");
    });
});
