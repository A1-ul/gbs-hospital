"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 22 INTEGRATION TEST SUITE
Central Voice Authentication Platform Service & Biometric Security Vault
LOCATION: tests/phase22.voice_biometric_security_vault.test.js
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 22: Central Voice Authentication Platform Service & Biometric Security Vault", () => {
    let adminToken;
    let adminUserId;
    let testEnrollmentCode;
    let testCredentialCode;
    const testTimestamp = Date.now();

    // Genuine acoustic voice sample: 140 Hz fundamental pitch with speech harmonics
    const genuineVoicePayload = Array.from({ length: 400 }, (_, i) => {
        const t = i / 16000;
        return (
            0.5 * Math.sin(2 * Math.PI * 140 * t) +
            0.3 * Math.sin(2 * Math.PI * 280 * t) +
            0.15 * Math.sin(2 * Math.PI * 840 * t)
        );
    });

    const authorizedPassphrase = "My voice is my secure biometric health passport at GBS Hospital";

    beforeAll(async () => {
        // Authenticate as Administrator
        const adminRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "admin@gbs.com",
                password: "Admin123"
            });
        expect(adminRes.status).toBe(200);
        adminToken = adminRes.body.data.token;
        adminUserId = adminRes.body.data.user.id;

        // Reset policy to standard baseline
        await prisma.biometricSecurityPolicy.upsert({
            where: { policyCode: "POL-BIO-GLOBAL" },
            update: { minVoiceConfidenceScore: 0.85, requireVoiceForNarcotics: true },
            create: { policyCode: "POL-BIO-GLOBAL", minVoiceConfidenceScore: 0.85, requireVoiceForNarcotics: true }
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    // -------------------------------------------------------------
    // 1. Security & Authentication Requirements
    // -------------------------------------------------------------
    it("1. GET /api/v1/biometrics/telemetry requires authentication (401 without token)", async () => {
        const res = await request(app).get("/api/v1/biometrics/telemetry");
        expect(res.status).toBe(401);
    });

    // -------------------------------------------------------------
    // 2. Voiceprint Enrollment Validation
    // -------------------------------------------------------------
    it("2. POST /api/v1/biometrics/voiceprint/enroll rejects missing audio payload (400)", async () => {
        const res = await request(app)
            .post("/api/v1/biometrics/voiceprint/enroll")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                passphraseText: authorizedPassphrase
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("3. POST /api/v1/biometrics/voiceprint/enroll rejects invalid/short verbal passphrase (400)", async () => {
        const res = await request(app)
            .post("/api/v1/biometrics/voiceprint/enroll")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                audioPayload: genuineVoicePayload,
                passphraseText: "no"
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("4. POST /api/v1/biometrics/voiceprint/enroll enrolls voiceprint with acoustic feature vector (VOX-YYYY-XXXXXX)", async () => {
        const res = await request(app)
            .post("/api/v1/biometrics/voiceprint/enroll")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                userId: adminUserId,
                audioPayload: genuineVoicePayload,
                passphraseText: authorizedPassphrase,
                sampleRate: 16000,
                durationSeconds: 3.8
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.enrollmentCode).toMatch(/^VOX-\d{4}-\d{6}$/);
        expect(res.body.data.qualityScore).toBeGreaterThanOrEqual(0.70);
        expect(res.body.data.status).toBe("ACTIVE");

        testEnrollmentCode = res.body.data.enrollmentCode;
    });

    // -------------------------------------------------------------
    // 3. Voiceprint Status & Retrieval
    // -------------------------------------------------------------
    it("5. GET /api/v1/biometrics/voiceprint/status returns active enrolled voiceprint metadata", async () => {
        const res = await request(app)
            .get("/api/v1/biometrics/voiceprint/status")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.enrollmentCode).toBe(testEnrollmentCode);
        expect(res.body.data.status).toBe("ACTIVE");
        expect(res.body.data.passphraseText).toBe(authorizedPassphrase);
    });

    // -------------------------------------------------------------
    // 4. Voice Verification & Acoustic Matching
    // -------------------------------------------------------------
    it("6. POST /api/v1/biometrics/voiceprint/verify verifies genuine voice sample with matching passphrase (confidence >= 0.85)", async () => {
        const res = await request(app)
            .post("/api/v1/biometrics/voiceprint/verify")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                userId: adminUserId,
                audioPayload: genuineVoicePayload,
                passphraseText: authorizedPassphrase,
                actionAttempted: "CLINICAL_AUTHENTICATION"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.verified).toBe(true);
        expect(res.body.data.confidenceScore).toBeGreaterThanOrEqual(0.85);
        expect(res.body.data.livenessPassed).toBe(true);
        expect(res.body.data.actionAuthorized).toBe(true);
        expect(res.body.data.verificationLogCode).toMatch(/^LOG-\d{4}-\d{6}$/);
    });

    it("7. POST /api/v1/biometrics/voiceprint/verify rejects verbal passphrase mismatch with 403 Forbidden", async () => {
        const res = await request(app)
            .post("/api/v1/biometrics/voiceprint/verify")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                userId: adminUserId,
                audioPayload: genuineVoicePayload,
                passphraseText: "An unauthorized impostor phrase",
                actionAttempted: "UNAUTHORIZED_LOGIN"
            });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.data.verified).toBe(false);
        expect(res.body.data.actionAuthorized).toBe(false);
    });

    it("8. POST /api/v1/biometrics/voiceprint/verify anti-spoofing rejects silence/empty audio (low quality)", async () => {
        // Zero-amplitude / silence payload
        const silentPayload = [0.0001, 0.0001, -0.0001, 0.0001, -0.0001];

        const res = await request(app)
            .post("/api/v1/biometrics/voiceprint/verify")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                userId: adminUserId,
                audioPayload: silentPayload,
                passphraseText: authorizedPassphrase,
                actionAttempted: "SILENT_ATTACK"
            });

        expect(res.status).toBe(403);
        expect(res.body.data.antiSpoofingStatus).toBe("LOW_QUALITY");
        expect(res.body.data.livenessPassed).toBe(false);
    });

    it("9. POST /api/v1/biometrics/voiceprint/verify anti-spoofing rejects high-frequency static replay noise", async () => {
        // High frequency alternating noise: +1, -1, +1, -1... (ZCR = 1.0)
        const replayNoise = Array.from({ length: 100 }, (_, i) => (i % 2 === 0 ? 0.9 : -0.9));

        const res = await request(app)
            .post("/api/v1/biometrics/voiceprint/verify")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                userId: adminUserId,
                audioPayload: replayNoise,
                passphraseText: authorizedPassphrase,
                actionAttempted: "REPLAY_ATTACK"
            });

        expect(res.status).toBe(403);
        expect(res.body.data.antiSpoofingStatus).toBe("PLAYBACK_DETECTED");
        expect(res.body.data.livenessPassed).toBe(false);
    });

    // -------------------------------------------------------------
    // 5. High-Risk Clinical Action Challenges
    // -------------------------------------------------------------
    it("10. POST /api/v1/biometrics/voiceprint/verify authorizes high-risk NARCOTICS_DISPENSE action with audit logging", async () => {
        const res = await request(app)
            .post("/api/v1/biometrics/voiceprint/verify")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                userId: adminUserId,
                audioPayload: genuineVoicePayload,
                passphraseText: authorizedPassphrase,
                actionAttempted: "NARCOTICS_DISPENSE"
            });

        expect(res.status).toBe(200);
        expect(res.body.data.actionAttempted).toBe("NARCOTICS_DISPENSE");
        expect(res.body.data.actionAuthorized).toBe(true);
    });

    // -------------------------------------------------------------
    // 6. Multi-Modal Biometric Credentials
    // -------------------------------------------------------------
    it("11. POST /api/v1/biometrics/credentials/enroll registers multi-modal credential (BIO-YYYY-XXXXXX)", async () => {
        const res = await request(app)
            .post("/api/v1/biometrics/credentials/enroll")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                biometricType: "FINGERPRINT_MINUTIAE",
                credentialPayload: "ENCRYPTED_ANSI_NIST_TEMPLATE_HASH_9918231",
                securityLevel: "MAXIMUM_CLINICAL"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.credentialCode).toMatch(/^BIO-\d{4}-\d{6}$/);
        expect(res.body.data.biometricType).toBe("FINGERPRINT_MINUTIAE");

        testCredentialCode = res.body.data.credentialCode;
    });

    it("12. GET /api/v1/biometrics/credentials retrieves registered credentials for user", async () => {
        const res = await request(app)
            .get("/api/v1/biometrics/credentials")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].credentialCode).toBe(testCredentialCode);
    });

    // -------------------------------------------------------------
    // 7. Biometric Security Policy & Governance
    // -------------------------------------------------------------
    it("13. GET /api/v1/biometrics/policy retrieves global zero-trust biometric security policy", async () => {
        const res = await request(app)
            .get("/api/v1/biometrics/policy")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.policyCode).toBe("POL-BIO-GLOBAL");
        expect(res.body.data.requireVoiceForNarcotics).toBe(true);
        expect(res.body.data.minVoiceConfidenceScore).toBe(0.85);
    });

    it("14. PUT /api/v1/biometrics/policy updates confidence floor and policy options", async () => {
        const res = await request(app)
            .put("/api/v1/biometrics/policy")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                minVoiceConfidenceScore: 0.88,
                requireVoiceForSurgicalSignOut: true,
                maxAttemptsBeforeLockout: 4
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.minVoiceConfidenceScore).toBe(0.88);
        expect(res.body.data.maxAttemptsBeforeLockout).toBe(4);
    });

    // -------------------------------------------------------------
    // 8. Verification Audit Logs & PostgreSQL Telemetry
    // -------------------------------------------------------------
    it("15. GET /api/v1/biometrics/logs and GET /api/v1/biometrics/telemetry return live PostgreSQL metrics", async () => {
        // Logs
        const logsRes = await request(app)
            .get("/api/v1/biometrics/logs?limit=10")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(logsRes.status).toBe(200);
        expect(Array.isArray(logsRes.body.data)).toBe(true);
        expect(logsRes.body.data.length).toBeGreaterThan(0);
        expect(logsRes.body.data[0].logCode).toMatch(/^LOG-\d{4}-\d{6}$/);

        // Telemetry
        const telemetryRes = await request(app)
            .get("/api/v1/biometrics/telemetry")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(telemetryRes.status).toBe(200);
        expect(telemetryRes.body.success).toBe(true);
        expect(telemetryRes.body.data.totalEnrolledVoiceprints).toBeGreaterThan(0);
        expect(telemetryRes.body.data.totalVerifications).toBeGreaterThan(0);
        expect(telemetryRes.body.data.zeroTrustStatus).toBe("ENFORCED");
    });
});
