"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
CLINICAL MODULE COMPOSITE CONTROLLER
Aggregates OPD Queuing, Nurse Triage, Vitals, Doctor Consultations, ICD-10 & Prescriptions
LOCATION: src/modules/clinical/controllers/clinical.controller.js
====================================================
*/

const opdTriageController = require("./opd-triage.controller");
const consultationController = require("./consultation.controller");

module.exports = {
    ...opdTriageController,
    ...consultationController,
    opdTriageController,
    consultationController
};
