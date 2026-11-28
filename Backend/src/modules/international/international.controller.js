"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
INTERNATIONAL COUNTRIES & MULTILINGUAL CONTROLLER
LOCATION: Backend/src/modules/international/international.controller.js
COMMONJS ONLY
====================================================
*/

const internationalService = require("./international.service");
const { rcce } = require("../../core/gbs-rcce.bootstrap");

async function getCountries(req, res, next) {
    try {
        const result = await internationalService.listCountries({
            region: req.query.region,
            search: req.query.search
        });
        return res.rcceSuccess("SUCCESS", result, {
            httpStatus: 200,
            message: "Supported international countries retrieved successfully"
        });
    } catch (error) {
        return next(error);
    }
}

async function getCountryByCode(req, res, next) {
    try {
        const country = await internationalService.getCountryByCode(req.params.code);
        return res.rcceSuccess("SUCCESS", country, {
            httpStatus: 200,
            message: `Country profile retrieved for ${country.name}`
        });
    } catch (error) {
        return next(error);
    }
}

async function getLanguages(_req, res, next) {
    try {
        const result = internationalService.listLanguages();
        return res.rcceSuccess("SUCCESS", result, {
            httpStatus: 200,
            message: "Supported international languages retrieved successfully"
        });
    } catch (error) {
        return next(error);
    }
}

async function getProfile(_req, res, next) {
    try {
        const profile = internationalService.getLocaleProfile();
        return res.rcceSuccess("SUCCESS", profile, {
            httpStatus: 200,
            message: "Active international locale profile retrieved"
        });
    } catch (error) {
        return next(error);
    }
}

async function updateProfile(req, res, next) {
    try {
        const updated = await internationalService.updateLocaleProfile(req.body, req.user);
        await rcce.events.publish({
            eventCode: "RECORD_UPDATED",
            domain: "INTERNATIONAL",
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || "ADMIN",
            tenantId: req.user?.hospitalId || null,
            affectedRecord: `${updated.countryCode}/${updated.languageCode}`,
            severity: "INFO",
            requestId: req.requestId,
            asyncDelivery: true,
            notifications: [
                {
                    recipientRole: "ADMIN",
                    title: "International Locale Profile Updated",
                    message: `Hospital active profile updated to ${updated.countryName} (${updated.currencyCode}) / ${updated.languageName}.`,
                    severity: "INFO"
                }
            ]
        }).catch(() => {});
        return res.rcceSuccess("LOCALE_PROFILE_UPDATED", updated, {
            httpStatus: 200,
            message: `International settings saved: ${updated.countryName} (${updated.currencyCode}) / ${updated.languageName}`
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getCountries,
    getCountryByCode,
    getLanguages,
    getProfile,
    updateProfile
};
