"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
GIS FACILITY TRACKING & FLOOR PLANS - MODULE ENTRY
Phase 21 Production Hardened - CommonJS Only
LOCATION: src/modules/facility-maps/index.js
====================================================
*/

const facilityMapsService = require("./facility-maps.service");
const facilityMapsController = require("./facility-maps.controller");
const facilityMapsRoutes = require("./facility-maps.routes");

module.exports = {
    facilityMapsService,
    facilityMapsController,
    facilityMapsRoutes
};
