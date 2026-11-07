"use strict";

const request = require("supertest");
process.env.NODE_ENV = "test";

const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 1: Security Foundation, RBAC Realignment & User Management", () => {
    let adminToken;
    let devToken;
    let testDoctorId;
    const testDoctorEmail = `test.doc.${Date.now()}@gbs.com`;

    beforeAll(async () => {
        // Authenticate as System Administrator
        const adminRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "admin@gbs.com",
                password: "Admin123"
            });

        expect(adminRes.status).toBe(200);
        expect(adminRes.body.success).toBe(true);
        expect(adminRes.body.data.token).toBeDefined();
        adminToken = adminRes.body.data.token;

        // Authenticate as Permanent Developer
        const devRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "developer@gbs.com",
                password: "Admin123"
            });

        expect(devRes.status).toBe(200);
        expect(devRes.body.data.user.role).toBe("DEVELOPER");
        devToken = devRes.body.data.token;
    });

    afterAll(async () => {
        // Cleanup test doctor
        if (testDoctorId) {
            await prisma.auditLog.deleteMany({ where: { userId: testDoctorId } });
            await prisma.user.deleteMany({ where: { id: testDoctorId } });
        }
        await prisma.$disconnect();
    });

    test("1. User Signup: Rejects registration with invalid role", async () => {
        const res = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                firstName: "Fake",
                lastName: "Role",
                email: "fake@gbs.com",
                password: "Password123!",
                role: "NON_EXISTENT_ROLE"
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("2. User Signup: Requires all fields and creates pending account with valid role", async () => {
        const res = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                firstName: "Gregory",
                lastName: "House",
                email: testDoctorEmail,
                password: "SecurePassword123!",
                role: "DOCTOR"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.role).toBe("DOCTOR");
        expect(res.body.data.active).toBe(false);
        expect(res.body.data.status).toBe("PENDING_APPROVAL");
        testDoctorId = res.body.data.id;
    });

    test("3. User Login: Blocks pending account until approved by administrator", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: testDoctorEmail,
                password: "SecurePassword123!"
            });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });

    test("4. On-Demand Role User Counts: Rejects unauthenticated request", async () => {
        const res = await request(app).get("/api/v1/users/counts-by-role");
        expect(res.status).toBe(401);
    });

    test("5. On-Demand Role User Counts: Returns real database counts for all roles to Administrator", async () => {
        const res = await request(app)
            .get("/api/v1/users/counts-by-role")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("summary");
        expect(res.body.data).toHaveProperty("roles");
        expect(Array.isArray(res.body.data.roles)).toBe(true);

        const doctorRoleCount = res.body.data.roles.find((r) => r.roleName === "DOCTOR");
        expect(doctorRoleCount).toBeDefined();
        expect(doctorRoleCount.totalUsers).toBeGreaterThanOrEqual(1);
        expect(doctorRoleCount.inactiveUsers).toBeGreaterThanOrEqual(1);
    });

    test("6. User Cross-Check: Administrator can view pending user in database list", async () => {
        const res = await request(app)
            .get(`/api/v1/users?role=DOCTOR&active=false`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const found = res.body.data.users.find((u) => u.id === testDoctorId);
        expect(found).toBeDefined();
        expect(found.email).toBe(testDoctorEmail);
        expect(found.active).toBe(false);
    });

    test("7. User Approval: Administrator approves the doctor account", async () => {
        const res = await request(app)
            .patch(`/api/v1/users/${testDoctorId}/approve`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.active).toBe(true);
        expect(res.body.data.status).toBe("ACTIVE");
    });

    test("8. User Login: Approved doctor successfully authenticates and receives JWT with DOCTOR role", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: testDoctorEmail,
                password: "SecurePassword123!"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.role).toBe("DOCTOR");
        expect(res.body.data.token).toBeDefined();

        // Verify profile through GET /api/v1/auth/me
        const meRes = await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", `Bearer ${res.body.data.token}`);

        expect(meRes.status).toBe(200);
        expect(meRes.body.data.role).toBe("DOCTOR");
        expect(meRes.body.data.active).toBe(true);
    });
});
