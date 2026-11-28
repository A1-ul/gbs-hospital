"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 39 VERIFICATION: FILE 2 DEPLOYMENT REGISTRY,
126-MODEL BACKUP PARITY & RENDER-ONLY HOSTING POLICY
====================================================
*/

const fs = require("fs");
const path = require("path");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");
const { generateToken } = require("../src/core/security/jwt");

describe("Phase 39 — File 2 Central Deployment Registry, 126-Model Backup Parity & Render-Only Policy", () => {
    let devToken;
    let adminToken;

    beforeAll(async () => {
        const [devUser, adminUser] = await Promise.all([
            prisma.user.findFirst({ where: { role: { name: "DEVELOPER" }, active: true }, include: { role: true } }),
            prisma.user.findFirst({ where: { role: { name: "ADMINISTRATOR" }, active: true }, include: { role: true } })
        ]);
        expect(devUser).toBeTruthy();
        expect(adminUser).toBeTruthy();

        devToken = generateToken({ id: devUser.id, email: devUser.email, role: "DEVELOPER", hospitalId: devUser.hospitalId });
        adminToken = generateToken({ id: adminUser.id, email: adminUser.email, role: "ADMINISTRATOR", hospitalId: adminUser.hospitalId });
    });

    test("1. GET /api/v1/rcce/developer/remote/deployment-registry strictly blocks unauthenticated (401) and non-Developer admin (403)", async () => {
        const unauth = await request(app).get("/api/v1/rcce/developer/remote/deployment-registry");
        expect(unauth.status).toBe(401);

        const forbidden = await request(app)
            .get("/api/v1/rcce/developer/remote/deployment-registry")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(forbidden.status).toBe(403);
    });

    test("2. Authenticated Developer receives all 8 mandatory File 2 Deployment Registry fields with live PostgreSQL probe", async () => {
        const res = await request(app)
            .get("/api/v1/rcce/developer/remote/deployment-registry")
            .set("Authorization", `Bearer ${devToken}`);

        expect(res.status).toBe(200);
        const payload = res.body?.data;
        expect(payload).toBeTruthy();
        expect(payload.officialAccountEmail).toBe("gabosei48@gmail.com");
        expect(payload.approvedHostingProvider).toContain("Render");

        const sys = payload.primarySystem;
        expect(sys.systemName).toBe("GBS Hospital Management System");
        expect(sys.githubRepository).toContain("github.com");
        expect(sys.renderServiceName).toBe("gbs-hospital-system");
        expect(sys.liveWebsiteAddress).toBe("https://gbs-hospital-system.onrender.com");
        expect(sys.deploymentStatus).toBeTruthy();
        expect(sys.lastSuccessfulDeployment).toBeTruthy();
        expect(sys.databaseConnectionStatus).toMatch(/^CONNECTED/);
        expect(sys.hostingPlan).toContain("Render");
    });

    test("3. Backup service covers 100% of Prisma schema models (126/126) and Render-only config has zero Vercel/Netlify/Railway refs", () => {
        const rootDir = path.resolve(__dirname, "../..");
        const schema = fs.readFileSync(path.join(rootDir, "Backend", "prisma", "schema.prisma"), "utf8");
        const backupSvc = fs.readFileSync(
            path.join(rootDir, "Backend", "src", "modules", "tenant-management", "backup-and-environment.service.js"),
            "utf8"
        );
        const renderYaml = fs.readFileSync(path.join(rootDir, "render.yaml"), "utf8");

        const schemaModels = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1][0].toLowerCase() + m[1].slice(1));
        const blockMatch = backupSvc.match(/const FULL_BACKUP_MODEL_LIST = Object\.freeze\(\[([\s\S]*?)\]\);/);
        expect(blockMatch).toBeTruthy();
        const backupModels = [...blockMatch[1].matchAll(/"([a-zA-Z0-9_]+)"/g)].map((m) => m[1]);

        expect(schemaModels.length).toBe(126);
        expect(backupModels.length).toBe(126);
        expect(schemaModels.filter((m) => !backupModels.includes(m))).toEqual([]);

        expect(renderYaml).toContain("gbs-hospital-system");
        expect(renderYaml).not.toMatch(/\b(vercel|netlify|railway)\b/i);
    });
});
