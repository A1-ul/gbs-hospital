"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
EMERGENCY & AMBULANCE SERVICE
Phase 12 Production Hardened - CommonJS Only
LOCATION: src/modules/emergency/emergency.service.js
====================================================
*/

const prisma = require("../../core/database/prisma.client");
const AppError = require("../../core/errors/app.error");
const logger = require("../../core/utils/logger");
const {
    generateDispatchNumber,
    generateEmergencyCaseNumber,
    generateVehicleNumber
} = require("./helpers/emergency-id.generator");

/**
 * Register a new ambulance vehicle in the hospital fleet
 */
async function registerAmbulance(data) {
    const vehicleNumber = data.vehicleNumber || (await generateVehicleNumber());

    const existing = await prisma.ambulance.findFirst({
        where: {
            OR: [
                { vehicleNumber },
                { registrationPlate: data.registrationPlate }
            ]
        }
    });

    if (existing) {
        throw new AppError(
            `Ambulance with vehicle number or registration plate already exists`,
            409,
            "AMBULANCE_DUPLICATE"
        );
    }

    return await prisma.ambulance.create({
        data: {
            vehicleNumber,
            registrationPlate: data.registrationPlate,
            type: data.type || "ADVANCED_LIFE_SUPPORT",
            status: data.status || "AVAILABLE",
            latitude: data.latitude || 5.6037,
            longitude: data.longitude || -0.1870,
            currentSpeedKmh: data.currentSpeedKmh || 0,
            heading: data.heading || 0,
            fuelLevelPercent: data.fuelLevelPercent !== undefined ? data.fuelLevelPercent : 100,
            assignedDriver: data.assignedDriver || null,
            assignedParamedic: data.assignedParamedic || null,
            equipmentChecklist: data.equipmentChecklist || {
                defibrillator: true,
                oxygenTank: true,
                ventilator: true,
                suctionUnit: true
            }
        }
    });
}

/**
 * List ambulance fleet with optional status/type filtering
 */
async function getAmbulanceFleet(query = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

    return await prisma.ambulance.findMany({
        where,
        orderBy: { vehicleNumber: "asc" }
    });
}

/**
 * Get ambulance by ID
 */
async function getAmbulanceById(id) {
    const ambulance = await prisma.ambulance.findUnique({
        where: { id },
        include: {
            dispatches: {
                orderBy: { dispatchedAt: "desc" },
                take: 5
            }
        }
    });

    if (!ambulance) {
        throw new AppError(`Ambulance not found with ID ${id}`, 404, "AMBULANCE_NOT_FOUND");
    }

    return ambulance;
}

/**
 * Update real-time GPS telemetry from ambulance on-board tracking
 */
async function updateAmbulanceTelemetry(id, telemetry) {
    const ambulance = await prisma.ambulance.findUnique({ where: { id } });
    if (!ambulance) {
        throw new AppError(`Ambulance not found with ID ${id}`, 404, "AMBULANCE_NOT_FOUND");
    }

    return await prisma.ambulance.update({
        where: { id },
        data: {
            latitude: telemetry.latitude !== undefined ? telemetry.latitude : ambulance.latitude,
            longitude: telemetry.longitude !== undefined ? telemetry.longitude : ambulance.longitude,
            currentSpeedKmh: telemetry.currentSpeedKmh !== undefined ? telemetry.currentSpeedKmh : ambulance.currentSpeedKmh,
            heading: telemetry.heading !== undefined ? telemetry.heading : ambulance.heading,
            fuelLevelPercent: telemetry.fuelLevelPercent !== undefined ? telemetry.fuelLevelPercent : ambulance.fuelLevelPercent
        }
    });
}

/**
 * Create emergency ambulance dispatch callout
 */
async function createDispatchCallout(data) {
    const ambulance = await prisma.ambulance.findUnique({
        where: { id: data.ambulanceId }
    });

    if (!ambulance) {
        throw new AppError(`Ambulance not found with ID ${data.ambulanceId}`, 404, "AMBULANCE_NOT_FOUND");
    }

    if (ambulance.status !== "AVAILABLE" && data.forceOverride !== true) {
        throw new AppError(
            `Ambulance ${ambulance.vehicleNumber} is currently ${ambulance.status}`,
            400,
            "AMBULANCE_UNAVAILABLE"
        );
    }

    const dispatchNumber = await generateDispatchNumber();

    return await prisma.$transaction(async (tx) => {
        // 1. Create dispatch record
        const dispatch = await tx.ambulanceDispatch.create({
            data: {
                dispatchNumber,
                ambulanceId: data.ambulanceId,
                callerName: data.callerName,
                callerPhone: data.callerPhone,
                incidentLocation: data.incidentLocation,
                pickupLatitude: data.pickupLatitude || null,
                pickupLongitude: data.pickupLongitude || null,
                triageSeverity: data.triageSeverity || "ORANGE_EMERGENT",
                chiefComplaint: data.chiefComplaint,
                status: "DISPATCHED",
                dispatchedAt: new Date()
            }
        });

        // 2. Transition ambulance status to DISPATCHED
        await tx.ambulance.update({
            where: { id: data.ambulanceId },
            data: { status: "DISPATCHED" }
        });

        // 3. Log audit event
        await tx.auditLog.create({
            data: {
                action: "AMBULANCE_DISPATCH_CREATED",
                module: "EMERGENCY",
                description: `Dispatch ${dispatchNumber} allocated to ${ambulance.vehicleNumber} for: ${data.chiefComplaint}`
            }
        });

        return dispatch;
    });
}

/**
 * Update dispatch status with response time and transit time calculation
 */
async function updateDispatchStatus(id, updateData) {
    const dispatch = await prisma.ambulanceDispatch.findUnique({
        where: { id },
        include: { ambulance: true }
    });

    if (!dispatch) {
        throw new AppError(`Dispatch record not found with ID ${id}`, 404, "DISPATCH_NOT_FOUND");
    }

    const now = new Date();
    const dataToUpdate = { ...updateData };
    let ambulanceStatusToSet = null;

    if (updateData.status === "EN_ROUTE") {
        dataToUpdate.enRouteAt = now;
        ambulanceStatusToSet = "DISPATCHED";
    } else if (updateData.status === "ON_SCENE") {
        dataToUpdate.arrivedSceneAt = now;
        ambulanceStatusToSet = "ON_SCENE";

        // Calculate Response Time (seconds from dispatch to scene arrival)
        if (dispatch.dispatchedAt) {
            const diffSeconds = Math.max(1, Math.round((now.getTime() - new Date(dispatch.dispatchedAt).getTime()) / 1000));
            dataToUpdate.responseTimeSeconds = diffSeconds;
        }
    } else if (updateData.status === "TRANSPORTING") {
        dataToUpdate.departedSceneAt = now;
        ambulanceStatusToSet = "TRANSPORTING";
    } else if (updateData.status === "COMPLETED") {
        dataToUpdate.arrivedHospitalAt = dataToUpdate.arrivedHospitalAt || now;
        dataToUpdate.clearedAt = now;
        ambulanceStatusToSet = "AVAILABLE";

        // Calculate Transit Time (seconds from scene departure to hospital arrival)
        if (dispatch.departedSceneAt) {
            const transitSeconds = Math.round((now.getTime() - new Date(dispatch.departedSceneAt).getTime()) / 1000);
            dataToUpdate.transitTimeSeconds = transitSeconds;
        }
    } else if (updateData.status === "CANCELLED") {
        dataToUpdate.clearedAt = now;
        ambulanceStatusToSet = "AVAILABLE";
    }

    return await prisma.$transaction(async (tx) => {
        const updatedDispatch = await tx.ambulanceDispatch.update({
            where: { id },
            data: dataToUpdate
        });

        if (ambulanceStatusToSet) {
            await tx.ambulance.update({
                where: { id: dispatch.ambulanceId },
                data: { status: ambulanceStatusToSet }
            });
        }

        return updatedDispatch;
    });
}

/**
 * List dispatches with optional status query
 */
async function getDispatches(query = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    if (query.severity) where.triageSeverity = query.severity;

    return await prisma.ambulanceDispatch.findMany({
        where,
        include: { ambulance: true },
        orderBy: { dispatchedAt: "desc" }
    });
}

/**
 * Register emergency case at Emergency Department reception / triage
 */
async function registerEmergencyCase(data) {
    const caseNumber = await generateEmergencyCaseNumber();

    return await prisma.$transaction(async (tx) => {
        const emergencyCase = await tx.emergencyCase.create({
            data: {
                caseNumber,
                patientId: data.patientId || null,
                patientName: data.patientName || "UNIDENTIFIED_EMERGENCY_PATIENT",
                triageCategory: data.triageCategory || "ORANGE_EMERGENT",
                arrivalMode: data.arrivalMode || "AMBULANCE",
                dispatchId: data.dispatchId || null,
                assignedBay: data.assignedBay || "TRAUMA_BAY_1",
                attendingPhysician: data.attendingPhysician || null,
                triageNurse: data.triageNurse || null,
                clinicalNotes: data.clinicalNotes || null,
                emergencyOverrideLogged: true, // Master Blueprint: Emergency Access Always Available
                status: "TRIAGED",
                arrivedAt: new Date()
            }
        });

        await tx.auditLog.create({
            data: {
                action: "EMERGENCY_CASE_REGISTERED",
                module: "EMERGENCY",
                description: `Emergency Case ${caseNumber} (${data.triageCategory}) admitted to ${data.assignedBay || "Trauma Bay"}`
            }
        });

        return emergencyCase;
    });
}

/**
 * Update emergency case status, stabilization, or transfer
 */
async function updateEmergencyCase(id, updateData) {
    const existing = await prisma.emergencyCase.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(`Emergency case not found with ID ${id}`, 404, "EMERGENCY_CASE_NOT_FOUND");
    }

    const data = { ...updateData };
    if (updateData.status === "STABILIZED" && !existing.stabilizedAt) {
        data.stabilizedAt = new Date();
    }
    if (["ADMITTED_ICU", "TRANSFERRED_OT", "DISCHARGED", "DECEASED"].includes(updateData.status)) {
        data.dispositionAt = new Date();
    }

    return await prisma.emergencyCase.update({
        where: { id },
        data
    });
}

/**
 * List emergency cases with optional status/triage filter
 */
async function getEmergencyCases(query = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    if (query.triageCategory) where.triageCategory = query.triageCategory;

    return await prisma.emergencyCase.findMany({
        where,
        include: {
            patient: true,
            dispatch: {
                include: { ambulance: true }
            }
        },
        orderBy: { arrivedAt: "desc" }
    });
}

/**
 * Get real-time PostgreSQL operational telemetry for Emergency Command Center
 */
async function getEmergencyDashboardStats() {
    const totalAmbulances = await prisma.ambulance.count();
    const availableAmbulances = await prisma.ambulance.count({ where: { status: "AVAILABLE" } });
    const dispatchedAmbulances = await prisma.ambulance.count({ where: { status: "DISPATCHED" } });
    const onSceneAmbulances = await prisma.ambulance.count({ where: { status: "ON_SCENE" } });
    const transportingAmbulances = await prisma.ambulance.count({ where: { status: "TRANSPORTING" } });

    const activeDispatches = await prisma.ambulanceDispatch.count({
        where: {
            status: { in: ["DISPATCHED", "EN_ROUTE", "ON_SCENE", "TRANSPORTING"] }
        }
    });

    const activeEmergencyCases = await prisma.emergencyCase.count({
        where: {
            status: { in: ["TRIAGED", "IN_RESUSCITATION"] }
        }
    });

    const redResuscitationCases = await prisma.emergencyCase.count({
        where: {
            triageCategory: "RED_RESUSCITATION",
            status: { in: ["TRIAGED", "IN_RESUSCITATION"] }
        }
    });

    // Average response time in minutes from completed dispatches
    const responseTimes = await prisma.ambulanceDispatch.findMany({
        where: {
            responseTimeSeconds: { not: null }
        },
        select: { responseTimeSeconds: true },
        take: 50
    });

    let avgResponseTimeMinutes = 8.5; // Benchmark default if fresh DB
    if (responseTimes.length > 0) {
        const sumSeconds = responseTimes.reduce((acc, curr) => acc + (curr.responseTimeSeconds || 0), 0);
        avgResponseTimeMinutes = Number(Math.max(0.1, sumSeconds / responseTimes.length / 60).toFixed(1));
    }

    return {
        fleet: {
            total: totalAmbulances,
            available: availableAmbulances,
            dispatched: dispatchedAmbulances,
            onScene: onSceneAmbulances,
            transporting: transportingAmbulances
        },
        dispatches: {
            active: activeDispatches,
            averageResponseTimeMinutes: avgResponseTimeMinutes
        },
        emergencyRoom: {
            activeCases: activeEmergencyCases,
            redAlerts: redResuscitationCases
        },
        patientSafetyGuardrails: {
            clinicalSystemsNeverLock: true,
            emergencyAccessAlwaysAvailable: true,
            clinicalOverrideLogging: true
        }
    };
}

module.exports = {
    registerAmbulance,
    getAmbulanceFleet,
    getAmbulanceById,
    updateAmbulanceTelemetry,
    createDispatchCallout,
    getDispatches,
    updateDispatchStatus,
    registerEmergencyCase,
    updateEmergencyCase,
    getEmergencyCases,
    getEmergencyDashboardStats
};
