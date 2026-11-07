"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BILLING & FINANCIAL MODULE ENTRYPOINT
LOCATION: src/modules/billing/index.js
====================================================
*/

const service = require("./services/billing.service");
const controller = require("./controllers/billing.controller");
const routes = require("./routes/billing.routes");

module.exports = {
    service,
    controller,
    routes
};
