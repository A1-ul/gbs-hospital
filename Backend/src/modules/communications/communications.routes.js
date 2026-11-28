"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ALL-USERS VOICE/VIDEO CALLING & MULTI-CAMERA CONFERENCE ROUTES
Open to ALL authenticated users (ALL_ROLES); Developer Isolation enforced in service
LOCATION: Backend/src/modules/communications/communications.routes.js
================================================================================
*/

const express = require("express");
const router = express.Router();
const controller = require("./communications.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { ALL_ROLES } = require("../../config/roles");

router.use(authMiddleware);
router.use(authorizeRoles(...ALL_ROLES));

// Family-friendly hospital contact directory with live online status
router.get("/directory", controller.getDirectory);

// Direct 1-on-1 Voice & Video Calls
router.get("/calls", controller.listCalls);
router.get("/calls/incoming", controller.getIncomingCalls);
router.post("/calls", controller.initiateCall);
router.post("/calls/:id/accept", controller.acceptCall);
router.post("/calls/:id/decline", controller.declineCall);
router.post("/calls/:id/end", controller.endCall);

// Multi-Camera Video & Voice Conference Meetings (All Users)
router.get("/conferences", controller.listCalls);
router.post("/conferences", controller.createConference);

// Live WebRTC Multi-Peer Room Presence & Signaling Relay
router.post("/rooms/:roomCode/join", controller.joinRoom);
router.post("/rooms/:roomCode/leave", controller.leaveRoom);
router.post("/rooms/:roomCode/signal", controller.postSignal);
router.get("/rooms/:roomCode/signals", controller.getSignals);

module.exports = router;
