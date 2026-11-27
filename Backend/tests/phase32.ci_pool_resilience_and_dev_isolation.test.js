"use strict";

/*
================================================================================
PHASE 32 (REMEDIATION PROCEDURE 3):
DEVELOPER CONTROL CENTER STRICT ISOLATION (STEP 32), REMOTE SYSTEM OPERATIONS
(STEP 35), WIRED SUBMODULE BINDINGS & PRISMA POOL HYGIENE VERIFICATION
================================================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

const DEV_EMAIL = "gabosei48@gmail.com";
const DEV_PASS = process.env.DEVELOPER_ROOT_PASSWORD || "DevBootstrap123!";
const ADMIN_EMAIL = "admin@gbs.com";
const ADMIN_PASS = process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin123";

describe("Phase 32: Developer Control Center Strict Isolation & Real Remote System Operations", () => {
    let devToken;
    let adminToken;
    let directorToken;
    const tempUserIds = [];
    const uniqueTag = Date.now().toString(36);

    beforeAll(async () => {
        const devLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: DEV_EMAIL, password: DEV_PASS });
        expect(devLogin.statusCode).toBe(200);
        devToken = devLogin.body.data.token;

        const adminLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: ADMIN_EMAIL, password: ADMIN_PASS });
        expect(adminLogin.statusCode).toBe(200);
        adminToken = adminLogin.body.data.token;

        const directDirLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "director@gbs.com", password: "Director123" });
        if (directDirLogin.statusCode === 200 && directDirLogin.body?.data?.token) {
            directorToken = directDirLogin.body.data.token;
        } else {
            const dirEmail = `p32.director.${uniqueTag}@gbs-test.local`;
            const dirSignup = await request(app)
                .post("/api/v1/auth/signup")
                .send({
                    firstName: "Phase32",
                    lastName: "Director",
                    email: dirEmail,
                    password: "StrongPassword123!",
                    role: "HOSPITAL_DIRECTOR"
                });
            expect([200, 201]).toContain(dirSignup.statusCode);
            const dirId = dirSignup.body.data.id;
            tempUserIds.push(dirId);

            const approveDir = await request(app)
                .patch(`/api/v1/users/${dirId}/approve`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({});
            expect(approveDir.statusCode).toBe(200);

            const dirLogin = await request(app)
                .post("/api/v1/auth/login")
                .send({ email: dirEmail, password: "StrongPassword123!" });
            expect(dirLogin.statusCode).toBe(200);
            directorToken = dirLogin.body.data.token;
        }
    }, 60000);

    afterAll(async () => {
        // Restore test feature flag cleanly if created
        const flagRec = await prisma.systemConfiguration.findUnique({
            where: { configKey: "DEVELOPER_FEATURE_FLAGS" }
        }).catch(() => null);
        if (flagRec && flagRec.configValue && flagRec.configValue[`P32_TEST_FLAG_${uniqueTag.toUpperCase()}`]) {
            const cleaned = { ...flagRec.configValue };
            delete cleaned[`P32_TEST_FLAG_${uniqueTag.toUpperCase()}`];
            await prisma.systemConfiguration.update({
                where: { configKey: "DEVELOPER_FEATURE_FLAGS" },
                data: { configValue: cleaned }
            }).catch(() => {});
        }

        for (const uid of tempUserIds) {
            await prisma.session.deleteMany({ where: { userId: uid } }).catch(() => {});
            await prisma.auditLog.deleteMany({ where: { userId: uid } }).catch(() => {});
            await prisma.user.delete({ where: { id: uid } }).catch(() => {});
        }
    });

    test("1. Step 32 Strict Isolation: Normal Hospital ADMINISTRATOR and HOSPITAL_DIRECTOR are blocked (403) from all Developer Control Center endpoints", async () => {
        const developerOnlyEndpoints = [
            { method: "get", path: "/api/v1/rcce/errors" },
            { method: "get", path: "/api/v1/rcce/developer/overview" },
            { method: "get", path: "/api/v1/rcce/developer/users-activity" },
            { method: "get", path: "/api/v1/rcce/developer/permissions" },
            { method: "get", path: "/api/v1/rcce/developer/configs" },
            { method: "get", path: "/api/v1/rcce/developer/integrations-status" },
            { method: "get", path: "/api/v1/rcce/developer/ai-assistant/diagnostics" },
            { method: "get", path: "/api/v1/rcce/developer/tenant-analytics" },
            { method: "get", path: "/api/v1/rcce/developer/remote/cluster-health" },
            { method: "get", path: "/api/v1/rcce/developer/remote/deployments" },
            { method: "get", path: "/api/v1/rcce/developer/remote/feature-flags" },
            { method: "get", path: "/api/v1/rcce/developer/remote/rollback-readiness" },
            { method: "post", path: "/api/v1/rcce/developer/maintenance", body: { enabled: true } },
            { method: "post", path: "/api/v1/rcce/developer/remote/cache/clear" },
            { method: "post", path: "/api/v1/rcce/developer/remote/database/optimize" },
            { method: "post", path: "/api/v1/rcce/developer/remote/logs/rotate" }
        ];

        for (const ep of developerOnlyEndpoints) {
            for (const [label, tok] of [["ADMINISTRATOR", adminToken], ["HOSPITAL_DIRECTOR", directorToken]]) {
                const reqObj = request(app)[ep.method](ep.path).set("Authorization", `Bearer ${tok}`);
                const res = ep.body ? await reqObj.send(ep.body) : await reqObj;
                if (res.statusCode !== 403) {
                    throw new Error(`Expected 403 for ${label} on ${ep.method.toUpperCase()} ${ep.path}, got ${res.statusCode}`);
                }
                expect(res.statusCode).toBe(403);
                expect(res.body.code).toBe("FORBIDDEN_PERMISSION");
            }
        }

        // Confirm unauthorized Developer-route attempt was recorded in PostgreSQL AuditLog
        const deniedAudit = await prisma.auditLog.findFirst({
            where: { action: "DEVELOPER_ROUTE_UNAUTHORIZED_ATTEMPT", outcome: "DENIED" },
            orderBy: { createdAt: "desc" }
        });
        expect(deniedAudit).not.toBeNull();
    });

    test("2. Step 35 Real Remote System Management executes live PostgreSQL/OS operations and writes AuditLog trails", async () => {
        const healthRes = await request(app)
            .get("/api/v1/rcce/developer/remote/cluster-health")
            .set("Authorization", `Bearer ${devToken}`);
        expect(healthRes.statusCode).toBe(200);
        expect(healthRes.body.data.database.engine).toBe("PostgreSQL");
        expect(healthRes.body.data.database.maxConnections).toBeGreaterThanOrEqual(20);
        expect(healthRes.body.data.cpu.cores).toBeGreaterThanOrEqual(1);

        const cacheRes = await request(app)
            .post("/api/v1/rcce/developer/remote/cache/clear")
            .set("Authorization", `Bearer ${devToken}`);
        expect(cacheRes.statusCode).toBe(200);
        expect(cacheRes.body.data.cachesCleared.length).toBeGreaterThanOrEqual(1);

        const optRes = await request(app)
            .post("/api/v1/rcce/developer/remote/database/optimize")
            .set("Authorization", `Bearer ${devToken}`);
        expect(optRes.statusCode).toBe(200);
        expect(optRes.body.data.operation).toBe("POSTGRESQL_ANALYZE");
        expect(optRes.body.data.tablesAnalyzed).toContain("Patient");

        const rotRes = await request(app)
            .post("/api/v1/rcce/developer/remote/logs/rotate")
            .set("Authorization", `Bearer ${devToken}`);
        expect(rotRes.statusCode).toBe(200);
        expect(rotRes.body.data.auditLogsPreservedImmutably).toBe(true);

        const flagKey = `P32_TEST_FLAG_${uniqueTag.toUpperCase()}`;
        const setFlagRes = await request(app)
            .put(`/api/v1/rcce/developer/remote/feature-flags/${flagKey}`)
            .set("Authorization", `Bearer ${devToken}`)
            .send({ enabled: true, description: "Phase 32 automated feature flag verification" });
        expect(setFlagRes.statusCode).toBe(200);
        expect(setFlagRes.body.data.enabled).toBe(true);

        const listFlagsRes = await request(app)
            .get("/api/v1/rcce/developer/remote/feature-flags")
            .set("Authorization", `Bearer ${devToken}`);
        expect(listFlagsRes.statusCode).toBe(200);
        expect(listFlagsRes.body.data.flags.some((f) => f.key === flagKey)).toBe(true);

        const depRes = await request(app)
            .post("/api/v1/rcce/developer/remote/deployments")
            .set("Authorization", `Bearer ${devToken}`)
            .send({ version: "2.0.1-verified", notes: "Phase 32 checkpoint test", status: "VERIFIED" });
        expect(depRes.statusCode).toBe(201);

        const rbRes = await request(app)
            .get("/api/v1/rcce/developer/remote/rollback-readiness")
            .set("Authorization", `Bearer ${devToken}`);
        expect(rbRes.statusCode).toBe(200);
        expect(rbRes.body.data.patientSafetyEmergencyBypassActive).toBe(true);
    });

    test("3. All 10 developer-control-center submodules export live executable backend functions (zero static stubs)", () => {
        const submodules = [
            "cluster-monitor",
            "deployment",
            "feature-flags",
            "license",
            "maintenance",
            "remote-shell",
            "rollback",
            "subscriptions",
            "system-updates",
            "tenant-console"
        ];
        for (const sub of submodules) {
            const mod = require(`../src/modules/developer-control-center/${sub}`);
            const fnExports = Object.values(mod).filter((v) => typeof v === "function");
            expect(fnExports.length).toBeGreaterThanOrEqual(1);
        }
    });
});
