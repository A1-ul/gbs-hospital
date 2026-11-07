"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MIGRATION SERVICE MODULE - MODULE ENTRY
Phase 20 Production Hardened - CommonJS Only
LOCATION: src/modules/migration/index.js
====================================================
*/

const migrationService = require("./services/migration.service");
const migrationController = require("./controllers/migration.controller");
const migrationRoutes = require("./routes/migration.routes");

module.exports = {
    migrationService,
    migrationController,
    migrationRoutes
};
