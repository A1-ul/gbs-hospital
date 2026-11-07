"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BIOMEDICAL ENGINEERING - MODULE ENTRY
Phase 15 Production Hardened - CommonJS Only
LOCATION: src/modules/biomedical/index.js
====================================================
*/

const biomedicalService = require("./biomedical.service");
const biomedicalController = require("./biomedical.controller");
const biomedicalRoutes = require("./biomedical.routes");

module.exports = {
    biomedicalService,
    biomedicalController,
    biomedicalRoutes
};
