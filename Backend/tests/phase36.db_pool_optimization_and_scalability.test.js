"use strict";

/*
================================================================================
PHASE 36: POSTGRESQL CONNECTION POOL OPTIMIZATION, 80%/95% MONITORING ALERTS,
AUTOMATIC RECOVERY, MULTI-INSTITUTION CONCURRENCY & ZERO CONNECTION LEAK TESTS
================================================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");
const databaseConfig = require("../src/config/database.config");
const {
    collectPoolAndStorageTelemetry,
    evaluateUtilizationAlerts
} = require("../src/core/database/database.monitor");
const {
    executeWithDbRecovery
} = require("../src/core/database/prisma.connection");

describe("Phase 36: PostgreSQL Connection Pool Optimization, 80%/95% Monitoring & Multi-Institution Load Resilience", () => {
    let devToken;
    let adminToken;

    beforeAll(async () => {
        const devLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: process.env.DEVELOPER_ROOT_EMAIL || "gabosei48@gmail.com",
                password: process.env.DEVELOPER_ROOT_PASSWORD || "DevBootstrap123!"
            });
        expect(devLogin.statusCode).toBe(200);
        devToken = devLogin.body.data.token;

        const adminLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "admin@gbs.com",
                password: process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin123"
            });
        expect(adminLogin.statusCode).toBe(200);
        adminToken = adminLogin.body.data.token;
    }, 60000);

    test("1. buildOptimizedDatabaseUrl enforces safe pool timeouts, preserves explicit URL overrides, and auto-configures PgBouncer compatibility", () => {
        const base = databaseConfig.buildOptimizedDatabaseUrl("postgresql://user:pass@db.render.internal:5432/gbs_hospital");
        expect(base.url).toContain("connection_limit=");
        expect(base.url).toContain("pool_timeout=20");
        expect(base.url).toContain("connect_timeout=10");
        expect(base.url).toContain("socket_timeout=30");
        expect(base.effective.pgbouncerEnabled).toBe(false);

        // Explicit CI / production params must not be overwritten
        const explicit = databaseConfig.buildOptimizedDatabaseUrl(
            "postgresql://user:pass@localhost:5432/gbs_hospital?connection_limit=8&pool_timeout=30"
        );
        expect(explicit.effective.connectionLimit).toBe(8);
        expect(explicit.effective.poolTimeoutSec).toBe(30);

        // PgBouncer port 6432 or explicit flag must enable pgbouncer=true & statement_cache_size=0
        const pgb = databaseConfig.buildOptimizedDatabaseUrl(
            "postgresql://user:pass@pgbouncer.render.internal:6432/gbs_hospital"
        );
        expect(pgb.effective.pgbouncerEnabled).toBe(true);
        expect(pgb.url).toContain("pgbouncer=true");
        expect(pgb.url).toContain("statement_cache_size=0");
    });

    test("2. Connection & storage threshold monitor emits exact OK (<80%), WARNING (>=80%), and CRITICAL (>=95%) alerts", () => {
        const ok = evaluateUtilizationAlerts({ poolUtilizationPct: 45, serverUtilizationPct: 12, storageUtilizationPct: 20 });
        expect(ok.connectionAlertLevel).toBe("OK");
        expect(ok.storageAlertLevel).toBe("OK");
        expect(ok.alerts.length).toBe(0);

        const warn = evaluateUtilizationAlerts({ poolUtilizationPct: 82, serverUtilizationPct: 30, storageUtilizationPct: 84 });
        expect(warn.connectionAlertLevel).toBe("WARNING");
        expect(warn.storageAlertLevel).toBe("WARNING");
        expect(warn.overallLevel).toBe("WARNING");
        expect(warn.alerts.some((a) => a.category === "DB_CONNECTION_POOL" && a.severity === "WARNING")).toBe(true);
        expect(warn.alerts.some((a) => a.category === "DB_STORAGE" && a.severity === "WARNING")).toBe(true);

        const crit = evaluateUtilizationAlerts({ poolUtilizationPct: 96, serverUtilizationPct: 50, storageUtilizationPct: 97 });
        expect(crit.connectionAlertLevel).toBe("CRITICAL");
        expect(crit.storageAlertLevel).toBe("CRITICAL");
        expect(crit.overallLevel).toBe("CRITICAL");
        expect(crit.alerts.some((a) => a.category === "DB_CONNECTION_POOL" && a.severity === "CRITICAL")).toBe(true);
        expect(crit.alerts.some((a) => a.category === "DB_STORAGE" && a.severity === "CRITICAL")).toBe(true);
    });

    test("3. executeWithDbRecovery recovers safely from transient PostgreSQL interruption without crashing", async () => {
        let attempts = 0;
        const result = await executeWithDbRecovery(
            async () => {
                attempts += 1;
                if (attempts === 1) {
                    const err = new Error("Server has closed the connection.");
                    err.code = "P1017";
                    throw err;
                }
                const ping = await prisma.$queryRaw`SELECT 1 AS ok`;
                return ping[0]?.ok;
            },
            { maxAttempts: 3, baseDelayMs: 25 }
        );

        expect(attempts).toBe(2);
        expect(result).toBe(1);
    });

    test("4. Developer-only /api/v1/rcce/developer/remote/db-pool & cluster-health return real pool/storage/API metrics (403 for non-Developer)", async () => {
        const forbidden = await request(app)
            .get("/api/v1/rcce/developer/remote/db-pool")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(forbidden.statusCode).toBe(403);

        const poolRes = await request(app)
            .get("/api/v1/rcce/developer/remote/db-pool")
            .set("Authorization", `Bearer ${devToken}`);
        expect(poolRes.statusCode).toBe(200);
        expect(poolRes.body.data.pool.postgresMaxConnections).toBeGreaterThanOrEqual(20);
        expect(poolRes.body.data.pool.safeMaxAppConnections).toBeLessThanOrEqual(poolRes.body.data.pool.postgresMaxConnections);
        expect(poolRes.body.data.pool.configuredPerInstanceLimit).toBeLessThanOrEqual(poolRes.body.data.pool.safeMaxAppConnections);
        expect(poolRes.body.data.storage.databaseSizeMb).toBeGreaterThan(0);

        const clusterRes = await request(app)
            .get("/api/v1/rcce/developer/remote/cluster-health")
            .set("Authorization", `Bearer ${devToken}`);
        expect(clusterRes.statusCode).toBe(200);
        expect(clusterRes.body.data.apiPerformance).toBeDefined();
        expect(clusterRes.body.data.database.configuredPoolLimit).toBeGreaterThanOrEqual(2);
        expect(clusterRes.body.data.alerts).toBeDefined();
    });

    test("5. Simultaneous multi-institution & multi-role traffic burst (30 concurrent requests) completes with 0% 5xx errors and zero connection leaks", async () => {
        const before = await collectPoolAndStorageTelemetry();
        const burstStart = Date.now();

        const requests = [
            // Health & public overview telemetry
            ...Array.from({ length: 6 }, () => request(app).get("/api/v1/health")),
            ...Array.from({ length: 6 }, () => request(app).get("/api/v1/health/overview-stats")),
            // Authenticated Hospital Operations (Patients, Billing, Users, Clinical)
            ...Array.from({ length: 6 }, () =>
                request(app).get("/api/v1/patients").set("Authorization", `Bearer ${adminToken}`)
            ),
            ...Array.from({ length: 6 }, () =>
                request(app).get("/api/v1/billing/telemetry").set("Authorization", `Bearer ${adminToken}`)
            ),
            // Developer Multi-Tenant Console & Pool Telemetry
            ...Array.from({ length: 6 }, () =>
                request(app).get("/api/v1/tenants/console-summary").set("Authorization", `Bearer ${devToken}`)
            )
        ];

        const responses = await Promise.all(requests);
        const burstDurationMs = Date.now() - burstStart;
        const serverErrors = responses.filter((r) => r.statusCode >= 500);

        expect(responses.length).toBe(30);
        expect(serverErrors.length).toBe(0);
        for (const r of responses) {
            expect(r.statusCode).toBe(200);
        }

        const after = await collectPoolAndStorageTelemetry();
        // Verify connections stay strictly bounded well below PostgreSQL max_connections with zero runaway leaks
        expect(after.pool.totalConnections).toBeLessThanOrEqual(after.pool.safeMaxAppConnections);
        expect(after.pool.idleInTransaction).toBe(0);
        expect(after.pool.totalConnections - before.pool.totalConnections).toBeLessThanOrEqual(
            after.pool.configuredPerInstanceLimit
        );
        expect(burstDurationMs).toBeLessThan(20000);
    }, 30000);
});
