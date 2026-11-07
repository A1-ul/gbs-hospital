"use strict";

const service = require("./emergency.service");
const controller = require("./emergency.controller");
const routes = require("./emergency.routes");

module.exports = {
    service,
    controller,
    routes
};
