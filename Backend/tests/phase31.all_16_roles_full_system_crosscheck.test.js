"use strict";

/*
================================================================================
PHASE 31 (PROCEDURE 6 — PHASE F):
MANDATORY FULL-SYSTEM DASHBOARD-BY-DASHBOARD CROSS-CHECK ACROSS ALL 16 ROLES,
ALL 27 HOSPITAL SUBSYSTEMS, ALL REAL-LIFE VISUAL ASSETS, COMPILED SPA SERVING,
AND ZERO-CREDENTIAL-LEAK / ZERO-MOCK INTEGRITY AUDIT
================================================================================
*/

const fs = require("fs");
const path = require("path");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

const ROOT_DIR = path.resolve(__dirname, "../..");
const FRONTEND_SRC_DIR = path.join(ROOT_DIR, "Frontend", "src");
const FRONTEND_PUBLIC_DIR = path.join(ROOT_DIR, "Frontend", "public");
const FRONTEND_DIST_DIR = path.join(ROOT_DIR, "Frontend", "dist");
const BACKEND_SRC_DIR = path.join(ROOT_DIR, "Backend", "src");

const DEV_EMAIL = "gabosei48@gmail.com";
const DEV_PASS = process.env.DEVELOPER_ROOT_PASSWORD || "DevBootstrap123!";
const ADMIN_EMAIL = "admin@gbs.com";
const ADMIN_PASS = process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin123";

const ROLE_ACCOUNT_MAP = [
    { role: "DEVELOPER", email: DEV_EMAIL, pass: DEV_PASS },
    { role: "ADMINISTRATOR", email: ADMIN_EMAIL, pass: ADMIN_PASS },
    { role: "HOSPITAL_DIRECTOR", email: "director@gbs.com", pass: "Director123" },
    { role: "DOCTOR", email: "doctor@gbs.com", pass: "Doctor123" },
    { role: "SURGEON", email: "surgeon@gbs.com", pass: "Surgeon123" },
    { role: "DENTIST", email: "dentist@gbs.com", pass: "Dentist123" },
    { role: "EYE_DOCTOR", email: "eyedoctor@gbs.com", pass: "EyeDoctor123" },
    { role: "RADIOLOGIST", email: "radiologist@gbs.com", pass: "Radiologist123" },
    { role: "NURSE", email: "nurse@gbs.com", pass: "Nurse123" },
    { role: "PHARMACIST", email: "pharmacist@gbs.com", pass: "Pharmacist123" },
    { role: "LAB_TECHNICIAN", email: "lab@gbs.com", pass: "Lab123" },
    { role: "RECEPTIONIST", email: "receptionist@gbs.com", pass: "Receptionist123" },
    { role: "FOLDER_RETRIEVER", email: "archivist@gbs.com", pass: "Archivist123" },
    { role: "ACCOUNTANT", email: "accountant@gbs.com", pass: "Accountant123" },
    { role: "HR_MANAGER", email: "hr@gbs.com", pass: "HrManager123" },
    { role: "PATIENT", email: "patient@gbs.com", pass: "Patient123" }
];

function walkFiles(dir, results = []) {
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkFiles(full, results);
        } else {
            results.push(full);
        }
    }
    return results;
}

describe("Phase 31: Full 16-Role Dashboard-by-Dashboard End-to-End Cross-Check & Asset/Security Audit", () => {
    const tokensByRole = {};
    const tempUserIds = [];
    const uniqueTag = Date.now().toString(36);

    async function acquireRoleToken(roleDef, adminToken) {
        const directLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: roleDef.email, password: roleDef.pass });
        if (directLogin.statusCode === 200 && directLogin.body?.data?.token) {
            return directLogin.body.data.token;
        }
        // Self-contained fallback (e.g. if phase24 purged non-core seeded accounts)
        const tempEmail = `p31.${roleDef.role.toLowerCase()}.${uniqueTag}@gbs-test.local`;
        const tempPass = "CrossCheck@2026!";
        const signup = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                firstName: "CrossCheck",
                lastName: roleDef.role,
                email: tempEmail,
                password: tempPass,
                role: roleDef.role,
                phone: "+233200001631"
            });
        expect([200, 201]).toContain(signup.statusCode);
        const uid = signup.body.data?.id || signup.body.data?.user?.id;
        tempUserIds.push(uid);

        const approve = await request(app)
            .patch(`/api/v1/users/${uid}/approve`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({});
        expect(approve.statusCode).toBe(200);

        const login = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: tempEmail, password: tempPass });
        expect(login.statusCode).toBe(200);
        return login.body.data.token;
    }

    beforeAll(async () => {
        // Authenticate DEVELOPER & ADMINISTRATOR first
        const devLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: DEV_EMAIL, password: DEV_PASS });
        expect(devLogin.statusCode).toBe(200);
        tokensByRole.DEVELOPER = devLogin.body.data.token;

        const adminLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: ADMIN_EMAIL, password: ADMIN_PASS });
        expect(adminLogin.statusCode).toBe(200);
        tokensByRole.ADMINISTRATOR = adminLogin.body.data.token;

        // Acquire tokens for all remaining 14 Blueprint roles
        for (const roleDef of ROLE_ACCOUNT_MAP) {
            if (!tokensByRole[roleDef.role]) {
                tokensByRole[roleDef.role] = await acquireRoleToken(roleDef, tokensByRole.ADMINISTRATOR);
            }
        }
    }, 60000);

    afterAll(async () => {
        for (const uid of tempUserIds) {
            await prisma.session.deleteMany({ where: { userId: uid } }).catch(() => {});
            await prisma.user.delete({ where: { id: uid } }).catch(() => {});
        }
    });

    test("1. All 16 Master Blueprint Roles authenticate cleanly with live PostgreSQL sessions and zero SUPER_ADMIN", async () => {
        const dbRoles = await prisma.role.findMany({ select: { name: true } });
        const roleNames = dbRoles.map((r) => r.name);
        expect(roleNames).not.toContain("SUPER_ADMIN");
        expect(roleNames.length).toBe(16);

        for (const roleDef of ROLE_ACCOUNT_MAP) {
            const token = tokensByRole[roleDef.role];
            expect(typeof token).toBe("string");
            const meRes = await request(app)
                .get("/api/v1/auth/me")
                .set("Authorization", `Bearer ${token}`);
            expect(meRes.statusCode).toBe(200);
            expect(meRes.body.data.role).toBe(roleDef.role);
        }
    });

    test("2. Every single Role Dashboard & all 27 Hospital Subsystems return live 200 OK PostgreSQL data", async () => {
        const dashboardMatrix = [
            // Executive & Administration
            { role: "ADMINISTRATOR", endpoint: "/api/v1/health/overview-stats" },
            { role: "ADMINISTRATOR", endpoint: "/api/v1/users/counts-by-role" },
            { role: "ADMINISTRATOR", endpoint: "/api/v1/clinical-safety/guardrails-status" },
            { role: "ADMINISTRATOR", endpoint: "/api/v1/meetings/telemetry" },
            { role: "ADMINISTRATOR", endpoint: "/api/v1/documents/telemetry" },
            { role: "ADMINISTRATOR", endpoint: "/api/v1/facility/telemetry" },
            { role: "HOSPITAL_DIRECTOR", endpoint: "/api/v1/quality/stats" },
            { role: "HOSPITAL_DIRECTOR", endpoint: "/api/v1/procurement/stats" },
            { role: "HOSPITAL_DIRECTOR", endpoint: "/api/v1/biomedical/stats" },
            { role: "HOSPITAL_DIRECTOR", endpoint: "/api/v1/mortuary/stats" },

            // Hidden Developer Platform
            { role: "DEVELOPER", endpoint: "/api/v1/tenants/console-summary" },
            { role: "DEVELOPER", endpoint: "/api/v1/rcce/developer/ai-assistant/diagnostics" },
            { role: "DEVELOPER", endpoint: "/api/v1/rcce/developer/integrations-status" },
            { role: "DEVELOPER", endpoint: "/api/v1/rcce/developer/tenant-analytics" },
            { role: "DEVELOPER", endpoint: "/api/v1/biometrics/face/status" },
            { role: "DEVELOPER", endpoint: "/api/v1/biometrics/telemetry" },

            // Clinical & Specialty Dashboards
            { role: "DOCTOR", endpoint: "/api/v1/clinical/doctor/dashboard" },
            { role: "DOCTOR", endpoint: "/api/v1/clinical/doctor/queue" },
            { role: "DOCTOR", endpoint: "/api/v1/ai-clinical/telemetry" },
            { role: "DOCTOR", endpoint: "/api/v1/emergency/stats" },
            { role: "DOCTOR", endpoint: "/api/v1/blood-bank/stats" },
            { role: "SURGEON", endpoint: "/api/v1/surgery/telemetry" },
            { role: "DENTIST", endpoint: "/api/v1/dental/telemetry" },
            { role: "EYE_DOCTOR", endpoint: "/api/v1/eye-clinic/telemetry" },
            { role: "RADIOLOGIST", endpoint: "/api/v1/radiology/telemetry" },
            { role: "NURSE", endpoint: "/api/v1/clinical/nurse/dashboard" },
            { role: "NURSE", endpoint: "/api/v1/clinical/triage/queue" },
            { role: "NURSE", endpoint: "/api/v1/icu/telemetry" },
            { role: "NURSE", endpoint: "/api/v1/admissions/wards" },

            // Diagnostics, Pharmacy, Records, Finance, HR & Patient Self-Service
            { role: "PHARMACIST", endpoint: "/api/v1/pharmacy/dashboard/telemetry" },
            { role: "LAB_TECHNICIAN", endpoint: "/api/v1/laboratory/dashboard/telemetry" },
            { role: "RECEPTIONIST", endpoint: "/api/v1/patients/search?q=" },
            { role: "FOLDER_RETRIEVER", endpoint: "/api/v1/medical-records/folders/retrieval-queue" },
            { role: "ACCOUNTANT", endpoint: "/api/v1/billing/telemetry" },
            { role: "ACCOUNTANT", endpoint: "/api/v1/nhia/telemetry" },
            { role: "HR_MANAGER", endpoint: "/api/v1/hr/stats" },
            { role: "PATIENT", endpoint: "/api/v1/patients/me/dashboard" }
        ];

        for (const check of dashboardMatrix) {
            const res = await request(app)
                .get(check.endpoint)
                .set("Authorization", `Bearer ${tokensByRole[check.role]}`);
            if (res.statusCode !== 200) {
                throw new Error(`Dashboard check failed for ${check.role} -> ${check.endpoint}: HTTP ${res.statusCode} ${JSON.stringify(res.body)}`);
            }
            expect(res.statusCode).toBe(200);
            expect(res.body.success).not.toBe(false);
        }
    }, 30000);

    test("3. Every referenced real-life photographic image exists (>5KB) in Frontend/public and compiled Frontend/dist", async () => {
        const srcFiles = walkFiles(FRONTEND_SRC_DIR).filter((f) => /\.(js|jsx|css)$/i.test(f));
        const referencedImages = new Set();
        const imgRegex = /\/assets\/images\/([a-zA-Z0-9._-]+\.(?:jpg|jpeg|png|webp|ico))/g;

        for (const file of srcFiles) {
            const content = fs.readFileSync(file, "utf8");
            let match;
            while ((match = imgRegex.exec(content)) !== null) {
                referencedImages.add(match[1]);
            }
        }

        expect(referencedImages.size).toBeGreaterThanOrEqual(30);

        for (const imgName of referencedImages) {
            const pubPath = path.join(FRONTEND_PUBLIC_DIR, "assets", "images", imgName);
            const distPath = path.join(FRONTEND_DIST_DIR, "assets", "images", imgName);
            expect(fs.existsSync(pubPath)).toBe(true);
            expect(fs.existsSync(distPath)).toBe(true);
            expect(fs.statSync(pubPath).size).toBeGreaterThan(5000);
            expect(fs.statSync(distPath).size).toBeGreaterThan(5000);
        }
    });

    test("4. Compiled Frontend SPA & static assets serve cleanly via Express with strict robots.txt isolation", async () => {
        const [rootRes, devPortalRes, imgRes, favRes, manifestRes, robotsRes] = await Promise.all([
            request(app).get("/"),
            request(app).get("/developer-portal"),
            request(app).get("/assets/images/hospital_hero_exterior.jpg"),
            request(app).get("/favicon.ico"),
            request(app).get("/manifest.json"),
            request(app).get("/robots.txt")
        ]);

        expect(rootRes.statusCode).toBe(200);
        expect(rootRes.headers["content-type"]).toMatch(/text\/html/i);

        expect(devPortalRes.statusCode).toBe(200);
        expect(devPortalRes.headers["content-type"]).toMatch(/text\/html/i);

        expect(imgRes.statusCode).toBe(200);
        expect(imgRes.headers["content-type"]).toMatch(/image\/jpeg/i);

        expect(favRes.statusCode).toBe(200);
        expect(manifestRes.statusCode).toBe(200);
        expect(robotsRes.statusCode).toBe(200);
        expect(robotsRes.text).toContain("Disallow: /developer-portal");
        expect(robotsRes.text).toContain("Disallow: /api/");
    });

    test("5. Zero client credential leaks, zero domain contamination, and zero empty files across active source trees", () => {
        const forbiddenFrontendPatterns = [
            "ROLE_CREDENTIALS_MAP",
            "ensureRoleAuthentication",
            "DevBootstrap123!",
            "Admin123",
            "Doctor123",
            "Loan System",
            "Police System"
        ];

        const frontendFiles = walkFiles(FRONTEND_SRC_DIR).filter((f) => /\.(js|jsx|css|html)$/i.test(f));
        expect(frontendFiles.length).toBeGreaterThan(20);

        for (const file of frontendFiles) {
            const stat = fs.statSync(file);
            expect(stat.size).toBeGreaterThan(0);
            const content = fs.readFileSync(file, "utf8");
            for (const pat of forbiddenFrontendPatterns) {
                if (content.includes(pat)) {
                    throw new Error(`Forbidden pattern "${pat}" found in ${file}`);
                }
            }
        }

        const backendFiles = walkFiles(BACKEND_SRC_DIR).filter((f) => /\.js$/i.test(f));
        expect(backendFiles.length).toBeGreaterThan(50);
        for (const file of backendFiles) {
            expect(fs.statSync(file).size).toBeGreaterThan(0);
        }
    });
});
