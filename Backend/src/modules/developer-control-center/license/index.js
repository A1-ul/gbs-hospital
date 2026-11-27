"use strict";

const { runTrialExpirationSweep, getTenantAnalyticsCenter } = require("../developer-ops.service");
const tenantService = require("../../tenant-management/tenant-management.service");

module.exports = {
    moduleName: "license",
    runTrialExpirationSweep,
    getTenantAnalyticsCenter,
    extendSubscription: tenantService.extendSubscription
};
