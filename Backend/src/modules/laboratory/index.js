"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
LABORATORY & PATHOLOGY MODULE ENTRYPOINT
LOCATION: src/modules/laboratory/index.js
====================================================
*/

const service = require("./services/laboratory.service");
const controller = require("./controllers/laboratory.controller");
const routes = require("./routes/laboratory.routes");

module.exports = {
    service,
    controller,
    routes
};
