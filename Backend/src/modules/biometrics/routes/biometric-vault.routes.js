"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../controllers/biometric-vault.controller");
const authMiddleware = require("../../../core/middleware/auth.middleware");

// Telemetry & Security Policy (authenticated)
router.get("/telemetry", authMiddleware, controller.getTelemetry);
router.get("/policy", authMiddleware, controller.getSecurityPolicy);
router.put("/policy", authMiddleware, controller.updateSecurityPolicy);

// Verification Audit Logs
router.get("/logs", authMiddleware, controller.getVerificationLogs);

// Voiceprint Biometric Endpoints
router.post("/voiceprint/enroll", authMiddleware, controller.enrollVoiceprint);
router.post("/voiceprint/verify", authMiddleware, controller.verifyVoiceprint);
router.get("/voiceprint/status", authMiddleware, controller.getVoiceprintStatus);
router.get("/voiceprint/status/:userId", authMiddleware, controller.getVoiceprintStatus);

// Multi-Modal Credentials (Fingerprint, Facial, FIDO2)
router.post("/credentials/enroll", authMiddleware, controller.enrollCredential);
router.get("/credentials", authMiddleware, controller.getUserCredentials);
router.get("/credentials/:userId", authMiddleware, controller.getUserCredentials);

module.exports = router;
