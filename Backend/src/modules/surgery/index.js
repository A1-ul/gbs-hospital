"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
SURGERY, OPERATING THEATRE & PACU MODULE EXPORT
LOCATION: src/modules/surgery/index.js
====================================================
*/

const service = require("./services/surgery.service");
const controller = require("./controllers/surgery.controller");
const routes = require("./routes/surgery.routes");

module.exports = {
    service,
    controller,
    routes
};
