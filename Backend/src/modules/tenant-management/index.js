"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ENTERPRISE TENANT MANAGEMENT MODULE EXPORT
LOCATION: src/modules/tenant-management/index.js
====================================================
*/

const routes = require("./tenant-management.routes");
const controller = require("./tenant-management.controller");
const service = require("./tenant-management.service");
const { tenantAccessGuard } = require("./tenant-access.middleware");
const { calculateCountdown } = require("./helpers/countdown.engine");
const { generateTenantIdentifiers } = require("./helpers/tenant-id.generator");

module.exports = {
    routes,
    controller,
    service,
    tenantAccessGuard,
    calculateCountdown,
    generateTenantIdentifiers
};
