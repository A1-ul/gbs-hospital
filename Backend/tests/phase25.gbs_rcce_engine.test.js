"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM — PHASE 25 TEST SUITE
GBS CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE (GBS-RCCE)
================================================================================
Verifies end-to-end across PostgreSQL, API middleware, controllers, and
reusable engine components:
  1. Standardized Response Contract & Predefined Catalogue
  2. Reusable Multi-Product Engine Portability (School / Real Estate / Exam)
  3. Registration -> Pending Approval -> Notifications -> Cryptographic Audit
  4. Financial Payment Rules + Idempotency Duplicate-Submission Protection
  5. Developer Privacy Boundary + Explicit Non-Self-Approving Access Grants
  6. Dynamic Permission Overrides, Maintenance Mode & Error Diagnostics
  7. Frontend API Compatibility Repairs (ICD-10, Bed Matrix, Dispatches, Pharmacy)
================================================================================
*/

const path = require("path");
const request = require("supertest");
process.env.NODE_ENV = "test";

const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");
const { createGbsRcceEngine } = require(path.resolve(
    __dirname,
    "../../enterprise-framework/gbs-rcce"
));

describe("Phase 25: GBS-RCCE Central Response, Control & Communication Engine", () => {
    let adminToken;
    let devToken;
    let acctToken;
    let doctorToken;

    const cleanupUserIds = [];
    const cleanupGrantIds = [];
    let testPatientId = null;
    let testBillId = null;
    const testSignupEmail = `rcce.signup.${Date.now()}@gbs.com`;

    beforeAll(async () => {
        const [adminRes, devRes] = await Promise.all([
            request(app).post("/api/v1/auth/login").send({ email: "admin@gbs.com", password: "Admin123" }),
            request(app).post("/api/v1/auth/login").send({ email: "developer@gbs.com", password: "Admin123" })
        ]);

        expect(adminRes.status).toBe(200);
        expect(devRes.status).toBe(200);

        adminToken = adminRes.body.data.token;
        devToken = devRes.body.data.token;

        // Provision self-contained ephemeral Accountant & Doctor for test isolation
        const suffix = Date.now();
        const acctEmail = `rcce.acct.${suffix}@gbs.com`;
        const docEmail = `rcce.doc.${suffix}@gbs.com`;

        const [acctSignup, docSignup] = await Promise.all([
            request(app).post("/api/v1/auth/signup").send({
                firstName: "Kofi",
                lastName: "Darko",
                email: acctEmail,
                password: "StrongPassword123!",
                role: "ACCOUNTANT"
            }),
            request(app).post("/api/v1/auth/signup").send({
                firstName: "Kwesi",
                lastName: "Mensah",
                email: docEmail,
                password: "StrongPassword123!",
                role: "DOCTOR"
            })
        ]);

        expect(acctSignup.status).toBe(201);
        expect(docSignup.status).toBe(201);

        cleanupUserIds.push(acctSignup.body.data.id, docSignup.body.data.id);

        await Promise.all([
            request(app)
                .patch(`/api/v1/users/${acctSignup.body.data.id}/approve`)
                .set("Authorization", `Bearer ${adminToken}`),
            request(app)
                .patch(`/api/v1/users/${docSignup.body.data.id}/approve`)
                .set("Authorization", `Bearer ${adminToken}`)
        ]);

        const [acctLogin, docLogin] = await Promise.all([
            request(app).post("/api/v1/auth/login").send({ email: acctEmail, password: "StrongPassword123!" }),
            request(app).post("/api/v1/auth/login").send({ email: docEmail, password: "StrongPassword123!" })
        ]);

        expect(acctLogin.status).toBe(200);
        expect(docLogin.status).toBe(200);

        acctToken = acctLogin.body.data.token;
        doctorToken = docLogin.body.data.token;
    }, 90000);

    afterAll(async () => {
        try {
            // Ensure maintenance mode & permission overrides are reset cleanly
            await prisma.systemConfiguration.deleteMany({
                where: { configKey: { in: ["MAINTENANCE_MODE", "ROLE_PERMISSION_OVERRIDES"] } }
            });
            if (cleanupGrantIds.length > 0) {
                await prisma.developerAccessGrant.deleteMany({ where: { id: { in: cleanupGrantIds } } });
            }
            if (testBillId) {
                await prisma.patientPayment.deleteMany({ where: { billId: testBillId } });
                await prisma.billItem.deleteMany({ where: { billId: testBillId } });
                await prisma.patientBill.deleteMany({ where: { id: testBillId } });
            }
            if (testPatientId) {
                await prisma.medicalFolder.deleteMany({ where: { patientId: testPatientId } });
                await prisma.patient.deleteMany({ where: { id: testPatientId } });
            }
            await prisma.idempotencyRecord.deleteMany({
                where: { idempotencyKey: { startsWith: "pay-rcce-" } }
            });
            if (cleanupUserIds.length > 0) {
                await prisma.auditLog.deleteMany({ where: { userId: { in: cleanupUserIds } } });
                await prisma.user.deleteMany({ where: { id: { in: cleanupUserIds } } });
            }
        } finally {
            await prisma.$disconnect();
        }
    });

    test("1. Reusable GBS-RCCE package instantiates cleanly for non-hospital GBS applications", async () => {
        const schoolRcce = createGbsRcceEngine({
            applicationName: "GBS School Management System",
            customResponses: {
                STUDENT_ADMITTED: {
                    code: "STUDENT_ADMITTED",
                    httpStatus: 201,
                    severity: "INFO",
                    category: "ACADEMIC",
                    message: "Student admission completed successfully."
                }
            }
        });

        expect(schoolRcce.applicationName).toBe("GBS School Management System");
        expect(schoolRcce.catalogue.get("STUDENT_ADMITTED", 201, true).message).toBe(
            "Student admission completed successfully."
        );
        expect(schoolRcce.catalogue.get("PAYMENT_RECEIVED", 200, true).message).toBe(
            "Payment received successfully."
        );

        const missingCheck = schoolRcce.rules.requireFields({ firstName: "Ama" }, [
            { field: "firstName", label: "First Name" },
            { field: "guardianPhone", label: "Guardian Phone" }
        ]);
        expect(missingCheck.valid).toBe(false);
        expect(missingCheck.code).toBe("VALIDATION_MISSING_INFO");
        expect(missingCheck.message).toBe("Some required information is missing.");
    });

    test("2. Canonical API Envelope & Predefined Response Catalogue across success, 404, and validation errors", async () => {
        const catRes = await request(app)
            .get("/api/v1/rcce/catalogue")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(catRes.status).toBe(200);
        expect(catRes.body.success).toBe(true);
        expect(catRes.body.code).toBe("SUCCESS");
        expect(catRes.body.requestId).toBeTruthy();
        expect(catRes.body.timestamp).toBeTruthy();
        expect(Array.isArray(catRes.body.errors)).toBe(true);
        expect(catRes.body.data.totalCodes).toBeGreaterThanOrEqual(20);

        // Unknown route returns standardized 404 envelope
        const notFoundRes = await request(app).get("/api/v1/nonexistent-rcce-probe");
        expect(notFoundRes.status).toBe(404);
        expect(notFoundRes.body.success).toBe(false);
        expect(notFoundRes.body.code).toBeDefined();
        expect(notFoundRes.body.requestId).toBeTruthy();
        expect(notFoundRes.body.timestamp).toBeTruthy();
    });

    test("3. End-to-End Signup -> Pending Approval -> DB Notification -> Cryptographic Audit", async () => {
        const signupRes = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                firstName: "Kwame",
                lastName: "Mensah",
                email: testSignupEmail,
                password: "StrongPassword123!",
                role: "NURSE"
            });

        expect(signupRes.status).toBe(201);
        expect(signupRes.body.success).toBe(true);
        expect(signupRes.body.code).toBe("PENDING_APPROVAL");
        expect(signupRes.body.message).toBe("Your request has been submitted and is awaiting approval.");
        expect(signupRes.body.requestId).toBeTruthy();
        cleanupUserIds.push(signupRes.body.data.id);

        // Admin receives persisted event notification
        const notifRes = await request(app)
            .get("/api/v1/rcce/notifications")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(notifRes.status).toBe(200);
        expect(notifRes.body.data.notifications.some((n) => n.eventType === "USER_REGISTERED")).toBe(true);

        // Audit trail captured both creation and SHA-256 chain hash
        const auditRes = await request(app)
            .get(`/api/v1/rcce/audit-logs?requestId=${encodeURIComponent(signupRes.body.requestId)}`)
            .set("Authorization", `Bearer ${devToken}`);

        expect(auditRes.status).toBe(200);
        expect(auditRes.body.data.integrity.integrityIntact).toBe(true);
        expect(auditRes.body.data.logs.length).toBeGreaterThanOrEqual(1);
    });

    test("4. Payment Business Rule Rejection & Idempotency Duplicate-Submission Protection", async () => {
        // Create patient + bill cleanly (using Receptionist/Admin authority)
        const patRes = await request(app)
            .post("/api/v1/patients/register")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                firstName: "Abena",
                lastName: "Osei",
                dateOfBirth: "1992-05-10",
                gender: "FEMALE",
                phone: "0244009911"
            });
        expect(patRes.status).toBe(201);
        testPatientId = patRes.body.data.patient?.id || patRes.body.data.id;

        const billRes = await request(app)
            .post("/api/v1/billing/bills")
            .set("Authorization", `Bearer ${acctToken}`)
            .send({
                patientId: testPatientId,
                payorType: "CASH",
                items: [
                    {
                        category: "CONSULTATION",
                        serviceCode: "CONS-GEN",
                        serviceName: "OPD General Consultation",
                        unitPrice: 120,
                        quantity: 1,
                        nhisCovered: false
                    }
                ]
            });
        expect(billRes.status).toBe(201);
        testBillId = billRes.body.data.id;

        // Invalid negative amount payment rejected by Business Rules Engine
        const badPay = await request(app)
            .post("/api/v1/billing/payments")
            .set("Authorization", `Bearer ${acctToken}`)
            .send({
                billId: testBillId,
                amount: -50,
                paymentMethod: "CASH"
            });
        expect(badPay.status).toBe(400);
        expect(badPay.body.success).toBe(false);
        expect(badPay.body.code).toBe("PAYMENT_REJECTED");

        // Idempotent valid payment
        const idempKey = `pay-rcce-${Date.now()}`;
        const pay1 = await request(app)
            .post("/api/v1/billing/payments")
            .set("Authorization", `Bearer ${acctToken}`)
            .set("X-Idempotency-Key", idempKey)
            .send({
                billId: testBillId,
                amount: 60,
                paymentMethod: "CASH"
            });

        expect(pay1.status).toBe(201);
        expect(pay1.body.success).toBe(true);
        expect(pay1.body.code).toBe("PAYMENT_RECEIVED");
        expect(pay1.body.message).toBe("Payment received successfully.");

        // Duplicate replay with identical idempotency key returns cached response without double charge
        const payReplay = await request(app)
            .post("/api/v1/billing/payments")
            .set("Authorization", `Bearer ${acctToken}`)
            .set("X-Idempotency-Key", idempKey)
            .send({
                billId: testBillId,
                amount: 60,
                paymentMethod: "CASH"
            });

        expect(payReplay.status).toBe(201);
        expect(payReplay.headers["x-idempotency-replayed"]).toBe("true");
        expect(payReplay.body.idempotentReplay).toBe(true);

        // Verify DB only recorded ONE payment row of 60 (NOT 120!)
        const paymentsInDb = await prisma.patientPayment.findMany({ where: { billId: testBillId } });
        expect(paymentsInDb.length).toBe(1);
        expect(Number(paymentsInDb[0].amount)).toBe(60);

        // Mismatched payload with same idempotency key MUST be rejected with 409
        const payConflict = await request(app)
            .post("/api/v1/billing/payments")
            .set("Authorization", `Bearer ${acctToken}`)
            .set("X-Idempotency-Key", idempKey)
            .send({
                billId: testBillId,
                amount: 99,
                paymentMethod: "CASH"
            });
        expect(payConflict.status).toBe(409);
        expect(payConflict.body.code).toBe("DUPLICATE_SUBMISSION");
    });

    test("5. Developer Privacy Boundary: Default Redaction, Blocked Self-Approval & Explicit Audited Grant", async () => {
        // Non-developer/non-admin user cannot access Developer Control Center
        const deniedDoc = await request(app)
            .get("/api/v1/rcce/developer/overview")
            .set("Authorization", `Bearer ${doctorToken}`);
        expect(deniedDoc.status).toBe(403);
        expect(deniedDoc.body.code).toBe("FORBIDDEN_PERMISSION");
        expect(deniedDoc.body.message).toBe("You do not have permission to perform this operation.");

        // Developer default overview succeeds (operational telemetry only)
        const devOverview = await request(app)
            .get("/api/v1/rcce/developer/overview")
            .set("Authorization", `Bearer ${devToken}`);
        expect(devOverview.status).toBe(200);
        expect(devOverview.body.data.privacyControl.developerPrivateDataRestrictedByDefault).toBe(true);

        // Developer default users-activity masks private PII
        const maskedRes = await request(app)
            .get("/api/v1/rcce/developer/users-activity")
            .set("Authorization", `Bearer ${devToken}`);
        expect(maskedRes.status).toBe(200);
        expect(maskedRes.body.data.privacyPolicyApplied).toBe("REDACTED_BY_DEFAULT");
        expect(maskedRes.body.data.users[0].privacyRedacted).toBe(true);
        expect(maskedRes.body.data.users[0].email).toContain("***");

        // Developer unmasked request WITHOUT an approved grant is DENIED 403 and audited
        const blockedUnmasked = await request(app)
            .get("/api/v1/rcce/developer/users-activity?includePrivate=true")
            .set("Authorization", `Bearer ${devToken}`);
        expect(blockedUnmasked.status).toBe(403);
        expect(blockedUnmasked.body.code).toBe("SENSITIVE_ACCESS_RESTRICTED");

        // Developer requests explicit grant
        const reqGrantRes = await request(app)
            .post("/api/v1/rcce/developer/access-grants/request")
            .set("Authorization", `Bearer ${devToken}`)
            .send({
                scope: "USER_PII_READ",
                reason: "Investigating duplicate account notification delivery incident",
                ticketRef: "INC-2026-901"
            });
        expect(reqGrantRes.status).toBe(202);
        expect(reqGrantRes.body.code).toBe("PENDING_APPROVAL");
        const grantId = reqGrantRes.body.data.id;
        cleanupGrantIds.push(grantId);

        // Developer CANNOT self-approve their own grant
        const selfApproveRes = await request(app)
            .patch(`/api/v1/rcce/developer/access-grants/${grantId}/approve`)
            .set("Authorization", `Bearer ${devToken}`)
            .send({ durationMinutes: 30 });
        expect(selfApproveRes.status).toBe(403);
        expect(selfApproveRes.body.code).toBe("FORBIDDEN_PERMISSION");

        // Administrator approves grant cleanly
        const adminApproveRes = await request(app)
            .patch(`/api/v1/rcce/developer/access-grants/${grantId}/approve`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ durationMinutes: 30 });
        expect(adminApproveRes.status).toBe(200);
        expect(adminApproveRes.body.data.status).toBe("APPROVED");

        // Now Developer accesses unmasked users activity & sensitive access is audited
        const grantedRes = await request(app)
            .get("/api/v1/rcce/developer/users-activity?includePrivate=true")
            .set("Authorization", `Bearer ${devToken}`);
        expect(grantedRes.status).toBe(200);
        expect(grantedRes.body.data.privacyPolicyApplied).toBe("EXPLICIT_AUDITED_GRANT");
        expect(grantedRes.body.data.grantCode).toBe(reqGrantRes.body.data.grantCode);

        // Revoke grant & verify immediate block again
        const revokeRes = await request(app)
            .patch(`/api/v1/rcce/developer/access-grants/${grantId}/revoke`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(revokeRes.status).toBe(200);

        const afterRevoke = await request(app)
            .get("/api/v1/rcce/developer/users-activity?includePrivate=true")
            .set("Authorization", `Bearer ${devToken}`);
        expect(afterRevoke.status).toBe(403);
    });

    test("6. Dynamic Permission Overrides, Maintenance Mode & Frontend Repair Contracts", async () => {
        // Repaired ICD-10 ?q= parameter + Bed Matrix + Emergency Dispatches
        const icdRes = await request(app)
            .get("/api/v1/clinical/catalog/diagnoses?q=Malaria")
            .set("Authorization", `Bearer ${doctorToken}`);
        expect(icdRes.status).toBe(200);
        expect(Array.isArray(icdRes.body.items)).toBe(true);
        expect(Array.isArray(icdRes.body.data)).toBe(true);

        const bedMatrixRes = await request(app)
            .get("/api/v1/admissions/bed-matrix")
            .set("Authorization", `Bearer ${doctorToken}`);
        expect(bedMatrixRes.status).toBe(200);
        expect(bedMatrixRes.body).toHaveProperty("wards");
        expect(bedMatrixRes.body).toHaveProperty("totals");

        const dispRes = await request(app)
            .get("/api/v1/emergency/dispatches")
            .set("Authorization", `Bearer ${doctorToken}`);
        expect(dispRes.status).toBe(200);

        // Dynamic permission revocation via Developer Control Engine
        const revokePerm = await request(app)
            .patch("/api/v1/rcce/developer/permissions")
            .set("Authorization", `Bearer ${devToken}`)
            .send({ roleName: "DOCTOR", permission: "emergency:read", action: "REVOKE" });
        expect(revokePerm.status).toBe(200);

        const blockedByDynamicPerm = await request(app)
            .get("/api/v1/emergency/dispatches")
            .set("Authorization", `Bearer ${doctorToken}`);
        expect(blockedByDynamicPerm.status).toBe(403);
        expect(blockedByDynamicPerm.body.code).toBe("FORBIDDEN_PERMISSION");

        // Restore permission immediately
        const grantPerm = await request(app)
            .patch("/api/v1/rcce/developer/permissions")
            .set("Authorization", `Bearer ${devToken}`)
            .send({ roleName: "DOCTOR", permission: "emergency:read", action: "GRANT" });
        expect(grantPerm.status).toBe(200);

        // Authorized Maintenance Mode blocks ordinary users (503) while Developer remains active
        const maintOn = await request(app)
            .post("/api/v1/rcce/developer/maintenance")
            .set("Authorization", `Bearer ${devToken}`)
            .send({ enabled: true, message: "Maintenance window active" });
        expect(maintOn.status).toBe(200);

        const blockedUser = await request(app)
            .get("/api/v1/patients/search?query=Osei")
            .set("Authorization", `Bearer ${doctorToken}`);
        expect(blockedUser.status).toBe(503);
        expect(blockedUser.body.code).toBe("MAINTENANCE_MODE");

        const devAllowedDuringMaint = await request(app)
            .get("/api/v1/rcce/developer/overview")
            .set("Authorization", `Bearer ${devToken}`);
        expect(devAllowedDuringMaint.status).toBe(200);

        // Disable maintenance mode cleanly
        const maintOff = await request(app)
            .post("/api/v1/rcce/developer/maintenance")
            .set("Authorization", `Bearer ${devToken}`)
            .send({ enabled: false });
        expect(maintOff.status).toBe(200);
    });

    test("7. System-Wide Error Diagnostics Repository: safe user masking + developer diagnostic resolution", async () => {
        const errSpyRes = await request(app)
            .patch("/api/v1/rcce/developer/access-grants/nonexistent-id-check/approve")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ durationMinutes: 30 });
        expect(errSpyRes.status).toBe(404);
        expect(errSpyRes.body.success).toBe(false);
        expect(errSpyRes.body.code).toBe("RECORD_NOT_FOUND");
        expect(errSpyRes.body.message).toBe("No matching record was found.");
        expect(errSpyRes.body.requestId).toBeTruthy();

        const devErrorsRes = await request(app)
            .get("/api/v1/rcce/errors")
            .set("Authorization", `Bearer ${devToken}`);
        expect(devErrorsRes.status).toBe(200);
        expect(Array.isArray(devErrorsRes.body.data.errors)).toBe(true);
        const captured = devErrorsRes.body.data.errors.find(
            (e) => e.requestId === errSpyRes.body.requestId
        );
        expect(captured).toBeDefined();
        expect(captured.code).toBe("RECORD_NOT_FOUND");

        const resolveRes = await request(app)
            .patch(`/api/v1/rcce/errors/${captured.id}/resolve`)
            .set("Authorization", `Bearer ${devToken}`)
            .send({ resolutionNote: "Verified 404 lookup test diagnostic cleanly." });
        expect(resolveRes.status).toBe(200);
        expect(resolveRes.body.data.resolved).toBe(true);
    });

    test("8. Domain Notification Routing across specialized modules (HR Leave Request -> Approve -> Notifications)", async () => {
        const leaveRes = await request(app)
            .post("/api/v1/hr/leave")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                staffId: `STF-${Date.now()}`,
                staffName: "Nurse Akosua Osei",
                department: "INTERNAL_MEDICINE",
                leaveType: "ANNUAL_LEAVE",
                startDate: new Date().toISOString().slice(0, 10),
                endDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
                relievingStaffName: "Nurse Esi Mensah",
                reason: "Scheduled annual leave verification"
            });

        expect(leaveRes.status).toBe(201);
        expect(leaveRes.body.success).toBe(true);
        expect(leaveRes.body.code).toBe("REQUEST_SUBMITTED");
        const leaveId = leaveRes.body.data.id;

        const approveLeave = await request(app)
            .patch(`/api/v1/hr/leave/${leaveId}/adjudicate`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ status: "APPROVED", approvedBy: "HR Director", comments: "Approved" });

        expect(approveLeave.status).toBe(200);
        expect(approveLeave.body.code).toBe("REQUEST_APPROVED");

        const eventsRes = await request(app)
            .get("/api/v1/rcce/events?domain=HR")
            .set("Authorization", `Bearer ${devToken}`);

        expect(eventsRes.status).toBe(200);
        expect(eventsRes.body.data.events.some((ev) => ev.eventCode === "REQUEST_SUBMITTED")).toBe(true);
        expect(eventsRes.body.data.events.some((ev) => ev.eventCode === "REQUEST_APPROVED")).toBe(true);

        await prisma.staffLeaveRequest.deleteMany({ where: { id: leaveId } }).catch(() => {});
    });
});
