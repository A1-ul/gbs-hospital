"use strict";

const request = require("supertest");

process.env.NODE_ENV = "test";

const app = require("../src/app");

describe("Phase 0 API routing", () => {
    test("GET /api/v1/health responds with JSON status payload", async () => {
        const response = await request(app).get("/api/v1/health");

        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(600);
        expect(response.body).toHaveProperty("status");
        expect(response.body).toHaveProperty("server", "running");
        expect(response.body).toHaveProperty("engine", "PostgreSQL");
    });

    test("POST /api/v1/auth/login rejects missing credentials", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({});

        expect(response.status).toBeGreaterThanOrEqual(400);
    });
});
