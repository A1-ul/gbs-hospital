"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../controllers/auth.controller");
const authMiddleware = require("../../../core/middleware/auth.middleware");
const authorizeRoles = require("../../../core/security/role.middleware");
const { DEVELOPER_ROLES } = require("../../../config/roles");

router.post("/signup", controller.signup);
router.post("/login", controller.login);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);
router.post("/demo-session", controller.startDemoSession);

router.get("/me", authMiddleware, controller.me);
router.post("/logout", authMiddleware, controller.logout);
router.get("/sessions", authMiddleware, controller.listSessions);
router.delete("/sessions/:sessionId", authMiddleware, controller.revokeSession);

router.post(
    "/developer/mfa-challenge",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.developerMfaChallenge
);
router.post(
    "/developer/mfa-verify",
    authMiddleware,
    authorizeRoles(...DEVELOPER_ROLES),
    controller.developerMfaVerify
);

module.exports = router;
