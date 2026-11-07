"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MEDICAL RECORDS MODULE EXPORT
LOCATION: src/modules/medical-records/index.js
====================================================
*/

const routes = require("./routes/medical-records.routes");
const controller = require("./controllers/folder.controller");
const service = require("./services/folder.service");

module.exports = {
    routes,
    controller,
    service
};
