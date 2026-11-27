"use strict";

const { getRollbackReadiness } = require("../services/developer-remote-ops.service");
const backupService = require("../../tenant-management/backup-and-environment.service");

module.exports = {
    moduleName: "rollback",
    getRollbackReadiness,
    listDatabaseBackups: backupService.listDatabaseBackups,
    verifyDatabaseBackup: backupService.verifyDatabaseBackup,
    restoreDatabaseBackup: backupService.restoreDatabaseBackup
};
