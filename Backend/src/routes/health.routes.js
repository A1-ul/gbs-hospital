"use strict";

const router = require("express").Router();

const {
    checkDatabaseConnection
} = require("../core/database/prisma.connection");
const envConfig = require("../config/environment/environment.config");
const {
    getGlobalOverviewStats,
    getEnvironmentAndDataIdentification,
    getFacilityBranding,
    updateFacilityBranding
} = require("../modules/tenant-management/backup-and-environment.service");

router.get("/", async (req, res) => {
    const database = await checkDatabaseConnection();

    res.status(database ? 200 : 503).json({
        status: database ? "healthy" : "degraded",
        server: "running",
        database: database ? "connected" : "offline",
        engine: "PostgreSQL",
        environment: envConfig.activeEnvironment,
        timestamp: new Date(),
        uptime: process.uptime(),
        requestId: req.requestId || null
    });
});

// Real-time PostgreSQL Global Overview Statistics (Zero Hardcoded Data)
router.get("/overview-stats", async (req, res, next) => {
    try {
        const stats = await getGlobalOverviewStats();
        return res.status(200).json({
            success: true,
            data: stats
        });
    } catch (err) {
        next(err);
    }
});

// Environment & Data Identification Summary
router.get("/environment-info", async (req, res, next) => {
    try {
        const info = await getEnvironmentAndDataIdentification();
        return res.status(200).json({
            success: true,
            data: info
        });
    } catch (err) {
        next(err);
    }
});

// Hospital Facility Branding (Main System Name is locked to GBS HOSPITAL MANAGEMENT SYSTEM; Admin can customize hospitalName)
router.get("/facility-branding", async (req, res, next) => {
    try {
        const branding = await getFacilityBranding();
        return res.status(200).json({
            success: true,
            data: branding
        });
    } catch (err) {
        next(err);
    }
});

router.put("/facility-branding", async (req, res, next) => {
    try {
        const branding = await updateFacilityBranding(req.body || {}, req.body?.updatedBy || "Administrator");
        return res.status(200).json({
            success: true,
            message: `Hospital facility name updated to "${branding.hospitalName}". Main system name remains "${branding.mainSystemName}".`,
            data: branding
        });
    } catch (err) {
        next(err);
    }
});

router.post("/facility-branding", async (req, res, next) => {
    try {
        const branding = await updateFacilityBranding(req.body || {}, req.body?.updatedBy || "Administrator");
        return res.status(200).json({
            success: true,
            message: `Hospital facility name updated to "${branding.hospitalName}". Main system name remains "${branding.mainSystemName}".`,
            data: branding
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
