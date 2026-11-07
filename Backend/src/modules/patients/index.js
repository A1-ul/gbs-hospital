"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PATIENTS MODULE EXPORT
LOCATION: src/modules/patients/index.js
====================================================
*/

const routes = require("./routes/patients.routes");
const controller = require("./controllers/patient.controller");
const service = require("./services/patient.service");
const { generatePatientMRN, calculatePhysicalShelfLocation } = require("./helpers/patient-id.generator");

module.exports = {
    routes,
    controller,
    service,
    generatePatientMRN,
    calculatePhysicalShelfLocation
};
