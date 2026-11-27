"use strict";

const { setMaintenanceMode, listConfigurations, upsertConfiguration } = require("../rcce.service");
const { clearSystemCaches, optimizeDatabase, rotateAndPruneLogs } = require("../services/developer-remote-ops.service");

module.exports = {
    moduleName: "maintenance",
    setMaintenanceMode,
    listConfigurations,
    upsertConfiguration,
    clearSystemCaches,
    optimizeDatabase,
    rotateAndPruneLogs
};
