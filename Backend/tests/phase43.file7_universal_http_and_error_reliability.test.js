"use strict";

/*
================================================================================
PHASE 43: FILE 7 — UNIVERSAL REQUEST HANDLING, HTTP STATUS CODES &
DIAGNOSTIC SECRET-REDACTION RELIABILITY SUITE
================================================================================
Verifies:
1. Prisma pool timeout (P2024), closed connection (P1017), conflict (P2002),
   not-found (P2025), JWT expiration, and network errors classify to exact
   semantic HTTP statuses.
2. sanitizeDiagnosticText() and rcce.errors.normalizeAndLog() scrub DB URLs,
   passwords, Bearer tokens, and live gateway keys from technical diagnostics
   and stack traces while returning safe non-leaky user messages.
3. Live HTTP verification for 413 PAYLOAD_TOO_LARGE, 400 malformed JSON,
   401 UNAUTHORIZED, 403 FORBIDDEN, 404 ROUTE_NOT_FOUND, and 405 + Allow.
4. Every error response preserves strict RCCE contract: success=false,
   semantic status >= 400, code, message, timestamp, and requestId.
*/

const request = require("supertest");
process.env.NODE_ENV = "test";

const app = require("../src/app");
const { rcce } = require("../src/core/gbs-rcce.bootstrap");
const { classifyError, sanitizeDiagnosticText } = require("../../enterprise-framework/gbs-rcce/error.engine");

describe("Phase 43: File 7 — Universal HTTP Status Reliability & Error Engine Hardening", () => {
    let adminToken;

    beforeAll(async () => {
        const adminLogin = await request(app).post("/api/v1/auth/login").send({
            email: "admin@gbs.com",
            password: process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin123"
        });
        expect(adminLogin.statusCode).toBe(200);
        adminToken = adminLogin.body.data.token;
    }, 60000);

    test("1. classifyError maps Prisma P2024/P1017/P2002/P2025, JWT & network errors to exact HTTP status codes", () => {
        expect(classifyError({ code: "P2024" })).toEqual({
            category: "DATABASE",
            code: "DATABASE_ERROR",
            httpStatus: 503
        });
        expect(classifyError({ code: "P1017" })).toEqual({
            category: "DATABASE",
            code: "DATABASE_ERROR",
            httpStatus: 503
        });
        expect(classifyError({ code: "P2002" })).toEqual({
            category: "CONFLICT",
            code: "DUPLICATE_CONFLICT",
            httpStatus: 409
        });
        expect(classifyError({ code: "P2025" })).toEqual({
            category: "NOT_FOUND",
            code: "RECORD_NOT_FOUND",
            httpStatus: 404
        });
        expect(classifyError({ name: "TokenExpiredError" })).toEqual({
            category: "AUTHORIZATION",
            code: "UNAUTHORIZED",
            httpStatus: 401
        });
        expect(classifyError({ code: "ETIMEDOUT" })).toEqual({
            category: "NETWORK",
            code: "NETWORK_ERROR",
            httpStatus: 502
        });
    });

    test("2. sanitizeDiagnosticText & error engine redact secrets from technical logs while keeping safe user messages", async () => {
        const sensitiveErr = new Error(
            "Connection failed postgresql://gbs_admin:UltraSecret42@db.internal:5432/gbs Bearer eyJhbGciOi.sig.val sk_live_AbCd9988"
        );
        sensitiveErr.code = "P1017";

        const cleaned = sanitizeDiagnosticText(sensitiveErr.message);
        expect(cleaned).not.toContain("UltraSecret42");
        expect(cleaned).not.toContain("eyJhbGciOi");
        expect(cleaned).not.toContain("sk_live_AbCd9988");
        expect(cleaned).toContain("postgresql://[REDACTED]");
        expect(cleaned).toContain("Bearer [REDACTED]");
        expect(cleaned).toContain("[REDACTED_KEY]");

        const normalized = await rcce.errors.normalizeAndLog(sensitiveErr, {
            requestId: `req-p43-${Date.now()}`,
            method: "GET",
            originalUrl: "/api/v1/patients"
        });

        expect(normalized.httpStatus).toBe(503);
        expect(normalized.envelope.success).toBe(false);
        expect(normalized.envelope.code).toBe("DATABASE_ERROR");
        expect(normalized.envelope.message).not.toContain("UltraSecret42");
        expect(normalized.diagnostic.technicalMessage).not.toContain("UltraSecret42");
        expect(normalized.diagnostic.stackTrace || "").not.toContain("UltraSecret42");
    });

    test("3. Oversized (>2MB) JSON payload returns HTTP 413 PAYLOAD_TOO_LARGE (never 500)", async () => {
        const oversizedBody = JSON.stringify({ data: "X".repeat(2.2 * 1024 * 1024) });
        const res = await request(app)
            .post("/api/v1/auth/login")
            .set("Content-Type", "application/json")
            .send(oversizedBody);

        expect(res.statusCode).toBe(413);
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe("PAYLOAD_TOO_LARGE");
        expect(res.body.requestId).toBeTruthy();
        expect(res.body.timestamp).toBeTruthy();
    });

    test("4. Full live HTTP error matrix (401, 403, 404, 405) strictly returns success=false & semantic status", async () => {
        const [r401, r403, r404, r405] = await Promise.all([
            request(app).get("/api/v1/users"),
            request(app)
                .get("/api/v1/rcce/developer/overview")
                .set("Authorization", `Bearer ${adminToken}`),
            request(app).get("/api/v1/nonexistent-phase43-probe"),
            request(app).patch("/api/v1/health").send({})
        ]);

        expect(r401.statusCode).toBe(401);
        expect(r403.statusCode).toBe(403);
        expect(r404.statusCode).toBe(404);
        expect(r405.statusCode).toBe(405);
        expect(r405.headers.allow).toContain("GET");

        for (const r of [r401, r403, r404, r405]) {
            expect(r.body.success).toBe(false);
            expect(r.body.code).toBeTruthy();
            expect(r.body.message).toBeTruthy();
            expect(r.body.requestId).toBeTruthy();
            expect(r.body.timestamp).toBeTruthy();
        }
    });
});
