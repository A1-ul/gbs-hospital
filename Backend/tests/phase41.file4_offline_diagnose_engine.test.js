"use strict";

/*
================================================================================
PHASE 41: FILE 4 — OFFLINE DIAGNOSE CENTRAL ENGINE & CORS/RECOVERY VERIFICATION
================================================================================
Verifies:
1. CORS preflight OPTIONS /api/v1/health permits X-GBS-Health-Probe,
   X-GBS-Country, Accept-Language, and Idempotency-Key (eliminating false
   Central Engine Offline rejections in cross-origin deployments).
2. GET /api/v1/health/connection-diagnostics reports real Central Engine
   subsystem counts (6/6), independent Backend/Engine/Database probes, and
   enforces strict Developer-only access control (401 unauth, 403 Admin, 200 Dev).
3. sanitizeErrorReason() strips PostgreSQL URIs, passwords, Bearer tokens,
   API keys, and gateway secrets cleanly.
4. computeOverallStatus() and failure-to-recovery monitoring truthfully reflect
   ONLINE, DEGRADED, and OFFLINE states and track recoveries after errors.
*/

const request = require("supertest");
process.env.NODE_ENV = "test";

const app = require("../src/app");
const connectionMonitor = require("../src/core/monitoring/connection-monitor.service");

describe("Phase 41: File 4 — Offline Diagnose Central Engine, CORS & Recovery Verification", () => {
    let adminToken;
    let devToken;

    beforeAll(async () => {
        const [adminLogin, devLogin] = await Promise.all([
            request(app).post("/api/v1/auth/login").send({
                email: "admin@gbs.com",
                password: process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin123"
            }),
            request(app).post("/api/v1/auth/login").send({
                email: process.env.DEVELOPER_ROOT_EMAIL || "gabosei48@gmail.com",
                password: process.env.DEVELOPER_ROOT_PASSWORD || "CiTestDevPassword2026!"
            })
        ]);

        expect(adminLogin.statusCode).toBe(200);
        expect(devLogin.statusCode).toBe(200);
        adminToken = adminLogin.body.data.token;
        devToken = devLogin.body.data.token;
    }, 60000);

    test("1. CORS preflight accepts X-GBS-Health-Probe, X-GBS-Country, Accept-Language, and Idempotency-Key", async () => {
        const preflight = await request(app)
            .options("/api/v1/health")
            .set("Origin", "https://gbs-hospital-system.onrender.com")
            .set("Access-Control-Request-Method", "GET")
            .set("Access-Control-Request-Headers", "X-GBS-Health-Probe, X-GBS-Country, Accept-Language, Idempotency-Key");

        expect([200, 204]).toContain(preflight.statusCode);
        const allowHeaders = String(preflight.headers["access-control-allow-headers"] || "").toLowerCase();
        expect(allowHeaders).toContain("x-gbs-health-probe");
        expect(allowHeaders).toContain("x-gbs-country");
        expect(allowHeaders).toContain("accept-language");
        expect(allowHeaders).toContain("idempotency-key");
    });

    test("2. Connection diagnostics reports real 6/6 Central Engine subsystems and restricts to Developer only", async () => {
        const unauthRes = await request(app).get("/api/v1/health/connection-diagnostics");
        expect(unauthRes.statusCode).toBe(401);

        const adminRes = await request(app)
            .get("/api/v1/health/connection-diagnostics")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(adminRes.statusCode).toBe(403);

        const devRes = await request(app)
            .get("/api/v1/health/connection-diagnostics")
            .set("Authorization", `Bearer ${devToken}`);
        expect(devRes.statusCode).toBe(200);
        expect(devRes.body.data.overallStatus).toBe("ONLINE");
        expect(devRes.body.data.components.centralEngine.status).toBe("ONLINE");
        expect(devRes.body.data.components.centralEngine.healthySubsystems).toBe(6);
        expect(devRes.body.data.components.centralEngine.totalSubsystems).toBe(6);
        expect(devRes.body.data.components.database.connected).toBe(true);
        expect(typeof devRes.body.data.components.backend.uptimeSeconds).toBe("number");
        expect(devRes.body.data.telemetry.lastSuccessfulConnection).toBeTruthy();
    });

    test("3. sanitizeErrorReason() strips database URLs, passwords, Bearer tokens, and secret keys", () => {
        const raw =
            "Failed connect postgresql://gbs_user:SuperSecret99@db.render.internal:5432/gbs_hospital Bearer eyJhbGciOiJIUzI1NiJ9.abc.def api_key=mykey123 sk_live_AbCdEf123456";
        const clean = connectionMonitor.sanitizeErrorReason(raw);

        expect(clean).not.toContain("SuperSecret99");
        expect(clean).not.toContain("eyJhbGciOiJIUzI1NiJ9");
        expect(clean).not.toContain("mykey123");
        expect(clean).not.toContain("sk_live_AbCdEf123456");
        expect(clean).toContain("postgresql://[REDACTED]");
        expect(clean).toContain("Bearer [REDACTED]");
        expect(clean).toContain("[REDACTED_KEY]");
    });

    test("4. computeOverallStatus() and live recovery probe preserve truthful ONLINE/DEGRADED/OFFLINE transitions", async () => {
        expect(connectionMonitor.computeOverallStatus({ centralEngineStatus: "ONLINE", databaseStatus: "ONLINE" })).toBe("ONLINE");
        expect(connectionMonitor.computeOverallStatus({ centralEngineStatus: "ONLINE", databaseStatus: "DEGRADED" })).toBe("DEGRADED");
        expect(connectionMonitor.computeOverallStatus({ centralEngineStatus: "ONLINE", databaseStatus: "OFFLINE" })).toBe("DEGRADED");
        expect(connectionMonitor.computeOverallStatus({ centralEngineStatus: "OFFLINE", databaseStatus: "OFFLINE" })).toBe("OFFLINE");

        // Record a sanitized transient connection error then verify live recovery probe restores ONLINE
        const errEntry = connectionMonitor.recordConnectionError(
            "DATABASE",
            new Error("Transient pool reconnect password=hidden_pwd"),
            "TRANSIENT_DB_TEST"
        );
        expect(errEntry.reason).not.toContain("hidden_pwd");

        const recovered = await connectionMonitor.evaluateConnectionHealth({ timeoutMs: 5000 });
        expect(recovered.overallStatus).toBe("ONLINE");
        expect(recovered.httpStatus).toBe(200);
        expect(recovered.components.centralEngine.healthySubsystems).toBe(6);
        expect(recovered.telemetry.lastSuccessfulConnection).toBeTruthy();
        expect(recovered.telemetry.recentConnectionErrors.length).toBeGreaterThanOrEqual(1);
    });
});
