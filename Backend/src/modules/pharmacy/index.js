"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHARMACY MODULE ENTRYPOINT
LOCATION: src/modules/pharmacy/index.js
====================================================
*/

const service = require("./services/pharmacy.service");
const controller = require("./controllers/pharmacy.controller");
const routes = require("./routes/pharmacy.routes");

module.exports = {
    service,
    controller,
    routes
};
