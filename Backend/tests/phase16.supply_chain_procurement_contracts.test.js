"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 16 INTEGRATION TEST SUITE
Supply Chain, Procurement, Vendor Contracts, Purchase Orders,
Goods Receipt Notes (GRN) & Three-Way Matching
LOCATION: tests/phase16.supply_chain_procurement_contracts.test.js
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 16: Supply Chain, Procurement & Vendor Contracts Subsystem", () => {
    let adminToken;
    let testVendorId;
    let testVendorCode;
    let testContractId;
    let testContractNumber;
    let testPoId;
    let testPoNumber;
    let testEmergencyPoId;
    let testGrnId;
    let testGrnNumber;

    const uniqueSuffix = Date.now();
    const vendorEmail = `pharmanova_${uniqueSuffix}@ghana-pharma.com`;
    const vendorPhone = `+23324${String(uniqueSuffix).slice(-7)}`;

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
    test("1. GET /api/v1/procurement/telemetry requires authentication (401 without token)", async () => {
        const res = await request(app).get("/api/v1/procurement/telemetry");
        expect(res.status).toBe(401);
    });

    test("2. GET /api/v1/procurement/catalogs returns standard vendor categories, payment terms, and PO statuses", async () => {
        const res = await request(app)
            .get("/api/v1/procurement/catalogs")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.vendorCategories)).toBe(true);
        expect(res.body.data.paymentTerms).toContain("NET_30");
        expect(res.body.data.poStatuses).toContain("APPROVED");
        expect(res.body.data.departments).toContain("PHARMACY");
    });

    // -------------------------------------------------------------
    // 2. Vendor Management
    // -------------------------------------------------------------
    test("3. POST /api/v1/procurement/vendors registers a new vendor with sequential VND-YYYY-XXXXXX", async () => {
        const res = await request(app)
            .post("/api/v1/procurement/vendors")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                name: `Pharmanova Ghana Ltd ${uniqueSuffix}`,
                category: "PHARMACEUTICALS",
                taxIdentificationNumber: `C00${String(uniqueSuffix).slice(-7)}X`,
                contactPerson: "Kwame Asante",
                email: vendorEmail,
                phone: vendorPhone,
                address: "Plot 14 Industrial Area, Spintex Road, Accra",
                bankName: "GCB Bank",
                bankAccountNumber: "1011122233344",
                bankBranch: "High Street Accra",
                paymentTerms: "NET_30"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.vendorCode).toMatch(/^VND-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("ACTIVE");
        expect(res.body.data.rating).toBe(5.0);

        testVendorId = res.body.data.id;
        testVendorCode = res.body.data.vendorCode;
    });

    test("4. GET /api/v1/procurement/vendors lists vendors with search and category filtering", async () => {
        const res = await request(app)
            .get("/api/v1/procurement/vendors")
            .query({ category: "PHARMACEUTICALS", search: "Pharmanova" })
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.count).toBeGreaterThanOrEqual(1);

        const found = res.body.data.find(v => v.id === testVendorId);
        expect(found).toBeDefined();
        expect(found.vendorCode).toBe(testVendorCode);
    });

    test("5. GET /api/v1/procurement/vendors/:id retrieves vendor profile with relations", async () => {
        const res = await request(app)
            .get(`/api/v1/procurement/vendors/${testVendorId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(testVendorId);
        expect(res.body.data.email).toBe(vendorEmail.toLowerCase());
    });

    // -------------------------------------------------------------
    // 3. Vendor Contracts
    // -------------------------------------------------------------
    test("6. POST /api/v1/procurement/contracts registers a formal SLA contract with sequential CON-YYYY-XXXXXX", async () => {
        const res = await request(app)
            .post("/api/v1/procurement/contracts")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                vendorId: testVendorId,
                title: "Annual Essential Antibiotics Supply Framework SLA",
                contractType: "FRAMEWORK_AGREEMENT",
                startDate: new Date(),
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                contractValue: 250000.0,
                currency: "GHS",
                termsConditions: "Guaranteed 48hr delivery SLA. Cold-chain audit compliance required.",
                signedByRepresentative: "Kwame Asante",
                signedByHospitalDirector: "Dr. Mensah Osei"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.contractNumber).toMatch(/^CON-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("ACTIVE");
        expect(res.body.data.contractValue).toBe(250000.0);

        testContractId = res.body.data.id;
        testContractNumber = res.body.data.contractNumber;
    });

    // -------------------------------------------------------------
    // 4. Purchase Orders
    // -------------------------------------------------------------
    test("7. POST /api/v1/procurement/purchase-orders creates a Purchase Order with line items and subtotal/total calculations", async () => {
        const res = await request(app)
            .post("/api/v1/procurement/purchase-orders")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                vendorId: testVendorId,
                department: "PHARMACY",
                orderDate: new Date(),
                expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                requisitionedBy: "Chief Pharmacist Addo",
                priority: "ROUTINE",
                taxAmount: 150.0,
                items: [
                    {
                        itemCode: "MED-AMOX-500",
                        description: "Amoxicillin 500mg Capsules (Box of 100)",
                        quantityOrdered: 50,
                        unitCost: 20.0,
                        unitOfMeasure: "BOX"
                    },
                    {
                        itemCode: "MED-IV-NS-500",
                        description: "Normal Saline 0.9% 500ml Infusion Bags",
                        quantityOrdered: 100,
                        unitCost: 10.0,
                        unitOfMeasure: "BAG"
                    }
                ]
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.poNumber).toMatch(/^PO-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("DRAFT");
        // Subtotal = (50 * 20) + (100 * 10) = 1000 + 1000 = 2000 GHS
        expect(res.body.data.subtotal).toBe(2000.0);
        // Total = 2000 + 150 = 2150 GHS
        expect(res.body.data.totalAmount).toBe(2150.0);
        expect(res.body.data.items.length).toBe(2);

        testPoId = res.body.data.id;
        testPoNumber = res.body.data.poNumber;
    });

    test("8. Validation guard: creating PO without line items fails with 400", async () => {
        const res = await request(app)
            .post("/api/v1/procurement/purchase-orders")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                vendorId: testVendorId,
                department: "PHARMACY",
                requisitionedBy: "Officer",
                items: []
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("9. PATCH /api/v1/procurement/purchase-orders/:id/status transitions PO to APPROVED", async () => {
        const res = await request(app)
            .patch(`/api/v1/procurement/purchase-orders/${testPoId}/status`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                status: "APPROVED",
                approvedBy: "Procurement Director K. Mensah",
                notes: "Budget verified and approved under FY2026 clinical supplies expenditure."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("APPROVED");
        expect(res.body.data.approvedBy).toBe("Procurement Director K. Mensah");
        expect(res.body.data.approvedAt).toBeDefined();
    });

    test("10. PATCH /api/v1/procurement/purchase-orders/:id/status transitions PO to ISSUED_TO_VENDOR", async () => {
        const res = await request(app)
            .patch(`/api/v1/procurement/purchase-orders/${testPoId}/status`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                status: "ISSUED_TO_VENDOR",
                notes: "PO transmitted electronically to vendor dispatch desk."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("ISSUED_TO_VENDOR");
    });

    test("11. POST /api/v1/procurement/purchase-orders with EMERGENCY_STOCKOUT priority records safety override flag", async () => {
        const res = await request(app)
            .post("/api/v1/procurement/purchase-orders")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                vendorId: testVendorId,
                department: "THEATRE",
                priority: "EMERGENCY_STOCKOUT",
                requisitionedBy: "Senior Surgical Sister Afia",
                items: [
                    {
                        itemCode: "SURG-SUTURE-0",
                        description: "Vicryl 2-0 Absorbable Sutures",
                        quantityOrdered: 20,
                        unitCost: 45.0,
                        unitOfMeasure: "PACK"
                    }
                ]
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.priority).toBe("EMERGENCY_STOCKOUT");
        expect(res.body.data.emergencyStockoutLogged).toBe(true);

        testEmergencyPoId = res.body.data.id;
    });

    // -------------------------------------------------------------
    // 5. Goods Receipt Note (GRN) & Receiving
    // -------------------------------------------------------------
    test("12. POST /api/v1/procurement/goods-receipt-notes creates GRN with sequential GRN-YYYY-XXXXXX and updates PO status", async () => {
        const res = await request(app)
            .post("/api/v1/procurement/goods-receipt-notes")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                purchaseOrderId: testPoId,
                waybillOrInvoiceNumber: `WB-PHARM-${uniqueSuffix}`,
                receivedBy: "Storekeeper Boateng",
                inspectedBy: "Quality Inspector E. Mensah",
                inspectionStatus: "INSPECTION_PASSED",
                temperatureCompliant: true,
                items: [
                    {
                        itemCode: "MED-AMOX-500",
                        description: "Amoxicillin 500mg Capsules (Box of 100)",
                        quantityReceived: 50,
                        quantityAccepted: 50,
                        quantityRejected: 0,
                        batchNumber: `BAT-AMOX-${uniqueSuffix}`,
                        expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
                        unitCost: 20.0,
                        destinationDepartment: "PHARMACY"
                    },
                    {
                        itemCode: "MED-IV-NS-500",
                        description: "Normal Saline 0.9% 500ml Infusion Bags",
                        quantityReceived: 100,
                        quantityAccepted: 100,
                        quantityRejected: 0,
                        batchNumber: `BAT-NS-${uniqueSuffix}`,
                        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                        unitCost: 10.0,
                        destinationDepartment: "PHARMACY"
                    }
                ]
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.grnNumber).toMatch(/^GRN-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("INSPECTED_ACCEPTED");
        expect(res.body.data.items.length).toBe(2);

        testGrnId = res.body.data.id;
        testGrnNumber = res.body.data.grnNumber;

        // Verify PO transitioned to FULLY_RECEIVED because all quantities were fulfilled
        const refreshedPoRes = await request(app)
            .get(`/api/v1/procurement/purchase-orders/${testPoId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(refreshedPoRes.status).toBe(200);
        expect(refreshedPoRes.body.data.status).toBe("FULLY_RECEIVED");
    });

    // -------------------------------------------------------------
    // 6. Three-Way Matching & Discrepancy Detection
    // -------------------------------------------------------------
    test("13. POST /api/v1/procurement/goods-receipt-notes/:id/three-way-match verifies perfect match with zero variance", async () => {
        // Expected total payable = 2150.00 GHS (2000 subtotal + 150 tax)
        const res = await request(app)
            .post(`/api/v1/procurement/goods-receipt-notes/${testGrnId}/three-way-match`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                invoiceAmount: 2150.0,
                notes: "Supplier Invoice INV-7789 matches PO 2000 GHS subtotal + 150 tax exactly."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.matchEvaluation.isMatch).toBe(true);
        expect(res.body.data.matchEvaluation.variance).toBe(0);
        expect(res.body.data.grn.threeWayMatchVerified).toBe(true);
    });

    test("14. POST /api/v1/procurement/goods-receipt-notes/:id/three-way-match flags variance when invoice does not match PO/GRN", async () => {
        // Intentionally provide higher invoice amount: 2500 GHS instead of 2150 GHS (variance = +350 GHS)
        const res = await request(app)
            .post(`/api/v1/procurement/goods-receipt-notes/${testGrnId}/three-way-match`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                invoiceAmount: 2500.0,
                notes: "Discrepant supplier invoice with unjustified price hike."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.matchEvaluation.isMatch).toBe(false);
        expect(res.body.data.matchEvaluation.variance).toBe(350.0);
        expect(res.body.data.grn.threeWayMatchVerified).toBe(false);
    });

    // -------------------------------------------------------------
    // 7. Telemetry & Live Operational Statistics
    // -------------------------------------------------------------
    test("15. GET /api/v1/procurement/stats aggregates real-time PostgreSQL operational metrics", async () => {
        const res = await request(app)
            .get("/api/v1/procurement/stats")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.totalVendors).toBeGreaterThanOrEqual(1);
        expect(res.body.data.activeVendors).toBeGreaterThanOrEqual(1);
        expect(res.body.data.fullyReceivedOrders).toBeGreaterThanOrEqual(1);
        expect(res.body.data.totalSpendYtd).toBeGreaterThanOrEqual(2150.0);
        expect(typeof res.body.data.threeWayMatchCompliancePercent).toBe("number");
        expect(res.body.data.activeContractsCount).toBeGreaterThanOrEqual(1);
    });
});
