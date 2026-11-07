"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ENTERPRISE TENANT MANAGEMENT CONTROLLER
Developer Control Center, Live Countdown & GPS Telemetry
LOCATION: src/modules/tenant-management/tenant-management.controller.js
====================================================
*/

const tenantService = require("./tenant-management.service");
const backupAndEnvService = require("./backup-and-environment.service");
const logger = require("../../core/utils/logger");

/**
 * Public Institution Registration
 * POST /api/v1/tenants/register
 */
async function registerTenant(req, res, next) {
    try {
        const result = await tenantService.registerTenant(req.body);
        return res.status(201).json({
            success: true,
            message: "Institution successfully registered. Pending Developer review and provisioning.",
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Developer Control Center Summary Telemetry
 * GET /api/v1/tenants/console-summary
 */
async function getDeveloperConsoleSummary(req, res, next) {
    try {
        const summary = await tenantService.getDeveloperConsoleSummary();
        return res.status(200).json({
            success: true,
            data: summary
        });
    } catch (error) {
        next(error);
    }
}

/**
 * List all registered institutions
 * GET /api/v1/tenants
 */
async function getTenants(req, res, next) {
    try {
        const { status, search, page, limit } = req.query;
        const result = await tenantService.getTenants({
            status,
            search,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20
        });

        return res.status(200).json({
            success: true,
            data: result.tenants,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get tenant details by ID or tenantId code
 * GET /api/v1/tenants/:id
 */
async function getTenantById(req, res, next) {
    try {
        const { id } = req.params;
        const tenant = await tenantService.getTenantById(id);
        return res.status(200).json({
            success: true,
            data: tenant
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Developer Approval & Automated Provisioning
 * POST /api/v1/tenants/:id/approve
 */
async function approveAndProvisionTenant(req, res, next) {
    try {
        const { id } = req.params;
        const developerUserId = req.user.id;
        const options = req.body || {};

        const result = await tenantService.approveAndProvisionTenant(id, options, developerUserId);
        return res.status(200).json({
            success: true,
            message: "Institution approved and fully provisioned with automated infrastructure.",
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Lock Tenant System Access
 * POST /api/v1/tenants/:id/lock
 */
async function lockTenant(req, res, next) {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const developerUserId = req.user.id;

        const result = await tenantService.lockTenant(id, reason, developerUserId);
        return res.status(200).json({
            success: true,
            message: "Tenant access has been locked.",
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Unlock Tenant System Access
 * POST /api/v1/tenants/:id/unlock
 */
async function unlockTenant(req, res, next) {
    try {
        const { id } = req.params;
        const developerUserId = req.user.id;

        const result = await tenantService.unlockTenant(id, developerUserId);
        return res.status(200).json({
            success: true,
            message: "Tenant access has been unlocked and restored.",
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Extend Subscription License & Recalculate Countdown
 * POST /api/v1/tenants/:id/extend
 */
async function extendSubscription(req, res, next) {
    try {
        const { id } = req.params;
        const developerUserId = req.user.id;
        const options = req.body || {};

        const result = await tenantService.extendSubscription(id, options, developerUserId);
        return res.status(200).json({
            success: true,
            message: "Subscription successfully extended.",
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Live Facility GPS Locations for Developer Map
 * GET /api/v1/tenants/tracking/live-locations
 */
async function getLiveTenantLocations(req, res, next) {
    try {
        const locations = await tenantService.getLiveTenantLocations();
        return res.status(200).json({
            success: true,
            count: locations.length,
            data: locations
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Record Tenant Device / Server Location Ping
 * POST /api/v1/tenants/:id/location-ping
 */
async function recordLocationPing(req, res, next) {
    try {
        const { id } = req.params;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const pingData = { ...req.body, ipAddress };

        const ping = await tenantService.recordLocationPing(id, pingData);
        return res.status(201).json({
            success: true,
            data: ping
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Developer to Tenant Direct Message
 * POST /api/v1/tenants/messages
 */
async function sendMessage(req, res, next) {
    try {
        const { tenantId, title, message, content, priority } = req.body;
        const senderId = req.user.id;

        const result = await tenantService.sendMessageToTenant(
            {
                tenantIdentifier: tenantId,
                title: title || "Developer Notification",
                message: message || content || "",
                priority: priority || "NORMAL"
            },
            senderId
        );

        return res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Messages for a Tenant
 * GET /api/v1/tenants/:id/messages
 */
async function getMessages(req, res, next) {
    try {
        const { id } = req.params;
        const messages = await tenantService.getTenantMessages(id);
        return res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Initiate Developer Video Call Session
 * POST /api/v1/tenants/video-call/initiate
 */
async function initiateVideoCall(req, res, next) {
    try {
        const { tenantId, channelName } = req.body;
        const developerUserId = req.user.id;

        const session = await tenantService.initiateVideoCall(tenantId, developerUserId, channelName);
        return res.status(200).json({
            success: true,
            data: session
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update Tenant Lifecycle Status (Reject, Request Verification, Activate, Suspend, Archive, Restore)
 * POST /api/v1/tenants/:id/lifecycle
 */
async function updateTenantLifecycleStatus(req, res, next) {
    try {
        const { id } = req.params;
        const developerUserId = req.user.id;
        const result = await tenantService.updateTenantLifecycleStatus(id, req.body || {}, developerUserId);
        return res.status(200).json({
            success: true,
            message: result.message,
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Environment & Data Source Identification Report
 * GET /api/v1/tenants/developer/environment-status
 */
async function getEnvironmentAndDataIdentification(req, res, next) {
    try {
        const report = await backupAndEnvService.getEnvironmentAndDataIdentification();
        return res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        next(error);
    }
}

/**
 * List All Database Backups
 * GET /api/v1/tenants/developer/backups
 */
async function listDatabaseBackups(req, res, next) {
    try {
        const backups = await backupAndEnvService.listDatabaseBackups();
        return res.status(200).json({
            success: true,
            count: backups.length,
            data: backups
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Create & Verify a Full Database Backup
 * POST /api/v1/tenants/developer/backups/create
 */
async function createDatabaseBackup(req, res, next) {
    try {
        const developerUserId = req.user?.id || null;
        const backup = await backupAndEnvService.createDatabaseBackup(req.body || {}, developerUserId);
        return res.status(201).json({
            success: true,
            message: `Database backup ${backup.filename} created and SHA-256 verified.`,
            data: backup
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Verify a Database Backup File
 * POST /api/v1/tenants/developer/backups/:filename/verify
 */
async function verifyDatabaseBackup(req, res, next) {
    try {
        const { filename } = req.params;
        const result = await backupAndEnvService.verifyDatabaseBackup(filename);
        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Restore a Verified Database Backup File
 * POST /api/v1/tenants/developer/backups/:filename/restore
 */
async function restoreDatabaseBackup(req, res, next) {
    try {
        const { filename } = req.params;
        const developerUserId = req.user?.id || null;
        const result = await backupAndEnvService.restoreDatabaseBackup(filename, developerUserId);
        return res.status(200).json({
            success: true,
            message: `Backup ${filename} verified and restored successfully.`,
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Purge Development/Test Data Only (Protected by Automatic Pre-Purge Backup)
 * POST /api/v1/tenants/developer/purge-test-data
 */
async function purgeDevelopmentTestData(req, res, next) {
    try {
        const developerUserId = req.user?.id || null;
        const result = await backupAndEnvService.purgeDevelopmentTestData(req.body || {}, developerUserId);
        return res.status(200).json({
            success: true,
            message: `Pre-purge backup ${result.backupCreated.filename} verified. Purged ${result.totalDeletedRecords} test/demo records.`,
            data: result
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    registerTenant,
    getDeveloperConsoleSummary,
    getTenants,
    getTenantById,
    approveAndProvisionTenant,
    lockTenant,
    unlockTenant,
    extendSubscription,
    getLiveTenantLocations,
    recordLocationPing,
    sendMessage,
    getMessages,
    initiateVideoCall,
    updateTenantLifecycleStatus,
    getEnvironmentAndDataIdentification,
    listDatabaseBackups,
    createDatabaseBackup,
    verifyDatabaseBackup,
    restoreDatabaseBackup,
    purgeDevelopmentTestData
};
