"use strict";

const clinicalController = require("./clinical.controller");
const opdTriageController = require("./opd-triage.controller");
const consultationController = require("./consultation.controller");

module.exports = {
    clinicalController,
    opdTriageController,
    consultationController
};
