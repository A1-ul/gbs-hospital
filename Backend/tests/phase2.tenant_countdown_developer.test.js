"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 2 / PROCEDURE 2 INTEGRATION TEST SUITE
Enterprise Tenant Management, Realtime Countdown,
Developer Authority, GIS Telemetry & Patient Safety Guard
LOCATION: tests/phase2.tenant_countdown_developer.test.js
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 2 / Procedure 2: Enterprise Tenant Management & Developer Control Center", () => {
    let developerToken = null;
    let regularAdminToken = null;
    let registeredTenant = null;
    let createdHospitalId = null;

    const uniqueTimestamp = Date.now();
    const testTenantData = {
        name: `Metropolitan General Medical Center ${uniqueTimestamp}`,
        type: "TERTIARY_REFERRAL_HOSPITAL",
        country: "Ghana",
        region: "Greater Accra",
        city: "Accra",
        address: "Independence Avenue 44",
        latitude: 5.55602,
        longitude: -0.1969,
        officialEmail: `metro_${uniqueTimestamp}@hospital.org`,
        officialPhone: `+233200${Math.floor(100000 + Math.random() * 900000)}`,
        website: "https://metrohospital.org",
        registrationNumber: `REG-${uniqueTimestamp}`,
        licenseNumber: `MDC-${uniqueTimestamp}`,
        representativeName: "Dr. Kwame Mensah",
        representativePosition: "Chief Executive Officer",
        representativeEmail: `kwame_${uniqueTimestamp}@hospital.org`,
        representativePhone: "+233244112233",
        adminName: "Nana Akuffo",
        adminEmail: `admin_${uniqueTimestamp}@hospital.org`,
        adminPhone: "+233244998877",
        adminPassword: "Password123!"
    };

    beforeAll(async () => {
        // Authenticate Developer (seeded account)
        const devLoginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "developer@gbs.com",
                password: "Admin123"
            });
        expect(devLoginRes.status).toBe(200);
        expect(devLoginRes.body.success).toBe(true);
        developerToken = devLoginRes.body.data.token;

        // Authenticate System Administrator (seeded account)
        const adminLoginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "admin@gbs.com",
                password: "Admin123"
            });
        expect(adminLoginRes.status).toBe(200);
        expect(adminLoginRes.body.success).toBe(true);
        regularAdminToken = adminLoginRes.body.data.token;
    });

    afterAll(async () => {
        if (registeredTenant && registeredTenant.id) {
            try {
                await prisma.tenantLocationPing.deleteMany({ where: { tenantId: registeredTenant.id } });
                await prisma.tenantMessage.deleteMany({ where: { tenantId: registeredTenant.id } });
                await prisma.tenantSubscription.deleteMany({ where: { tenantId: registeredTenant.id } });
                await prisma.videoCallSession.deleteMany({ where: { tenantId: registeredTenant.id } });
                if (createdHospitalId) {
                    await prisma.hospitalDepartment.deleteMany({ where: { hospitalId: createdHospitalId } });
                    await prisma.hospital.delete({ where: { id: createdHospitalId } });
                }
                await prisma.tenant.delete({ where: { id: registeredTenant.id } });
                await prisma.user.deleteMany({ where: { email: testTenantData.adminEmail.toLowerCase() } });
            } catch (err) {
                // Ignore cleanup errors
            }
        }
        await prisma.$disconnect();
    });

    // 1. Public Institution Registration
    test("POST /api/v1/tenants/register - Should register institution with pending status and standard codes", async () => {
        const res = await request(app)
            .post("/api/v1/tenants/register")
            .send(testTenantData);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        registeredTenant = res.body.data;
        expect(res.body.data).toHaveProperty("tenantId");
        expect(res.body.data.tenantId).toMatch(/^TEN-\d{4}-\w{6}$/);
        expect(res.body.data.tenantCode).toMatch(/^GBS-ACC-\d{4}$/);
        expect(res.body.data.institutionId).toMatch(/^INS-\d{4}-\w{6}$/);
        expect(res.body.data.status).toBe("PENDING");
        expect(res.body.data.systemLocked).toBe(false);
    });

    // 2. Reject duplicate registration with same email
    test("POST /api/v1/tenants/register - Should reject duplicate official email", async () => {
        const res = await request(app)
            .post("/api/v1/tenants/register")
            .send(testTenantData);

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("TENANT_ALREADY_EXISTS");
    });

    // 3. Security Check: Non-developer cannot approve tenant
    test("POST /api/v1/tenants/:id/approve - Non-developer should receive 403 Forbidden", async () => {
        const res = await request(app)
            .post(`/api/v1/tenants/${registeredTenant.id}/approve`)
            .set("Authorization", `Bearer ${regularAdminToken}`)
            .send({ trialDays: 30 });

        expect(res.status).toBe(403);
    });

    // 4. Developer Approval & Automated Provisioning
    test("POST /api/v1/tenants/:id/approve - Developer approves and provisions automated infrastructure", async () => {
        const res = await request(app)
            .post(`/api/v1/tenants/${registeredTenant.id}/approve`)
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                trialDays: 30
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("ACTIVE_TRIAL");

        // Verify Hospital was auto-created and linked
        expect(res.body.data.hospital).toBeDefined();
        expect(res.body.data.hospital.name).toBe(testTenantData.name);
        createdHospitalId = res.body.data.hospital.id;

        // Verify 30-Day Subscription was generated
        expect(res.body.data.subscription).toBeDefined();
        expect(res.body.data.subscription.status).toBe("ACTIVE_TRIAL");
        expect(res.body.data.subscription.subscriptionId).toMatch(/^SUB-\d{4}-\w{6}$/);

        // Verify Countdown was calculated
        expect(res.body.data.countdown).toBeDefined();
        expect(res.body.data.countdown.remainingDays).toBeGreaterThanOrEqual(29);
        expect(res.body.data.countdown.warningTier).toBe("NORMAL");
    });

    // 5. Authoritative Realtime Countdown Calculation
    test("GET /api/v1/tenants/:id - Should calculate backend-authoritative countdown and warning tier", async () => {
        const res = await request(app)
            .get(`/api/v1/tenants/${registeredTenant.id}`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.countdown).toBeDefined();
        expect(res.body.data.countdown.remainingDays).toBeGreaterThanOrEqual(29);
        expect(res.body.data.countdown.warningTier).toBe("NORMAL");
        expect(res.body.data.countdown.isExpired).toBe(false);
        expect(res.body.data.hospital).toBeDefined();
        expect(res.body.data.subscriptions.length).toBeGreaterThanOrEqual(1);
    });

    // 6. Developer Control Center Telemetry Summary
    test("GET /api/v1/tenants/console-summary - Should return real live database telemetry", async () => {
        const res = await request(app)
            .get("/api/v1/tenants/console-summary")
            .set("Authorization", `Bearer ${developerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.totalTenants).toBeGreaterThanOrEqual(1);
        expect(res.body.data.activeTenants).toBeGreaterThanOrEqual(1);
    });

    // 7. Developer Lock and Unlock System Controls
    test("POST /api/v1/tenants/:id/lock & POST /api/v1/tenants/:id/unlock - Developer authority lock/unlock", async () => {
        // Lock tenant
        const lockRes = await request(app)
            .post(`/api/v1/tenants/${registeredTenant.id}/lock`)
            .set("Authorization", `Bearer ${developerToken}`)
            .send({ reason: "Regulatory Compliance Audit Pending" });

        expect(lockRes.status).toBe(200);
        expect(lockRes.body.data.systemLocked).toBe(true);
        expect(lockRes.body.data.lockReason).toBe("Regulatory Compliance Audit Pending");

        // Unlock tenant
        const unlockRes = await request(app)
            .post(`/api/v1/tenants/${registeredTenant.id}/unlock`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(unlockRes.status).toBe(200);
        expect(unlockRes.body.data.systemLocked).toBe(false);
    });

    // 8. Developer Subscription Extension
    test("POST /api/v1/tenants/:id/extend - Extends license and recalculates countdown", async () => {
        const res = await request(app)
            .post(`/api/v1/tenants/${registeredTenant.id}/extend`)
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                days: 365,
                plan: "ACTIVE_PAID"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("ACTIVE_PAID");
        expect(res.body.data.newExpiry).toBeDefined();
    });

    // 9. Location Telemetry Ping & Developer Live GIS Map
    test("POST /api/v1/tenants/:id/location-ping & GET /api/v1/tenants/tracking/live-locations", async () => {
        // Record Ping
        const pingRes = await request(app)
            .post(`/api/v1/tenants/${registeredTenant.id}/location-ping`)
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                latitude: 5.55605,
                longitude: -0.19695,
                status: "ONLINE"
            });

        expect(pingRes.status).toBe(201);
        expect(pingRes.body.success).toBe(true);
        expect(pingRes.body.data.latitude).toBeCloseTo(5.55605, 4);

        // Fetch Developer Live Locations
        const locRes = await request(app)
            .get("/api/v1/tenants/tracking/live-locations")
            .set("Authorization", `Bearer ${developerToken}`);

        expect(locRes.status).toBe(200);
        expect(locRes.body.success).toBe(true);
        expect(Array.isArray(locRes.body.data)).toBe(true);
        const found = locRes.body.data.find(loc => loc.tenantId === registeredTenant.tenantId);
        expect(found).toBeDefined();
        expect(found.location.latitude).toBeCloseTo(5.556, 2);
    });

    // 10. Direct Messaging & WebRTC Video Call Initiation
    test("POST /api/v1/tenants/messages & POST /api/v1/tenants/video-call/initiate", async () => {
        // Developer sends announcement message
        const msgRes = await request(app)
            .post("/api/v1/tenants/messages")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                tenantId: registeredTenant.id,
                title: "System Maintenance Alert",
                content: "System maintenance scheduled for Sunday at 02:00 UTC.",
                priority: "HIGH",
                category: "SYSTEM_ALERT"
            });

        expect(msgRes.status).toBe(201);
        expect(msgRes.body.data.content).toContain("System maintenance scheduled");

        // Retrieve messages for tenant
        const getMsgRes = await request(app)
            .get(`/api/v1/tenants/${registeredTenant.id}/messages`)
            .set("Authorization", `Bearer ${developerToken}`);

        expect(getMsgRes.status).toBe(200);
        expect(getMsgRes.body.data.length).toBeGreaterThanOrEqual(1);

        // Developer initiates video call
        const videoRes = await request(app)
            .post("/api/v1/tenants/video-call/initiate")
            .set("Authorization", `Bearer ${developerToken}`)
            .send({
                tenantId: registeredTenant.id
            });

        expect(videoRes.status).toBe(200);
        expect(videoRes.body.data.channelName).toMatch(/^call-TEN-/);
        expect(videoRes.body.data.status).toBe("INITIATED");
    });
});
