"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
JEST GLOBAL TEARDOWN & PRISMA POOL HYGIENE
CommonJS Only
LOCATION: Backend/tests/setup/jest.afterEnv.js
====================================================
Ensures every Jest test suite flushes pending background
GBS-RCCE audit writes and disconnects its isolated
PrismaClient connection pool before the next suite starts,
preventing PostgreSQL max_connections exhaustion in CI.
*/

const prisma = require("../../src/core/database/prisma.client");
const {
    waitForPendingAuditWrites
} = require("../../src/core/middleware/rcce-audit.middleware");

afterAll(async () => {
    try {
        if (typeof waitForPendingAuditWrites === "function") {
            await waitForPendingAuditWrites(2000);
        }
    } catch (_err) {
        // Ignore teardown flush timeouts
    }

    try {
        await prisma.$disconnect();
    } catch (_err) {
        // Ignore disconnect errors if client was never connected in this suite
    }
});
