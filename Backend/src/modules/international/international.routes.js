"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
INTERNATIONAL COUNTRIES & MULTILINGUAL ROUTES
LOCATION: Backend/src/modules/international/international.routes.js
COMMONJS ONLY
====================================================
*/

const express = require("express");
const router = express.Router();
const controller = require("./international.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { ADMIN_ROLES } = require("../../config/roles");

// Public read endpoints so login screens, registration modals, and guest overview can switch language & country
router.get("/countries", controller.getCountries);
router.get("/countries/:code", controller.getCountryByCode);
router.get("/languages", controller.getLanguages);
router.get("/profile", controller.getProfile);

// Administrator / Hospital Director / Developer update endpoint (audited in PostgreSQL AuditLog)
router.put("/profile", authMiddleware, authorizeRoles(...ADMIN_ROLES), controller.updateProfile);

module.exports = router;
