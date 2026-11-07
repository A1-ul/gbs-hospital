"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
RADIOLOGY & PACS MODULE ENTRYPOINT
LOCATION: src/modules/radiology/index.js
====================================================
*/

const service = require("./services/radiology.service");
const controller = require("./controllers/radiology.controller");
const routes = require("./routes/radiology.routes");

module.exports = {
    service,
    controller,
    routes
};
