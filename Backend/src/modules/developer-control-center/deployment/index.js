"use strict";

const { getDeploymentHistory, recordDeploymentCheckpoint } = require("../services/developer-remote-ops.service");

module.exports = {
    moduleName: "deployment",
    getDeploymentHistory,
    recordDeploymentCheckpoint
};
