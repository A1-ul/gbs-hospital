"use strict";

const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const NODE_ENV = (process.env.NODE_ENV || "development").toLowerCase();
const allowedEnvironments = ["development", "test", "production"];

if (!allowedEnvironments.includes(NODE_ENV)) {
    throw new Error(`Invalid NODE_ENV: ${NODE_ENV}`);
}

const IS_PRODUCTION = NODE_ENV === "production";
const IS_TEST = NODE_ENV === "test";
const IS_DEVELOPMENT = NODE_ENV === "development";

function getBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }
    return String(value).trim().toLowerCase() === "true";
}

function getPort(value, fallback = 5000) {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        return fallback;
    }
    return port;
}

const DEV_ONLY_FALLBACK_JWT =
    "gbs-hospital-local-dev-only-jwt-secret-key-do-not-use-in-production-2026";

const resolvedJwtSecret =
    process.env.JWT_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    (IS_PRODUCTION ? "" : DEV_ONLY_FALLBACK_JWT);

const resolvedDatabaseUrl =
    process.env.DATABASE_URL ||
    (IS_PRODUCTION ? "" : "postgresql://postgres:Admin123@localhost:5432/gbs_hospital?schema=public");

const environment = Object.freeze({
    NODE_ENV,
    IS_DEVELOPMENT,
    IS_TEST,
    IS_PRODUCTION,
    PORT: getPort(process.env.PORT, 5000),
    HOST: process.env.HOST || "0.0.0.0",
    DATABASE_URL: resolvedDatabaseUrl,
    JWT_SECRET: resolvedJwtSecret,
    JWT_EXPIRE: process.env.JWT_EXPIRE || process.env.JWT_EXPIRES_IN || "24h",
    CORS_ORIGIN:
        process.env.CORS_ORIGIN ||
        (IS_PRODUCTION
            ? "https://gbs-hospital-system.onrender.com"
            : "http://localhost:3000,http://localhost:5173,http://localhost:5000"),
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
    TIMEZONE: process.env.TIMEZONE || "UTC",
    DEBUG: getBoolean(process.env.DEBUG, IS_DEVELOPMENT),
    DEMO_MODE_ENABLED: getBoolean(process.env.DEMO_MODE_ENABLED, !IS_PRODUCTION),
    DEVELOPER_ROOT_EMAIL: (process.env.DEVELOPER_ROOT_EMAIL || "gabosei48@gmail.com").trim().toLowerCase(),
    DEVELOPER_ROOT_PASSWORD: process.env.DEVELOPER_ROOT_PASSWORD || "",
    RENDER_SERVICE_NAME: process.env.RENDER_SERVICE_NAME || "gbs-hospital-system",
    PRODUCTION_PUBLIC_URL: process.env.PRODUCTION_PUBLIC_URL || "https://gbs-hospital-system.onrender.com",
    SECURITY: Object.freeze({
        STRICT_COOKIES: IS_PRODUCTION,
        ENABLE_RATE_LIMIT: !IS_TEST,
        EXPOSE_ERRORS: IS_DEVELOPMENT
    })
});

function validateEnvironment() {
    const required = ["DATABASE_URL", "JWT_SECRET"];
    const missing = required.filter(
        (key) => !environment[key] || String(environment[key]).trim() === ""
    );

    if (missing.length) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    if (environment.IS_PRODUCTION && environment.JWT_SECRET.length < 32) {
        throw new Error("Production JWT_SECRET must contain at least 32 characters");
    }

    if (environment.PORT < 1 || environment.PORT > 65535) {
        throw new Error("Invalid PORT configuration");
    }

    return true;
}

function getEnvironmentInfo() {
    return Object.freeze({
        environment: environment.NODE_ENV,
        host: environment.HOST,
        port: environment.PORT,
        production: environment.IS_PRODUCTION,
        development: environment.IS_DEVELOPMENT,
        test: environment.IS_TEST,
        demoModeEnabled: environment.DEMO_MODE_ENABLED,
        renderServiceName: environment.RENDER_SERVICE_NAME,
        productionPublicUrl: environment.PRODUCTION_PUBLIC_URL
    });
}

module.exports = {
    environment,
    validateEnvironment,
    getEnvironmentInfo
};
