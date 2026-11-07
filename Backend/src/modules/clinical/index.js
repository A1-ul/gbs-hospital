"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
CLINICAL MODULE ENTRY POINT
LOCATION: src/modules/clinical/index.js
====================================================
*/

const routes = require("./routes/clinical.routes");
const opdController = require("./controllers/opd-triage.controller");
const consultationController = require("./controllers/consultation.controller");
const opdService = require("./services/opd-triage.service");
const consultationService = require("./services/consultation.service");
const { generateOpdToken, generateEncounterNumber } = require("./helpers/opd-token.generator");
const { calculateBMI, calculateNEWS2 } = require("./helpers/triage-scorer");
const {
    ICD10_CATALOG,
    MEDICATION_CATALOG,
    LAB_TEST_CATALOG,
    searchICD10,
    searchMedications,
    searchLabTests
} = require("./helpers/clinical-catalogs");

module.exports = {
    routes,
    opdController,
    consultationController,
    opdService,
    consultationService,
    generateOpdToken,
    generateEncounterNumber,
    calculateBMI,
    calculateNEWS2,
    ICD10_CATALOG,
    MEDICATION_CATALOG,
    LAB_TEST_CATALOG,
    searchICD10,
    searchMedications,
    searchLabTests
};
