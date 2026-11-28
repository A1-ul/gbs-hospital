"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 38 VERIFICATION: INTERNATIONAL COUNTRIES & MULTILINGUAL ENGINE
50 Countries Across 5 Global Regions + 10 Languages (incl. Arabic RTL)
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");
const { generateToken } = require("../src/core/security/jwt");

describe("Phase 38 — International Countries & Multilingual Engine", () => {
    let adminToken;
    let nurseToken;
    let initialProfile;

    beforeAll(async () => {
        const adminUser = await prisma.user.findFirst({
            where: { role: { name: "ADMINISTRATOR" }, active: true },
            include: { role: true }
        });
        expect(adminUser).toBeTruthy();
        adminToken = generateToken({
            id: adminUser.id,
            email: adminUser.email,
            role: adminUser.role.name,
            hospitalId: adminUser.hospitalId
        });

        const nurseUser = await prisma.user.findFirst({
            where: { role: { name: "NURSE" }, active: true },
            include: { role: true }
        });
        if (nurseUser) {
            nurseToken = generateToken({
                id: nurseUser.id,
                email: nurseUser.email,
                role: nurseUser.role.name,
                hospitalId: nurseUser.hospitalId
            });
        }

        const profileRes = await request(app).get("/api/v1/international/profile");
        initialProfile = profileRes.body?.data || { countryCode: "GH", languageCode: "en" };
    });

    afterAll(async () => {
        if (adminToken && initialProfile) {
            await request(app)
                .put("/api/v1/international/profile")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    countryCode: initialProfile.countryCode || "GH",
                    languageCode: initialProfile.languageCode || "en"
                });
        }
    });

    test("1. GET /api/v1/international/countries returns 50 international countries across 5 global regions", async () => {
        const res = await request(app).get("/api/v1/international/countries");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.totalSupportedCountries).toBe(50);
        expect(res.body.data.countries.length).toBe(50);
        expect(res.body.data.regions).toEqual(["Africa", "Europe", "Americas", "Middle East", "Asia-Pacific"]);

        const codes = res.body.data.countries.map((c) => c.code);
        for (const required of ["GH", "NG", "KE", "ZA", "GB", "US", "FR", "DE", "AE", "IN", "CN", "BR", "AU"]) {
            expect(codes).toContain(required);
        }
        expect(typeof res.body.data.countries[0].registeredTenants).toBe("number");
    });

    test("2. Supports region and keyword filtering on /api/v1/international/countries", async () => {
        const africaRes = await request(app).get("/api/v1/international/countries?region=Africa");
        expect(africaRes.status).toBe(200);
        expect(africaRes.body.data.filteredCount).toBe(18);
        expect(africaRes.body.data.countries.every((c) => c.region === "Africa")).toBe(true);

        const searchRes = await request(app).get("/api/v1/international/countries?search=Kenya");
        expect(searchRes.status).toBe(200);
        expect(searchRes.body.data.filteredCount).toBe(1);
        expect(searchRes.body.data.countries[0].code).toBe("KE");
        expect(searchRes.body.data.countries[0].currencyCode).toBe("KES");
    });

    test("3. GET /api/v1/international/countries/:code returns exact profile and 404 for unknown code", async () => {
        const ghRes = await request(app).get("/api/v1/international/countries/GH");
        expect(ghRes.status).toBe(200);
        expect(ghRes.body.data.code).toBe("GH");
        expect(ghRes.body.data.currencyCode).toBe("GHS");
        expect(ghRes.body.data.healthInsuranceScheme).toContain("NHIS");

        const badRes = await request(app).get("/api/v1/international/countries/ZZ");
        expect(badRes.status).toBe(404);
    });

    test("4. GET /api/v1/international/languages & /i18n/languages return all 10 languages including Arabic RTL", async () => {
        const res = await request(app).get("/api/v1/international/languages");
        expect(res.status).toBe(200);
        expect(res.body.data.totalSupportedLanguages).toBe(10);
        const langs = res.body.data.languages;
        const langCodes = langs.map((l) => l.code);
        expect(langCodes).toEqual(["en", "fr", "es", "pt", "ar", "sw", "tw", "de", "hi", "zh"]);

        const arabic = langs.find((l) => l.code === "ar");
        expect(arabic.dir).toBe("rtl");

        const aliasRes = await request(app).get("/api/v1/i18n/languages");
        expect(aliasRes.status).toBe(200);
        expect(aliasRes.body.data.totalSupportedLanguages).toBe(10);
    });

    test("5. PUT /api/v1/international/profile enforces auth (401) and admin RBAC (403)", async () => {
        const unauthRes = await request(app)
            .put("/api/v1/international/profile")
            .send({ countryCode: "GB", languageCode: "en" });
        expect(unauthRes.status).toBe(401);

        if (nurseToken) {
            const forbiddenRes = await request(app)
                .put("/api/v1/international/profile")
                .set("Authorization", `Bearer ${nurseToken}`)
                .send({ countryCode: "GB", languageCode: "en" });
            expect(forbiddenRes.status).toBe(403);
        }
    });

    test("6. Administrator can update international profile, validates invalid codes, and records PostgreSQL AuditLog", async () => {
        const badLang = await request(app)
            .put("/api/v1/international/profile")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ countryCode: "GB", languageCode: "xx" });
        expect(badLang.status).toBe(400);

        const updateRes = await request(app)
            .put("/api/v1/international/profile")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ countryCode: "FR", languageCode: "fr" });
        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.countryCode).toBe("FR");
        expect(updateRes.body.data.currencyCode).toBe("EUR");
        expect(updateRes.body.data.languageCode).toBe("fr");

        const latestAudit = await prisma.auditLog.findFirst({
            where: { action: "HOSPITAL_LOCALE_UPDATED", module: "INTERNATIONAL" },
            orderBy: { createdAt: "desc" }
        });
        expect(latestAudit).toBeTruthy();
        expect(latestAudit.description).toContain("France");
    });
});
