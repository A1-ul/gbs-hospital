"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
WEBRTC VIDEO TELEMEDICINE - ROUTER
Phase 21 Production Hardened - CommonJS Only
LOCATION: src/modules/telemedicine/routes/telemedicine.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();
const controller = require("../controllers/telemedicine.controller");
const authMiddleware = require("../../../core/middleware/auth.middleware");
const authorizeRoles = require("../../../core/security/role.middleware");
const { STAFF_ROLES } = require("../../../config/roles");

const TELEMEDICINE_ROLES = [
    ...STAFF_ROLES
];

router.use(authMiddleware);
router.use(authorizeRoles(...TELEMEDICINE_ROLES));

// Virtual Clinic Telemetry
router.get("/telemetry", controller.getTelemetry);
router.get("/stats", controller.getTelemetry);

// Session Scheduling & Directory
router.post("/consultations", controller.schedule);
router.get("/consultations", controller.list);
router.get("/consultations/:idOrCode", controller.getById);

// Call Lifecycle & WebRTC Signaling
router.post("/consultations/:sessionCode/waiting-room", controller.joinWaitingRoom);
router.post("/consultations/:sessionCode/start", controller.startCall);
router.post("/consultations/:sessionCode/signal", controller.signal);
router.post("/consultations/:sessionCode/end", controller.endCall);
router.post("/consultations/:sessionCode/cancel", controller.cancel);

module.exports = router;
