"use strict";

const tenantService = require("../../tenant-management/tenant-management.service");
const { getTenantAnalyticsCenter } = require("../developer-ops.service");

module.exports = {
    moduleName: "tenant-console",
    getDeveloperConsoleSummary: tenantService.getDeveloperConsoleSummary,
    getTenants: tenantService.getTenants,
    approveAndProvisionTenant: tenantService.approveAndProvisionTenant,
    updateTenantLifecycleStatus: tenantService.updateTenantLifecycleStatus,
    getLiveTenantLocations: tenantService.getLiveTenantLocations,
    getTenantAnalyticsCenter
};
