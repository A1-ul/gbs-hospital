"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 17 INTEGRATION TEST SUITE
Human Resource Management, Staff Credentialing,
Duty Rostering, SBAR Shift Handovers, Biometric Attendance & Staff Leave
LOCATION: tests/phase17.hr_credentialing_duty_roster.test.js
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 17: Human Resource Management, Staff Credentialing & Duty Rostering Subsystem", () => {
    let adminToken;
    let testStaffId;
    let testStaffName = "Dr. Kwame Mensah-Bonsu";
    let testCredentialId;
    let testCredentialNumber;
    let testRosterId;
    let testRosterNumber;
    let testHandoverId;
    let testHandoverNumber;
    let testAttendanceId;
    let testAttendanceNumber;
    let testLeaveId;
    let testLeaveNumber;

    const uniqueSuffix = Date.now();
    const licenseNumber = `MDC/P/${uniqueSuffix}`;

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

        // Fetch or create staff member for testing
        const staff = await prisma.hospitalStaff.findFirst();
        if (staff) {
            testStaffId = staff.id;
            testStaffName = `${staff.firstName} ${staff.lastName}`;
        } else {
            testStaffId = `STF-${uniqueSuffix}`;
        }
    });

    // -------------------------------------------------------------
    // 1. Security & Catalogs
    // -------------------------------------------------------------
    test("1. GET /api/v1/hr/telemetry requires authentication (401 without token)", async () => {
        const res = await request(app).get("/api/v1/hr/telemetry");
        expect(res.status).toBe(401);
    });

    test("2. GET /api/v1/hr/catalogs returns standard regulatory bodies, cadres, shift types, and leave types", async () => {
        const res = await request(app)
            .get("/api/v1/hr/catalogs")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const councilCodes = res.body.data.regulatoryBodies.map(b => b.code);
        expect(councilCodes).toContain("MDC_GHANA");
        expect(councilCodes).toContain("NMC_GHANA");
        expect(res.body.data.professionalCadres).toContain("SPECIALIST_PHYSICIAN");
        const shiftCodes = res.body.data.shiftTypes.map(s => s.code);
        expect(shiftCodes).toContain("MORNING_SHIFT");
        expect(res.body.data.leaveTypes).toContain("ANNUAL_LEAVE");
    });

    // -------------------------------------------------------------
    // 2. Staff Credentialing & Dynamic Expiration Evaluation
    // -------------------------------------------------------------
    test("3. POST /api/v1/hr/credentials registers staff credentials with sequential CRD-YYYY-XXXXXX", async () => {
        const issuedDate = new Date();
        issuedDate.setFullYear(issuedDate.getFullYear() - 1);
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        const res = await request(app)
            .post("/api/v1/hr/credentials")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                staffId: testStaffId,
                staffName: testStaffName,
                regulatoryBody: "Medical and Dental Council (MDC) Ghana",
                licenseNumber,
                cadre: "SPECIALIST_PHYSICIAN",
                specialty: "Internal Medicine & Critical Care",
                issuedDate: issuedDate.toISOString(),
                expiryDate: expiryDate.toISOString()
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.credentialNumber).toMatch(/^CRD-\d{4}-\d{6}$/);
        expect(res.body.data.emergencyPracticePermitted).toBe(true);
        expect(res.body.data.credentialStatus).toBe("ACTIVE_VERIFIED");

        testCredentialId = res.body.data.id;
        testCredentialNumber = res.body.data.credentialNumber;
    });

    test("4. GET /api/v1/hr/credentials calculates dynamicStatus and daysRemaining", async () => {
        const res = await request(app)
            .get(`/api/v1/hr/credentials?search=${licenseNumber}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBeGreaterThanOrEqual(1);

        const found = res.body.data.find(c => c.id === testCredentialId);
        expect(found).toBeDefined();
        expect(found.dynamicStatus).toBe("ACTIVE_VERIFIED");
        expect(found.daysRemaining).toBeGreaterThan(300);
    });

    test("5. PATCH /api/v1/hr/credentials/:id/verify updates council verification notes", async () => {
        const res = await request(app)
            .patch(`/api/v1/hr/credentials/${testCredentialId}/verify`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                verifiedBy: "Prof. Kwame Asante (Medical Director)",
                verificationNotes: "Verified active in good standing with MDC Ghana portal."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.verifiedBy).toBe("Prof. Kwame Asante (Medical Director)");
        expect(res.body.data.credentialStatus).toBe("ACTIVE_VERIFIED");
    });

    test("6. POST /api/v1/hr/credentials rejects duplicate license number with 409 Conflict", async () => {
        const res = await request(app)
            .post("/api/v1/hr/credentials")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                staffId: testStaffId,
                staffName: testStaffName,
                regulatoryBody: "Medical and Dental Council (MDC) Ghana",
                licenseNumber, // Duplicate
                cadre: "SPECIALIST_PHYSICIAN",
                issuedDate: new Date().toISOString(),
                expiryDate: new Date().toISOString()
            });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/already registered/i);
    });

    // -------------------------------------------------------------
    // 3. Duty Rostering & Conflict Detection
    // -------------------------------------------------------------
    test("7. POST /api/v1/hr/roster schedules duty shift with sequential RST-YYYY-XXXXXX", async () => {
        const shiftDate = new Date();
        shiftDate.setDate(shiftDate.getDate() + 2); // 2 days in advance

        const res = await request(app)
            .post("/api/v1/hr/roster")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                staffId: testStaffId,
                staffName: testStaffName,
                department: "ACCIDENT_AND_EMERGENCY",
                wardOrUnit: "Trauma Resuscitation Bay 1",
                shiftType: "MORNING_SHIFT",
                shiftDate: shiftDate.toISOString(),
                startTime: "07:00",
                endTime: "15:00",
                notes: "Assigned Senior Medical Officer on trauma triage duty"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.rosterNumber).toMatch(/^RST-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("SCHEDULED");

        testRosterId = res.body.data.id;
        testRosterNumber = res.body.data.rosterNumber;
    });

    test("8. POST /api/v1/hr/roster prevents overlapping shift conflict on same date (409 Conflict)", async () => {
        const shiftDate = new Date();
        shiftDate.setDate(shiftDate.getDate() + 2);

        const res = await request(app)
            .post("/api/v1/hr/roster")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                staffId: testStaffId,
                staffName: testStaffName,
                department: "ACCIDENT_AND_EMERGENCY",
                shiftType: "MORNING_SHIFT",
                shiftDate: shiftDate.toISOString()
            });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/conflict detected/i);
    });

    test("9. PATCH /api/v1/hr/roster/:id/status updates duty shift status", async () => {
        const res = await request(app)
            .patch(`/api/v1/hr/roster/${testRosterId}/status`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                status: "COMPLETED",
                notes: "Shift concluded with zero clinical incidents."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("COMPLETED");
    });

    // -------------------------------------------------------------
    // 4. Clinical SBAR Shift Handovers
    // -------------------------------------------------------------
    test("10. POST /api/v1/hr/handovers records clinical SBAR shift handover with HND-YYYY-XXXXXX", async () => {
        const res = await request(app)
            .post("/api/v1/hr/handovers")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                rosterId: testRosterId,
                department: "ACCIDENT_AND_EMERGENCY",
                wardOrUnit: "Trauma Resuscitation Bay 1",
                outgoingStaffName: testStaffName,
                incomingStaffName: "Dr. Abena Osei-Tutu",
                shiftFrom: "MORNING_SHIFT",
                shiftTo: "AFTERNOON_SHIFT",
                censusTotalPatients: 14,
                criticalPatientCount: 3,
                situation: "14 patients currently in ED; 3 in critical resuscitation bay awaiting ICU transfer.",
                background: "High motor vehicle accident influx along motorway over past 4 hours.",
                assessment: "Patient 1 (trauma) stabilized with chest drain; Patient 2 in severe diabetic ketoacidosis on insulin infusion; Patient 3 intubated post cardiac arrest.",
                recommendation: "Ensure ICU Bed 2 transfer completed by 16:00; monitor blood gas for Patient 2 hourly; continue blood crossmatch.",
                controlledDrugsCountOk: true
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.handoverNumber).toMatch(/^HND-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("PENDING_COSIGNATURE");
        expect(res.body.data.controlledDrugsCountOk).toBe(true);

        testHandoverId = res.body.data.id;
        testHandoverNumber = res.body.data.handoverNumber;
    });

    test("11. PATCH /api/v1/hr/handovers/:id/cosign verifies incoming co-signature and marks COMPLETED_VERIFIED", async () => {
        const res = await request(app)
            .patch(`/api/v1/hr/handovers/${testHandoverId}/cosign`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                incomingStaffName: "Dr. Abena Osei-Tutu",
                notes: "All 14 patients sighted. Controlled substances register verified and reconciled in safe."
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("COMPLETED_VERIFIED");
        expect(res.body.data.incomingCoSignedAt).toBeDefined();
    });

    // -------------------------------------------------------------
    // 5. Staff Biometric Attendance
    // -------------------------------------------------------------
    test("12. POST /api/v1/hr/attendance/clock-in records biometric clock-in with ATT-YYYY-XXXXXX", async () => {
        const res = await request(app)
            .post("/api/v1/hr/attendance/clock-in")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                staffId: testStaffId,
                staffName: testStaffName,
                department: "ACCIDENT_AND_EMERGENCY",
                workstationOrTerminal: "BIOMETRIC_TERMINAL_ED_MAIN",
                clockInTime: "06:55"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.attendanceNumber).toMatch(/^ATT-\d{4}-\d{6}$/);
        expect(res.body.data.clockOutTime).toBeNull();

        testAttendanceId = res.body.data.id;
        testAttendanceNumber = res.body.data.attendanceNumber;
    });

    test("13. PATCH /api/v1/hr/attendance/:id/clock-out clocks out staff and computes hoursWorked", async () => {
        const res = await request(app)
            .patch(`/api/v1/hr/attendance/${testAttendanceId}/clock-out`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                clockOutTime: "15:25"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.clockOutTime).toBe("15:25");
        expect(typeof res.body.data.hoursWorked).toBe("number");
        expect(res.body.data.hoursWorked).toBeCloseTo(8.5, 1);
    });

    // -------------------------------------------------------------
    // 6. Staff Leave Management & Approvals
    // -------------------------------------------------------------
    test("14. POST /api/v1/hr/leave submits staff leave request with LEV-YYYY-XXXXXX", async () => {
        const start = new Date();
        start.setDate(start.getDate() + 14);
        const end = new Date(start);
        end.setDate(end.getDate() + 5);

        const res = await request(app)
            .post("/api/v1/hr/leave")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                staffId: testStaffId,
                staffName: testStaffName,
                department: "ACCIDENT_AND_EMERGENCY",
                leaveType: "ANNUAL_LEAVE",
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                daysRequested: 6,
                relievingStaffName: "Dr. Kweku Addo",
                reason: "Annual statutory leave allocation."
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.leaveNumber).toMatch(/^LEV-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("PENDING_APPROVAL");

        testLeaveId = res.body.data.id;
        testLeaveNumber = res.body.data.leaveNumber;
    });

    test("15. PATCH /api/v1/hr/leave/:id/adjudicate approves leave and GET /api/v1/hr/stats returns live telemetry", async () => {
        const adjRes = await request(app)
            .patch(`/api/v1/hr/leave/${testLeaveId}/adjudicate`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                status: "APPROVED",
                approvedBy: "Mrs. Evelyn Boateng (Head of Human Resources)",
                comments: "Approved. Reliever Dr. Kweku Addo confirmed coverage."
            });

        expect(adjRes.status).toBe(200);
        expect(adjRes.body.success).toBe(true);
        expect(adjRes.body.data.status).toBe("APPROVED");

        // Verify Telemetry aggregation
        const statsRes = await request(app)
            .get("/api/v1/hr/stats")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(statsRes.status).toBe(200);
        expect(statsRes.body.success).toBe(true);
        expect(typeof statsRes.body.data.totalStaffCount).toBe("number");
        expect(typeof statsRes.body.data.activeCredentialedStaff).toBe("number");
        expect(typeof statsRes.body.data.credentialComplianceRate).toBe("number");
    });
});
