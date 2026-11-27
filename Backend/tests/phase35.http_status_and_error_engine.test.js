"use strict";

/*
================================================================================
PHASE 35: UNIVERSAL HTTP STATUS CODE & ERROR ENGINE RELIABILITY VERIFICATION
================================================================================
Verifies GBS Universal Software Reliability Standard (Section 3 & 4):
- 200 OK (healthy API read)
- 400 Bad Request on malformed JSON payload (NEVER 500)
- 401 Unauthorized on unauthenticated protected endpoint
- 403 Forbidden on insufficient RBAC permission and disallowed CORS origin
- 404 Not Found on truly non-existent API path
- 405 Method Not Allowed with RFC `Allow` header on valid path with unsupported HTTP method
- 409 Conflict on duplicate unique user registration
- Full RCCE Error Engine & Response Catalogue classification for 405, 408, 413, 422, 429, 501, 502, 503, 504
*/

const request = require("supertest");
const app = require("../src/app");
const { rcce } = require("../src/core/gbs-rcce.bootstrap");
const { classifyError } = require("../../enterprise-framework/gbs-rcce/error.engine");

describe("Phase 35: Universal HTTP Status Code Management & Error Engine Standard", () => {
    test("1. GET /api/v1/health returns 200 OK with standardized RCCE envelope", async () => {
        const res = await request(app).get("/api/v1/health");
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBe("healthy");
        expect(res.body.requestId).toBeTruthy();
    });

    test("2. Malformed JSON request body returns HTTP 400 VALIDATION_FAILED (never 500)", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .set("Content-Type", "application/json")
            .send('{"email": "broken-json"');

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe("VALIDATION_FAILED");
    });

    test("3. Unauthenticated protected route returns HTTP 401 UNAUTHORIZED", async () => {
        const res = await request(app).get("/api/v1/patients");
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });

    test("4. Disallowed CORS origin returns HTTP 403 CORS_POLICY_VIOLATION (never 500)", async () => {
        const res = await request(app)
            .get("/api/v1/health")
            .set("Origin", "https://unauthorized-external-site.example");

        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe("CORS_POLICY_VIOLATION");
    });

    test("5. Non-existent API route returns HTTP 404 ROUTE_NOT_FOUND", async () => {
        const res = await request(app).get("/api/v1/nonexistent-endpoint-check-35");
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe("ROUTE_NOT_FOUND");
    });

    test("6. Unsupported HTTP method on valid routes returns HTTP 405 METHOD_NOT_ALLOWED with Allow header", async () => {
        const delHealth = await request(app).delete("/api/v1/health");
        expect(delHealth.statusCode).toBe(405);
        expect(delHealth.body.success).toBe(false);
        expect(delHealth.body.code).toBe("METHOD_NOT_ALLOWED");
        expect(delHealth.headers.allow).toContain("GET");

        const putLogin = await request(app).put("/api/v1/auth/login").send({});
        expect(putLogin.statusCode).toBe(405);
        expect(putLogin.body.code).toBe("METHOD_NOT_ALLOWED");
        expect(putLogin.headers.allow).toContain("POST");
    });

    test("7. Duplicate email signup returns HTTP 409 conflict", async () => {
        const res = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                firstName: "Duplicate",
                lastName: "Admin",
                email: "admin@gbs.com",
                password: "StrongPassword123!",
                role: "NURSE"
            });

        expect(res.statusCode).toBe(409);
        expect(res.body.success).toBe(false);
    });

    test("8. GBS-RCCE Error Engine & Catalogue accurately classify all universal HTTP status codes (405, 408, 413, 422, 429, 501, 502, 503, 504)", () => {
        const matrix = [
            { status: 405, code: "METHOD_NOT_ALLOWED" },
            { status: 408, code: "REQUEST_TIMEOUT" },
            { status: 413, code: "PAYLOAD_TOO_LARGE" },
            { status: 422, code: "BUSINESS_RULE_VIOLATION" },
            { status: 429, code: "RATE_LIMIT_EXCEEDED" },
            { status: 501, code: "NOT_IMPLEMENTED" },
            { status: 502, code: "BAD_GATEWAY" },
            { status: 503, code: "SERVICE_UNAVAILABLE" },
            { status: 504, code: "GATEWAY_TIMEOUT" }
        ];

        for (const row of matrix) {
            const classified = classifyError({ statusCode: row.status });
            expect(classified.httpStatus).toBe(row.status);
            expect(classified.code).toBe(row.code);

            const catEntry = rcce.catalogue.get(row.code, row.status, false);
            expect(catEntry.httpStatus).toBe(row.status);
            expect(catEntry.message).toBeTruthy();
        }
    });
});
