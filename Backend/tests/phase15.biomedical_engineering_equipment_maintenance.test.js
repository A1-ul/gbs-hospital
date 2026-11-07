"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 15 INTEGRATION TEST SUITE
Biomedical Engineering, Medical Equipment Maintenance,
PPM Schedules, Calibrations & Emergency Work Orders
LOCATION: tests/phase15.biomedical_engineering_equipment_maintenance.test.js
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 15: Biomedical Engineering & Equipment Maintenance Subsystem", () => {
    let adminToken;
    let testVentilatorId;
    let testVentilatorAssetTag;
    let testUltrasoundId;
    let testWorkOrderId;
    let testWorkOrderNumber;
    let testCalibrationId;

    const uniqueSuffix = Date.now();
    const ventilatorSerial = `HAM-G5-${uniqueSuffix}`;
    const ultrasoundSerial = `GE-LOGIQ-${uniqueSuffix}`;

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
    test("1. GET /api/v1/biomedical/telemetry requires authentication (401 without token)", async () => {
        const res = await request(app).get("/api/v1/biomedical/telemetry");
        expect(res.status).toBe(401);
    });

    test("2. GET /api/v1/biomedical/catalogs returns device categories, risk levels, and IEC 60601-1 limits", async () => {
        const res = await request(app)
            .get("/api/v1/biomedical/catalogs")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.categories.LIFE_SUPPORT).toBeDefined();
        expect(res.body.data.riskLevels.CRITICAL_HIGH_RISK).toBeDefined();
        expect(res.body.data.electricalSafetyLimits.MAX_GROUND_RESISTANCE_OHMS).toBe(0.2);
        expect(res.body.data.electricalSafetyLimits.MAX_LEAKAGE_CURRENT_MICRO_AMPS).toBe(500.0);
    });

    // -------------------------------------------------------------
    // 2. Equipment Asset Registry
    // -------------------------------------------------------------
    test("3. POST /api/v1/biomedical/equipment registers critical life-support mechanical ventilator (EQP-YYYY-XXXXXX)", async () => {
        const payload = {
            name: "Hamilton-G5 Critical Care Ventilator",
            modelNumber: "G5-ADULT-PED",
            serialNumber: ventilatorSerial,
            manufacturer: "Hamilton Medical AG",
            category: "LIFE_SUPPORT",
            riskLevel: "CRITICAL_HIGH_RISK",
            department: "ICU",
            roomLocation: "ICU Bed Bay 04",
            powerRatingWatts: 350.0,
            ppmIntervalDays: 60,
            calibrationIntervalDays: 90
        };

        const res = await request(app)
            .post("/api/v1/biomedical/equipment")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBeDefined();
        expect(res.body.data.assetTag).toMatch(/^EQP-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("OPERATIONAL");
        expect(res.body.data.riskLevel).toBe("CRITICAL_HIGH_RISK");
        expect(res.body.data.electricalSafetyCertified).toBe(true);

        testVentilatorId = res.body.data.id;
        testVentilatorAssetTag = res.body.data.assetTag;
    });

    test("4. POST /api/v1/biomedical/equipment blocks duplicate serial numbers (400 DUPLICATE_SERIAL)", async () => {
        const payload = {
            name: "Hamilton-G5 Duplicate",
            modelNumber: "G5-ADULT-PED",
            serialNumber: ventilatorSerial, // duplicate
            manufacturer: "Hamilton Medical AG",
            department: "ICU"
        };

        const res = await request(app)
            .post("/api/v1/biomedical/equipment")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("DUPLICATE_SERIAL");
    });

    test("5. POST /api/v1/biomedical/equipment registers diagnostic ultrasound scanner (EQP-YYYY-XXXXXX)", async () => {
        const payload = {
            name: "GE Logiq E10 Digital Ultrasound",
            modelNumber: "LOGIQ-E10-XD",
            serialNumber: ultrasoundSerial,
            manufacturer: "GE Healthcare",
            category: "DIAGNOSTIC_IMAGING",
            riskLevel: "MEDIUM_RISK",
            department: "RADIOLOGY",
            roomLocation: "Ultrasound Suite 02",
            powerRatingWatts: 600.0,
            ppmIntervalDays: 90,
            calibrationIntervalDays: 180
        };

        const res = await request(app)
            .post("/api/v1/biomedical/equipment")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.assetTag).toMatch(/^EQP-\d{4}-\d{6}$/);

        testUltrasoundId = res.body.data.id;
    });

    test("6. GET /api/v1/biomedical/equipment returns equipment inventory with dynamic PPM and calibration flags", async () => {
        const res = await request(app)
            .get("/api/v1/biomedical/equipment")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBeGreaterThanOrEqual(2);

        const ventilator = res.body.data.find(e => e.id === testVentilatorId);
        expect(ventilator).toBeDefined();
        expect(ventilator.isPpmOverdue).toBe(false);
        expect(ventilator.isCalibrationOverdue).toBe(false);
    });

    test("7. GET /api/v1/biomedical/equipment/:id returns comprehensive equipment details and history", async () => {
        const res = await request(app)
            .get(`/api/v1/biomedical/equipment/${testVentilatorId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.assetTag).toBe(testVentilatorAssetTag);
        expect(Array.isArray(res.body.data.workOrders)).toBe(true);
        expect(Array.isArray(res.body.data.calibrations)).toBe(true);
    });

    test("8. POST /api/v1/biomedical/equipment/:id/safety-override logs clinician emergency safety override", async () => {
        const payload = {
            clinicianName: "Dr. Mensah, MD (Chief Intensivist)",
            reason: "Emergency mass casualty mechanical ventilation authorized during surge capacity."
        };

        const res = await request(app)
            .post(`/api/v1/biomedical/equipment/${testVentilatorId}/safety-override`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.safetyOverrideActive).toBe(true);
        expect(res.body.data.safetyOverrideReason).toContain("Dr. Mensah");
    });

    // -------------------------------------------------------------
    // 3. Work Orders & Breakdown Maintenance
    // -------------------------------------------------------------
    test("9. POST /api/v1/biomedical/work-orders creates STAT_EMERGENCY_BREAKDOWN work order (WO-YYYY-XXXXXX)", async () => {
        const payload = {
            equipmentId: testVentilatorId,
            orderType: "CORRECTIVE_BREAKDOWN",
            priority: "STAT_EMERGENCY_BREAKDOWN",
            failureDescription: "Oxygen flow sensor error code E-04 during pre-op self check. Pressure sensor drift detected.",
            reportedBy: "Senior Nurse Osei, ICU",
            assignedEngineer: "Eng. Kwame Darko, Lead Biomedical Engineer"
        };

        const res = await request(app)
            .post("/api/v1/biomedical/work-orders")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.workOrderNumber).toMatch(/^WO-\d{4}-\d{6}$/);
        expect(res.body.data.priority).toBe("STAT_EMERGENCY_BREAKDOWN");
        expect(res.body.data.status).toBe("ASSIGNED");

        testWorkOrderId = res.body.data.id;
        testWorkOrderNumber = res.body.data.workOrderNumber;

        // Verify equipment was automatically transitioned to OUT_OF_SERVICE
        const eqCheck = await prisma.medicalEquipment.findUnique({
            where: { id: testVentilatorId }
        });
        expect(eqCheck.status).toBe("OUT_OF_SERVICE");
    });

    test("10. PATCH /api/v1/biomedical/work-orders/:id updates progress, root cause, and replaced components", async () => {
        const payload = {
            status: "IN_PROGRESS",
            rootCause: "Degraded Hamilton O2 micro-fuel cell sensor and particulate buildup in proximal flow sensor.",
            actionTaken: "Replaced O2 sensor cell, flushed sampling tube, re-zeroed transducer.",
            partsReplaced: "Hamilton O2 Cell P/N 396200, Flow Sensor P/N 281637",
            partsCost: 450.0,
            laborHours: 2.5
        };

        const res = await request(app)
            .patch(`/api/v1/biomedical/work-orders/${testWorkOrderId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("IN_PROGRESS");
        expect(res.body.data.partsCost).toBe(450.0);
        expect(res.body.data.laborHours).toBe(2.5);
    });

    test("11. POST /api/v1/biomedical/work-orders/:id/complete blocks sign-off if electrical safety fails IEC 60601-1 limits", async () => {
        const payload = {
            qaApprovedBy: "Chief Biomedical Inspector Boateng",
            leakageCurrentMicroAmps: 850.0, // Exceeds 500 uA limit!
            groundResistanceOhms: 0.45       // Exceeds 0.2 Ohm limit!
        };

        const res = await request(app)
            .post(`/api/v1/biomedical/work-orders/${testWorkOrderId}/complete`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("SAFETY_INSPECTION_FAILED");
        expect(res.body.message).toContain("Electrical Safety Sign-off Failed");
    });

    test("12. POST /api/v1/biomedical/work-orders/:id/complete certifies safety, restores equipment to OPERATIONAL", async () => {
        const payload = {
            qaApprovedBy: "Chief Biomedical Inspector Boateng",
            leakageCurrentMicroAmps: 45.0,  // Within safe < 100 uA
            groundResistanceOhms: 0.08,    // Within safe < 0.2 Ohm
            partsCost: 450.0,
            laborHours: 3.0,
            notes: "Calibrated on Fluke VT900A gas analyzer. Delivered tidal volumes verified accurate within +/- 2%."
        };

        const res = await request(app)
            .post(`/api/v1/biomedical/work-orders/${testWorkOrderId}/complete`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("VERIFIED_RETURNED_TO_SERVICE");
        expect(res.body.data.electricalSafetyTested).toBe(true);
        expect(res.body.data.completedAt).toBeDefined();

        // Verify equipment was restored to OPERATIONAL
        const eqCheck = await prisma.medicalEquipment.findUnique({
            where: { id: testVentilatorId }
        });
        expect(eqCheck.status).toBe("OPERATIONAL");
        expect(eqCheck.electricalSafetyCertified).toBe(true);
    });

    // -------------------------------------------------------------
    // 4. Calibration Certifications
    // -------------------------------------------------------------
    test("13. POST /api/v1/biomedical/calibrations issues metrology calibration certificate (CAL-YYYY-XXXXXX)", async () => {
        const payload = {
            equipmentId: testVentilatorId,
            calibrationStandard: "ISO_17025",
            testEquipmentUsed: "Fluke VT900A Gas Flow Analyzer S/N FLK-99214 / Rigel 288+ Electrical Safety Analyzer",
            parametersTested: "Inspiratory Flow 0-120 L/min, PEEP pressure 0-50 cmH2O, FiO2 21-100%, Volume delivery accuracy",
            toleranceDeviationPercent: 1.2,
            calibrationResult: "PASSED",
            certifiedByEngineer: "Eng. Kwame Darko, Certified Biomedical Metrologist",
            validityDays: 90,
            notes: "All pneumatic flow and electronic pressure transducers within ISO 17025 laboratory tolerances."
        };

        const res = await request(app)
            .post("/api/v1/biomedical/calibrations")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.certificateNumber).toMatch(/^CAL-\d{4}-\d{6}$/);
        expect(res.body.data.calibrationResult).toBe("PASSED");
        expect(res.body.data.validUntil).toBeDefined();

        testCalibrationId = res.body.data.id;

        // Verify equipment calibration dates updated
        const eqCheck = await prisma.medicalEquipment.findUnique({
            where: { id: testVentilatorId }
        });
        expect(eqCheck.lastCalibrationDate).toBeDefined();
        expect(eqCheck.nextCalibrationDate).toBeDefined();
    });

    // -------------------------------------------------------------
    // 5. Biomedical Command Center Telemetry
    // -------------------------------------------------------------
    test("14. GET /api/v1/biomedical/stats returns real-time Biomedical Command Center telemetry", async () => {
        const res = await request(app)
            .get("/api/v1/biomedical/stats")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.totalEquipment).toBeGreaterThanOrEqual(2);
        expect(res.body.data.operationalCount).toBeGreaterThanOrEqual(1);
        expect(res.body.data.operationalUptimeRate).toMatch(/\d+(\.\d+)?%/);
        expect(res.body.data.criticalHighRiskTotal).toBeGreaterThanOrEqual(1);
        expect(res.body.data.lifeSupportUptimeRate).toMatch(/\d+(\.\d+)?%/);
        expect(res.body.data.totalMaintenanceExpenditure).toBeGreaterThanOrEqual(450.0);
    });
});
