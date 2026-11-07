"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
CLINICAL MODULE COMPOSITE SERVICE
Aggregates OPD Queuing, Nurse Triage, Vitals, Consultations, ICD-10 & Prescriptions
LOCATION: src/modules/clinical/services/clinical.service.js
====================================================
*/

const opdTriageService = require("./opd-triage.service");
const consultationService = require("./consultation.service");

module.exports = {
    ...opdTriageService,
    ...consultationService,
    opdTriageService,
    consultationService
};
