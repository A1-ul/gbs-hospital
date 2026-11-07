"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 10 INTEGRATION TEST SUITE: BILLING, INVOICING, NHIS & CLAIMS
Zero Fake/Mock Data - Real PostgreSQL 16 Persistence
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 10: Billing, Invoicing, NHIS Integration, Insurance Claims & Financial Subsystem", () => {
    let devToken;
    let accountantToken;
    let accountantUser;
    let receptionistToken;
    let testHospital;
    let cashPatient;
    let nhisPatient;
    let cashEncounter;
    let nhisEncounter;
    let cashBillId;
    let cashBillNumber;
    let nhisBillId;
    let nhisBillNumber;
    let autoEncounterBillId;
    let generatedClaimId;

    const uniqueId = Date.now();
    const accountantEmail = `accountant_${uniqueId}@gbs.com`;
    const receptionistEmail = `reception_${uniqueId}@gbs.com`;

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
                    name: "GBS Central Memorial Hospital",
                    code: "GBS-FIN-01",
                    email: "finance@gbshospital.com",
                    phone: "+233200000004",
                    address: "Finance Building, Cantonments, Accra",
                    city: "Accra",
                    region: "Greater Accra",
                    country: "Ghana"
                }
            });
        }
        expect(testHospital).toBeDefined();

        // 3. Create and approve Accountant user
        const acctSignup = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                email: accountantEmail,
                password: "Password123!",
                firstName: "Kwabena",
                lastName: "Adu-Accountant",
                role: "ACCOUNTANT"
            });
        expect(acctSignup.status).toBe(201);
        const acctId = acctSignup.body.data.id;

        const approveAcct = await request(app)
            .patch(`/api/v1/users/${acctId}/approve`)
            .set("Authorization", `Bearer ${devToken}`);
        expect(approveAcct.status).toBe(200);

        const acctLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: accountantEmail,
                password: "Password123!"
            });
        expect(acctLogin.status).toBe(200);
        accountantToken = acctLogin.body.data.token;
        accountantUser = acctLogin.body.data.user;
        expect(accountantToken).toBeDefined();

        // 4. Create and approve Receptionist/Cashier user
        const recepSignup = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                email: receptionistEmail,
                password: "Password123!",
                firstName: "Abena",
                lastName: "Ofori-Cashier",
                role: "RECEPTIONIST"
            });
        expect(recepSignup.status).toBe(201);
        const recepId = recepSignup.body.data.id;

        const approveRecep = await request(app)
            .patch(`/api/v1/users/${recepId}/approve`)
            .set("Authorization", `Bearer ${devToken}`);
        expect(approveRecep.status).toBe(200);

        const recepLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: receptionistEmail,
                password: "Password123!"
            });
        expect(recepLogin.status).toBe(200);
        receptionistToken = recepLogin.body.data.token;
        expect(receptionistToken).toBeDefined();

        // 5. Register Cash Patient (No NHIS)
        cashPatient = await prisma.patient.create({
            data: {
                hospitalId: testHospital.id,
                patientNumber: `MRN-CSH-${uniqueId}`,
                firstName: "Kweku",
                lastName: "Frimpong-Cash",
                dateOfBirth: new Date("1990-06-15"),
                gender: "MALE",
                phone: `+23324${String(uniqueId).slice(-7)}`
            }
        });
        expect(cashPatient).toBeDefined();

        // 6. Register NHIS Patient (With NHIS Number)
        nhisPatient = await prisma.patient.create({
            data: {
                hospitalId: testHospital.id,
                patientNumber: `MRN-NHS-${uniqueId}`,
                firstName: "Akua",
                lastName: "Serwaa-NHIS",
                dateOfBirth: new Date("1988-11-20"),
                gender: "FEMALE",
                phone: `+23320${String(uniqueId).slice(-7)}`,
                nhisNumber: `NHIS-GH-778899-${uniqueId}`
            }
        });
        expect(nhisPatient).toBeDefined();

        // 7. Open Encounters for testing
        cashEncounter = await prisma.patientEncounter.create({
            data: {
                hospitalId: testHospital.id,
                patientId: cashPatient.id,
                encounterNumber: `ENC-CSH-${uniqueId}`,
                encounterType: "OUTPATIENT",
                status: "OPEN",
                chiefComplaint: "General body pains and mild malaria symptoms"
            }
        });

        nhisEncounter = await prisma.patientEncounter.create({
            data: {
                hospitalId: testHospital.id,
                patientId: nhisPatient.id,
                encounterNumber: `ENC-NHS-${uniqueId}`,
                encounterType: "OUTPATIENT",
                status: "OPEN",
                chiefComplaint: "Ante-natal checkup and routine lab tests"
            }
        });

        // Add dummy consultation, prescription, and lab to nhisEncounter for auto-aggregation test
        await prisma.patientConsultation.create({
            data: {
                encounterId: nhisEncounter.id,
                consultationType: "GENERAL",
                history: "Routine prenatal review",
                examination: "BP 118/76, FHR 142 bpm",
                assessment: "Healthy pregnancy at 28 weeks",
                plan: "Continue iron supplements, routine FBC check"
            }
        });

        await prisma.laboratoryRequest.create({
            data: {
                encounterId: nhisEncounter.id,
                testName: "Full Blood Count (FBC)",
                testCode: "LAB-FBC",
                department: "Hematology",
                priority: "ROUTINE",
                status: "REQUESTED"
            }
        });
    });

    afterAll(async () => {
        // Clean up Phase 10 test records safely
        if (cashPatient) {
            await prisma.patientPayment.deleteMany({
                where: { bill: { patientId: cashPatient.id } }
            });
            await prisma.insuranceClaim.deleteMany({
                where: { patientId: cashPatient.id }
            });
            await prisma.billItem.deleteMany({
                where: { bill: { patientId: cashPatient.id } }
            });
            await prisma.patientBill.deleteMany({
                where: { patientId: cashPatient.id }
            });
            if (cashEncounter) {
                await prisma.patientEncounter.delete({
                    where: { id: cashEncounter.id }
                }).catch(() => {});
            }
            await prisma.patient.delete({
                where: { id: cashPatient.id }
            }).catch(() => {});
        }

        if (nhisPatient) {
            await prisma.patientPayment.deleteMany({
                where: { bill: { patientId: nhisPatient.id } }
            });
            await prisma.insuranceClaim.deleteMany({
                where: { patientId: nhisPatient.id }
            });
            await prisma.billItem.deleteMany({
                where: { bill: { patientId: nhisPatient.id } }
            });
            await prisma.patientBill.deleteMany({
                where: { patientId: nhisPatient.id }
            });
            if (nhisEncounter) {
                await prisma.patientConsultation.deleteMany({
                    where: { encounterId: nhisEncounter.id }
                });
                await prisma.laboratoryRequest.deleteMany({
                    where: { encounterId: nhisEncounter.id }
                });
                await prisma.patientEncounter.delete({
                    where: { id: nhisEncounter.id }
                }).catch(() => {});
            }
            await prisma.patient.delete({
                where: { id: nhisPatient.id }
            }).catch(() => {});
        }

        await prisma.user.deleteMany({
            where: { email: { in: [accountantEmail, receptionistEmail] } }
        }).catch(() => {});
    });

    // Test 1: Seed Billing Tariff Catalog
    test("1. POST /api/v1/billing/tariffs/seed - Seed standard hospital tariffs & fee schedules", async () => {
        const res = await request(app)
            .post("/api/v1/billing/tariffs/seed")
            .set("Authorization", `Bearer ${devToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);

        const consTariff = res.body.data.find(t => t.code === "TARIFF-CONS-GEN");
        expect(consTariff).toBeDefined();
        expect(parseFloat(consTariff.standardCashPrice)).toBe(50.00);
    });

    // Test 2: Generate Cash Patient Bill
    test("2. POST /api/v1/billing/bills - Create cash patient invoice with sequential INV-YYYY-XXXXXX", async () => {
        const res = await request(app)
            .post("/api/v1/billing/bills")
            .set("Authorization", `Bearer ${accountantToken}`)
            .send({
                encounterId: cashEncounter.id,
                payorType: "CASH",
                items: [
                    {
                        category: "CONSULTATION",
                        serviceCode: "TARIFF-CONS-GEN",
                        serviceName: "General OPD Consultation",
                        unitPrice: 50.00,
                        quantity: 1
                    },
                    {
                        category: "PHARMACY",
                        serviceCode: "MED-ACT",
                        serviceName: "Artemether-Lumefantrine 20/120mg",
                        unitPrice: 40.00,
                        quantity: 1
                    },
                    {
                        category: "PHARMACY",
                        serviceCode: "MED-PCM",
                        serviceName: "Paracetamol 500mg Tablets",
                        unitPrice: 10.00,
                        quantity: 2
                    }
                ],
                description: "Cash outpatient bill for acute malaria treatment"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBeDefined();
        expect(res.body.data.billNumber).toMatch(/^INV-\d{4}-\d{6}$/);
        expect(parseFloat(res.body.data.grossAmount)).toBe(110.00); // 50 + 40 + (10 * 2)
        expect(parseFloat(res.body.data.patientPayableAmount)).toBe(110.00);
        expect(parseFloat(res.body.data.balanceDue)).toBe(110.00);
        expect(res.body.data.paymentStatus).toBe("UNPAID");
        expect(res.body.data.items.length).toBe(3);

        cashBillId = res.body.data.id;
        cashBillNumber = res.body.data.billNumber;
    });

    // Test 3: Generate NHIS Multi-Payor Split Bill
    test("3. POST /api/v1/billing/bills - Create NHIS bill with copay deductions & auto-staged claim", async () => {
        const res = await request(app)
            .post("/api/v1/billing/bills")
            .set("Authorization", `Bearer ${accountantToken}`)
            .send({
                encounterId: nhisEncounter.id,
                payorType: "NHIS",
                items: [
                    {
                        category: "CONSULTATION",
                        serviceCode: "TARIFF-CONS-GEN",
                        serviceName: "General OPD Consultation",
                        unitPrice: 50.00,
                        quantity: 1,
                        nhisCovered: true,
                        nhisRate: 35.00
                    },
                    {
                        category: "LABORATORY",
                        serviceCode: "LAB-FBC",
                        serviceName: "Full Blood Count (FBC)",
                        unitPrice: 45.00,
                        quantity: 1,
                        nhisCovered: true,
                        nhisRate: 35.00
                    },
                    {
                        category: "PHARMACY",
                        serviceCode: "MED-IRON",
                        serviceName: "Ferrous Sulfate 200mg + Folic Acid",
                        unitPrice: 25.00,
                        quantity: 1,
                        nhisCovered: true,
                        nhisRate: 20.00
                    }
                ]
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.billNumber).toMatch(/^INV-\d{4}-\d{6}$/);
        expect(parseFloat(res.body.data.grossAmount)).toBe(120.00); // 50 + 45 + 25
        expect(parseFloat(res.body.data.nhisCoveredAmount)).toBe(90.00); // 35 + 35 + 20
        expect(parseFloat(res.body.data.patientPayableAmount)).toBe(30.00); // Copay balance
        expect(parseFloat(res.body.data.balanceDue)).toBe(30.00);

        // Verify InsuranceClaim was automatically staged
        expect(res.body.data.claims).toBeDefined();
        expect(res.body.data.claims.length).toBeGreaterThan(0);
        expect(res.body.data.claims[0].claimNumber).toMatch(/^CLM-\d{4}-\d{6}$/);
        expect(parseFloat(res.body.data.claims[0].claimedAmount)).toBe(90.00);

        nhisBillId = res.body.data.id;
        nhisBillNumber = res.body.data.billNumber;
        generatedClaimId = res.body.data.claims[0].id;
    });

    // Test 4: Validation Guard: Reject Missing Line Items or Missing Encounter
    test("4. POST /api/v1/billing/bills - Validation guard rejects missing encounter ID (400)", async () => {
        const res = await request(app)
            .post("/api/v1/billing/bills")
            .set("Authorization", `Bearer ${accountantToken}`)
            .send({
                items: [{ serviceName: "Bandage", unitPrice: 10, quantity: 1 }]
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("MISSING_ENCOUNTER_ID");
    });

    // Test 5: Auto-Aggregate Bill from Clinical Encounter
    test("5. POST /api/v1/billing/encounters/:id/generate-bill - Automatically compile unbilled encounter charges", async () => {
        const res = await request(app)
            .post(`/api/v1/billing/encounters/${nhisEncounter.id}/generate-bill`)
            .set("Authorization", `Bearer ${accountantToken}`)
            .send({
                payorType: "NHIS"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.billNumber).toMatch(/^INV-\d{4}-\d{6}$/);
        expect(res.body.data.items.length).toBeGreaterThanOrEqual(2); // Consultation + Lab
        autoEncounterBillId = res.body.data.id;
    });

    // Test 6: Query Bills Worklist with Filters
    test("6. GET /api/v1/billing/bills - Query bills filtered by paymentStatus=UNPAID", async () => {
        const res = await request(app)
            .get("/api/v1/billing/bills?paymentStatus=UNPAID")
            .set("Authorization", `Bearer ${accountantToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);

        const found = res.body.data.find(b => b.id === cashBillId);
        expect(found).toBeDefined();
        expect(found.paymentStatus).toBe("UNPAID");
    });

    // Test 7: Retrieve Single Bill Dossier by ID
    test("7. GET /api/v1/billing/bills/:id - Retrieve complete invoice dossier with items & breakdown", async () => {
        const res = await request(app)
            .get(`/api/v1/billing/bills/${cashBillId}`)
            .set("Authorization", `Bearer ${accountantToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(cashBillId);
        expect(res.body.data.billNumber).toBe(cashBillNumber);
        expect(res.body.data.encounter).toBeDefined();
        expect(res.body.data.items.length).toBe(3);
    });

    // Test 8: Process Partial Cash Payment
    test("8. POST /api/v1/billing/bills/:id/pay - Cashier processes partial payment and issues receipt", async () => {
        const res = await request(app)
            .post(`/api/v1/billing/bills/${cashBillId}/pay`)
            .set("Authorization", `Bearer ${receptionistToken}`)
            .send({
                amount: 60.00,
                paymentMethod: "CASH",
                notes: "Partial cash payment deposit"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.payment).toBeDefined();
        expect(res.body.data.payment.receiptNumber).toMatch(/^REC-\d{4}-\d{6}$/);
        expect(parseFloat(res.body.data.payment.amount)).toBe(60.00);

        // Verify updated bill state: 110 - 60 = 50 remaining
        expect(res.body.data.bill.paymentStatus).toBe("PARTIALLY_PAID");
        expect(parseFloat(res.body.data.bill.paidAmount)).toBe(60.00);
        expect(parseFloat(res.body.data.bill.balanceDue)).toBe(50.00);
    });

    // Test 9: Process Final Balance Settlement (Full Payment via MoMo)
    test("9. POST /api/v1/billing/bills/:id/pay - Settle remaining balance via Mobile Money to reach PAID status", async () => {
        const res = await request(app)
            .post(`/api/v1/billing/bills/${cashBillId}/pay`)
            .set("Authorization", `Bearer ${receptionistToken}`)
            .send({
                amount: 50.00,
                paymentMethod: "MOBILE_MONEY",
                paymentReference: `MTN-MOMO-TX-${uniqueId}`,
                notes: "Final balance settled via MTN MoMo"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.payment.receiptNumber).toMatch(/^REC-\d{4}-\d{6}$/);
        expect(res.body.data.payment.paymentMethod).toBe("MOBILE_MONEY");
        expect(res.body.data.payment.paymentReference).toContain("MTN-MOMO-TX");

        // Verify bill is now fully settled
        expect(res.body.data.bill.paymentStatus).toBe("PAID");
        expect(parseFloat(res.body.data.bill.paidAmount)).toBe(110.00);
        expect(parseFloat(res.body.data.bill.balanceDue)).toBe(0.00);
    });

    // Test 10: Duplicate / Overpayment Guard: Reject payment on fully settled bill
    test("10. POST /api/v1/billing/bills/:id/pay - Reject payment attempt on fully paid bill (400)", async () => {
        const res = await request(app)
            .post(`/api/v1/billing/bills/${cashBillId}/pay`)
            .set("Authorization", `Bearer ${receptionistToken}`)
            .send({
                amount: 10.00,
                paymentMethod: "CASH"
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("BILL_ALREADY_PAID");
    });

    // Test 11: Pay NHIS Patient Copay
    test("11. POST /api/v1/billing/bills/:id/pay - Settle NHIS patient copay balance via Card", async () => {
        const res = await request(app)
            .post(`/api/v1/billing/bills/${nhisBillId}/pay`)
            .set("Authorization", `Bearer ${receptionistToken}`)
            .send({
                amount: 30.00,
                paymentMethod: "BANK_CARD",
                paymentReference: `POS-VISA-AUTH-${uniqueId}`
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.bill.paymentStatus).toBe("PAID");
        expect(parseFloat(res.body.data.bill.balanceDue)).toBe(0.00);
    });

    // Test 12: Insurance Claim Adjudication & Settlement
    test("12. PATCH /api/v1/billing/claims/:id/status - Adjudicate and settle NHIS insurance claim", async () => {
        const res = await request(app)
            .patch(`/api/v1/billing/claims/${generatedClaimId}/status`)
            .set("Authorization", `Bearer ${accountantToken}`)
            .send({
                status: "SETTLED",
                approvedAmount: 90.00,
                notes: "NHIS Electronic claims portal confirmed electronic remittance payment"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("SETTLED");
        expect(parseFloat(res.body.data.approvedAmount)).toBe(90.00);
        expect(res.body.data.settledAt).toBeDefined();
    });

    // Test 13: Finance Command Center & Accountant Telemetry
    test("13. GET /api/v1/billing/telemetry - Retrieve real-time accounting and revenue telemetry", async () => {
        const res = await request(app)
            .get("/api/v1/billing/telemetry")
            .set("Authorization", `Bearer ${accountantToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.totalInvoicedToday).toBeGreaterThan(0);
        expect(res.body.data.totalPaidToday).toBeGreaterThanOrEqual(140.00); // 110 + 30
        expect(res.body.data.paymentMethodsBreakdown).toBeDefined();
        expect(res.body.data.paymentMethodsBreakdown["CASH"]).toBeDefined();
        expect(res.body.data.paymentMethodsBreakdown["MOBILE_MONEY"]).toBeDefined();
        expect(res.body.data.paymentMethodsBreakdown["BANK_CARD"]).toBeDefined();
        expect(res.body.data.accountingHealth.generalLedgerSynced).toBe(true);
    });

    // Test 14: RBAC Security Guard: Reject Unauthenticated Access
    test("14. GET /api/v1/billing/bills - Reject unauthenticated access (401)", async () => {
        const res = await request(app)
            .get("/api/v1/billing/bills");

        expect(res.status).toBe(401);
    });
});
