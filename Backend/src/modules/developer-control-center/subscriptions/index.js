"use strict";

const { runTrialExpirationSweep, getTenantAnalyticsCenter } = require("../developer-ops.service");
const tenantService = require("../../tenant-management/tenant-management.service");

module.exports = {
    moduleName: "subscriptions",
    runTrialExpirationSweep,
    getTenantAnalyticsCenter,
    extendSubscription: tenantService.extendSubscription,
    lockTenant: tenantService.lockTenant,
    unlockTenant: tenantService.unlockTenant
};
