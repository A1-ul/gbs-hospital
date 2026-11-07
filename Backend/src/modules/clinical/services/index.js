"use strict";

const clinicalService = require("./clinical.service");
const opdTriageService = require("./opd-triage.service");
const consultationService = require("./consultation.service");

module.exports = {
    clinicalService,
    opdTriageService,
    consultationService
};
