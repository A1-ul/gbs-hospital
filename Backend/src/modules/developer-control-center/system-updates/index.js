"use strict";

const {
    getDeploymentHistory,
    recordDeploymentCheckpoint,
    getRollbackReadiness
} = require("../services/developer-remote-ops.service");

module.exports = {
    moduleName: "system-updates",
    getDeploymentHistory,
    recordDeploymentCheckpoint,
    getRollbackReadiness
};
