"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ENTERPRISE EXTERNAL INTEGRATION ADAPTERS REGISTRY
CommonJS Only
LOCATION: Backend/src/core/integration/index.js
================================================================================
*/

const emailAdapter = require("./email.adapter");
const smsAdapter = require("./sms.adapter");
const paymentGatewayAdapter = require("./payment-gateway.adapter");

function getAllExternalAdapterStatuses() {
    return [
        emailAdapter.getEmailAdapterStatus(),
        smsAdapter.getSmsAdapterStatus(),
        paymentGatewayAdapter.getPaymentGatewayStatus()
    ];
}

module.exports = {
    emailAdapter,
    smsAdapter,
    paymentGatewayAdapter,
    getAllExternalAdapterStatuses
};
