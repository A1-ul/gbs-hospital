"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
HUMAN RESOURCES & STAFF CREDENTIALING - ROUTER
Phase 17 Production Hardened - CommonJS Only
LOCATION: src/modules/hr/hr.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();
const controller = require("./hr.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { STAFF_ROLES, ADMIN_ROLES, ROLES } = require("../../config/roles");

const HR_ROLES = [
    ...STAFF_ROLES
];

router.use(authMiddleware);
router.use(authorizeRoles(...HR_ROLES));

// Catalogs & Command Center Telemetry
router.get("/catalogs", controller.getCatalogs);
router.get("/stats", controller.getHrStats);
router.get("/telemetry", controller.getHrStats);

// Staff Credentials & License Tracking
router.post("/credentials", controller.registerCredential);
router.get("/credentials", controller.getCredentials);
router.patch("/credentials/:id/verify", controller.verifyCredential);

// Duty Rostering & Shift Scheduling
router.post("/roster", controller.scheduleShift);
router.get("/roster", controller.getDutyRosters);
router.patch("/roster/:id/status", controller.updateRosterStatus);

// Clinical SBAR Shift Handovers
router.post("/handovers", controller.recordShiftHandover);
router.get("/handovers", controller.getShiftHandovers);
router.patch("/handovers/:id/cosign", controller.coSignShiftHandover);

// Attendance & Biometric Clock In/Out
router.post("/attendance/clock-in", controller.clockInStaff);
router.patch("/attendance/:id/clock-out", controller.clockOutStaff);
router.get("/attendance", controller.getStaffAttendance);

// Staff Leave Requests & Approvals
router.post("/leave", controller.requestStaffLeave);
router.get("/leave", controller.getLeaveRequests);
router.patch("/leave/:id/adjudicate", controller.adjudicateLeaveRequest);

module.exports = router;
