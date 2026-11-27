"use strict";

const { listFeatureFlags, setFeatureFlag } = require("../services/developer-remote-ops.service");

module.exports = {
    moduleName: "feature-flags",
    listFeatureFlags,
    setFeatureFlag
};
