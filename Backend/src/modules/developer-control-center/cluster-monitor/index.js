"use strict";

const { getClusterHealth } = require("../services/developer-remote-ops.service");
const { getAiDeveloperAssistantDiagnostics } = require("../developer-ops.service");

module.exports = {
    moduleName: "cluster-monitor",
    getClusterHealth,
    getAiDeveloperAssistantDiagnostics
};
