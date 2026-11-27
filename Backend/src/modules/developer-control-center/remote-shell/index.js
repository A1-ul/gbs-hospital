"use strict";

const {
    getClusterHealth,
    clearSystemCaches,
    optimizeDatabase,
    rotateAndPruneLogs
} = require("../services/developer-remote-ops.service");
const { getExternalIntegrationsStatus } = require("../developer-ops.service");

module.exports = {
    moduleName: "remote-shell",
    getClusterHealth,
    clearSystemCaches,
    optimizeDatabase,
    rotateAndPruneLogs,
    getExternalIntegrationsStatus
};
