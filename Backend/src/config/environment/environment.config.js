"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ENVIRONMENT & DATA IDENTIFICATION CONFIGURATION
Separates DEVELOPMENT and PRODUCTION environments
LOCATION: Backend/src/config/environment/environment.config.js
====================================================
*/

const path = require("path");

const rawEnv = (process.env.NODE_ENV || "development").toLowerCase();
const isProduction = rawEnv === "production";
const isTest = rawEnv === "test";
const isDevelopment = !isProduction && !isTest;

const activeEnvironment = isProduction
    ? "PRODUCTION"
    : isTest
    ? "DEVELOPMENT_TEST"
    : "DEVELOPMENT";

function getSafeDatabaseMetadata() {
    const dbUrl = process.env.DATABASE_URL || "";
    try {
        const parsed = new URL(dbUrl);
        return {
            engine: "PostgreSQL",
            host: parsed.hostname || "localhost",
            port: parsed.port || "5432",
            databaseName: (parsed.pathname || "/gbs_hospital").replace(/^\//, ""),
            sslMode: parsed.searchParams.get("sslmode") || (isProduction ? "require" : "prefer")
        };
    } catch (_err) {
        return {
            engine: "PostgreSQL",
            host: "localhost",
            port: "5432",
            databaseName: "gbs_hospital",
            sslMode: isProduction ? "require" : "prefer"
        };
    }
}

module.exports = {
    NODE_ENV: rawEnv,
    activeEnvironment,
    isProduction,
    isDevelopment,
    isTest,
    defaultDataSource: isProduction ? "PRODUCTION" : isTest ? "DEVELOPMENT_TEST" : "PRODUCTION",
    allowDemoSeedingInProduction: false,
    backupDirectory: path.resolve(__dirname, "../../../backups"),
    officialCompanyEmail: "gabosei48@gmail.com",
    cloudHostingProvider: "Render.com",
    getSafeDatabaseMetadata
};
