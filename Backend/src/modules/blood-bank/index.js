"use strict";

const router = require("./blood-bank.routes");
const controller = require("./blood-bank.controller");
const service = require("./blood-bank.service");

module.exports = {
    router,
    controller,
    service
};
