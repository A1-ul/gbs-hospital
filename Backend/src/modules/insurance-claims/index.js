"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
NHIA / NHIS CLAIMS & E-CLAIMS - MODULE ENTRY
Phase 19 Production Hardened - CommonJS Only
LOCATION: src/modules/insurance-claims/index.js
====================================================
*/

const insuranceClaimsService = require("./services/insurance-claims.service");
const insuranceClaimsController = require("./controllers/insurance-claims.controller");
const insuranceClaimsRoutes = require("./routes/insurance-claims.routes");

module.exports = {
    insuranceClaimsService,
    insuranceClaimsController,
    insuranceClaimsRoutes
};
