"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
TELEMEDICINE & WEBRTC - ID & ROOM TOKEN GENERATOR
Phase 21 Production Hardened - CommonJS Only
LOCATION: src/modules/telemedicine/helpers/telemedicine-id.generator.js
====================================================
*/

const crypto = require("crypto");
const prisma = require("../../../core/database/prisma.client");

/**
 * Generates sequential Telemedicine Session Code: TEL-YYYY-XXXXXX
 */
async function generateSessionCode() {
    const year = new Date().getFullYear();
    const prefix = `TEL-${year}-`;

    const count = await prisma.telemedicineConsultation.count({
        where: {
            sessionCode: {
                startsWith: prefix
            }
        }
    });

    const nextSeq = String(count + 1).padStart(6, "0");
    return `${prefix}${nextSeq}`;
}

/**
 * Generates a cryptographically secure WebRTC room token
 */
function generateRoomToken() {
    const randomHex = crypto.randomBytes(16).toString("hex");
    return `room_webrtc_${Date.now()}_${randomHex}`;
}

module.exports = {
    generateSessionCode,
    generateRoomToken
};
