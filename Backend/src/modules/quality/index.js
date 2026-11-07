"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
QUALITY ASSURANCE & CLINICAL SAFETY - MODULE ENTRY
Phase 18 Production Hardened - CommonJS Only
LOCATION: src/modules/quality/index.js
====================================================
*/

const qualityService = require("./quality.service");
const qualityController = require("./quality.controller");
const qualityRoutes = require("./quality.routes");

module.exports = {
    qualityService,
    qualityController,
    qualityRoutes
};
