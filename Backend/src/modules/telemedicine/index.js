"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
WEBRTC VIDEO TELEMEDICINE - MODULE ENTRY
Phase 21 Production Hardened - CommonJS Only
LOCATION: src/modules/telemedicine/index.js
====================================================
*/

const telemedicineService = require("./services/telemedicine.service");
const telemedicineController = require("./controllers/telemedicine.controller");
const telemedicineRoutes = require("./routes/telemedicine.routes");

module.exports = {
    telemedicineService,
    telemedicineController,
    telemedicineRoutes
};
