"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
HUMAN RESOURCES & STAFF CREDENTIALING - MODULE ENTRY
Phase 17 Production Hardened - CommonJS Only
LOCATION: src/modules/hr/index.js
====================================================
*/

const hrService = require("./hr.service");
const hrController = require("./hr.controller");
const hrRoutes = require("./hr.routes");

module.exports = {
    hrService,
    hrController,
    hrRoutes
};
