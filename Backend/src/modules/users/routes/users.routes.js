"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../controllers/user.controller");
const authMiddleware = require("../../../core/middleware/auth.middleware");
const authorizeRoles = require("../../../core/security/role.middleware");
const { ADMIN_ROLES } = require("../../../config/roles");

// All user management routes require valid authentication and administrator authority
router.use(authMiddleware);
router.use(authorizeRoles(...ADMIN_ROLES));

// On-demand database-backed count of users per role (for the dropdown click)
router.get("/counts-by-role", controller.getRoleUserCounts);

// List and cross-check users
router.get("/", controller.getUsers);

// Approve a user account
router.patch("/:id/approve", controller.approveUser);

// Toggle active/disabled status
router.patch("/:id/status", controller.setUserStatus);

module.exports = router;
