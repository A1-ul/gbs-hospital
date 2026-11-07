"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PROCUREMENT & SUPPLY CHAIN - MODULE ENTRY
Phase 16 Production Hardened - CommonJS Only
LOCATION: src/modules/procurement/index.js
====================================================
*/

const procurementService = require("./procurement.service");
const procurementController = require("./procurement.controller");
const procurementRoutes = require("./procurement.routes");

module.exports = {
    procurementService,
    procurementController,
    procurementRoutes
};
