"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
INPATIENT DEPARTMENT (IPD) MODULE ENTRY POINT
LOCATION: src/modules/admissions/index.js
====================================================
*/

const routes = require("./routes/admissions.routes");
const controller = require("./controllers/inpatient.controller");
const service = require("./services/inpatient.service");
const { generateAdmissionNumber, generateWardCode, generateBedCode } = require("./helpers/admission-id.generator");

module.exports = {
    routes,
    controller,
    service,
    generateAdmissionNumber,
    generateWardCode,
    generateBedCode
};
