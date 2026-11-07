"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
GIS FACILITY TRACKING, GEOFENCING & FLOOR PLANS SERVICE
Phase 21 Production Hardened - CommonJS Only
LOCATION: src/modules/facility-maps/facility-maps.service.js
====================================================
*/

const prisma = require("../../core/database/prisma.client");
const AppError = require("../../core/errors/app.error");
const logger = require("../../core/utils/logger");
const { generateGeofenceCode, generateFloorPlanCode } = require("./helpers/facility-id.generator");
const { calculateHaversineDistance, evaluateGeofenceStatus } = require("./helpers/geofence-math");

/**
 * 1. Create Facility Geofence
 */
async function createGeofence({
    name,
    facilityType = "HOSPITAL_CAMPUS",
    centerLatitude,
    centerLongitude,
    radiusMeters = 500.0,
    polygonCoordinates,
    alertOnBreach = true,
    hospitalId
}) {
    if (!name || typeof name !== "string" || !name.trim()) {
        throw new AppError("Geofence perimeter name is required", 400, "MISSING_GEOFENCE_NAME");
    }

    if (centerLatitude === undefined || centerLongitude === undefined) {
        throw new AppError("Geofence center GPS coordinates (latitude and longitude) are required", 400, "MISSING_COORDINATES");
    }

    const lat = parseFloat(centerLatitude);
    const lng = parseFloat(centerLongitude);
    const radius = parseFloat(radiusMeters);

    if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new AppError("Invalid latitude value. Must be between -90 and 90.", 400, "INVALID_LATITUDE");
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
        throw new AppError("Invalid longitude value. Must be between -180 and 180.", 400, "INVALID_LONGITUDE");
    }
    if (isNaN(radius) || radius <= 0) {
        throw new AppError("Radius must be a positive number in meters.", 400, "INVALID_RADIUS");
    }

    const code = await generateGeofenceCode();

    const geofence = await prisma.facilityGeofence.create({
        data: {
            code,
            name: name.trim(),
            facilityType,
            hospitalId: hospitalId || null,
            centerLatitude: lat,
            centerLongitude: lng,
            radiusMeters: radius,
            polygonCoordinates: polygonCoordinates ? (typeof polygonCoordinates === "string" ? polygonCoordinates : JSON.stringify(polygonCoordinates)) : null,
            alertOnBreach: !!alertOnBreach,
            active: true,
            status: "ACTIVE"
        }
    });

    logger.info(`Facility geofence ${geofence.code} (${geofence.name}) created with radius ${radius}m.`);
    return geofence;
}

/**
 * 2. Get Geofences with Optional Filters
 */
async function getGeofences({ hospitalId, facilityType, active } = {}) {
    const where = {};
    if (hospitalId) where.hospitalId = hospitalId;
    if (facilityType) where.facilityType = facilityType;
    if (active !== undefined) where.active = active === "true" || active === true;

    return await prisma.facilityGeofence.findMany({
        where,
        orderBy: { createdAt: "desc" }
    });
}

/**
 * 3. Evaluate Location Ping and Detect Geofence Breaches
 */
async function evaluateLocationPing({
    entityType = "AMBULANCE",
    entityId,
    entityName,
    latitude,
    longitude,
    hospitalId
}) {
    if (!entityId) throw new AppError("Entity ID or tracker code is required", 400, "MISSING_ENTITY_ID");
    if (latitude === undefined || longitude === undefined) {
        throw new AppError("GPS latitude and longitude are required for ping evaluation", 400, "MISSING_COORDINATES");
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
        throw new AppError("Latitude and longitude must be valid floating point coordinates", 400, "INVALID_COORDINATES");
    }

    const where = { active: true };
    if (hospitalId) where.hospitalId = hospitalId;

    const geofences = await prisma.facilityGeofence.findMany({ where });

    const evaluations = [];
    const activeAlerts = [];

    for (const gf of geofences) {
        const evalResult = evaluateGeofenceStatus(lat, lng, gf);
        evaluations.push(evalResult);

        // If outside perimeter and geofence has breach alerting enabled
        if (!evalResult.isInside && gf.alertOnBreach) {
            const breachEvent = await prisma.geofenceBreachEvent.create({
                data: {
                    geofenceId: gf.id,
                    entityType,
                    entityId,
                    entityName: entityName || entityId,
                    latitude: lat,
                    longitude: lng,
                    distanceMeters: evalResult.distanceMeters,
                    eventType: "PERIMETER_BREACH",
                    severity: evalResult.distanceMeters > gf.radiusMeters * 2 ? "CRITICAL_ALERT" : "WARNING",
                    notes: `Entity ${entityName || entityId} detected ${Math.round(evalResult.distanceMeters - gf.radiusMeters)}m outside ${gf.name}`
                }
            });
            activeAlerts.push(breachEvent);
        } else if (evalResult.isInside) {
            // Check if this was a recent return/entry
            const lastEvent = await prisma.geofenceBreachEvent.findFirst({
                where: { geofenceId: gf.id, entityId },
                orderBy: { timestamp: "desc" }
            });

            if (lastEvent && lastEvent.eventType === "PERIMETER_BREACH") {
                const entryEvent = await prisma.geofenceBreachEvent.create({
                    data: {
                        geofenceId: gf.id,
                        entityType,
                        entityId,
                        entityName: entityName || entityId,
                        latitude: lat,
                        longitude: lng,
                        distanceMeters: evalResult.distanceMeters,
                        eventType: "GEOFENCE_ENTRY",
                        severity: "INFO",
                        notes: `Entity ${entityName || entityId} returned inside ${gf.name}`
                    }
                });
                activeAlerts.push(entryEvent);
            }
        }
    }

    return {
        ping: {
            entityType,
            entityId,
            entityName: entityName || entityId,
            latitude: lat,
            longitude: lng,
            evaluatedAt: new Date()
        },
        geofenceEvaluations: evaluations,
        activeAlerts
    };
}

/**
 * 4. List Breach Events
 */
async function getBreachEvents({ geofenceId, entityType, eventType, page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (geofenceId) where.geofenceId = geofenceId;
    if (entityType) where.entityType = entityType;
    if (eventType) where.eventType = eventType;

    const [total, events] = await Promise.all([
        prisma.geofenceBreachEvent.count({ where }),
        prisma.geofenceBreachEvent.findMany({
            where,
            skip,
            take: limitNum,
            orderBy: { timestamp: "desc" },
            include: {
                geofence: {
                    select: { code: true, name: true, facilityType: true }
                }
            }
        })
    ]);

    return {
        events,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
        }
    };
}

/**
 * 5. Create Interactive Floor Plan
 */
async function createFloorPlan({
    buildingName,
    floorNumber,
    floorName,
    totalBeds = 0,
    totalRooms = 0,
    layoutData,
    hospitalId
}) {
    if (!buildingName || !floorName || floorNumber === undefined) {
        throw new AppError("Building name, floor name, and floor number are required", 400, "MISSING_FLOOR_DATA");
    }

    const code = await generateFloorPlanCode();

    const floorPlan = await prisma.facilityFloorPlan.create({
        data: {
            code,
            buildingName: buildingName.trim(),
            floorNumber: parseInt(floorNumber, 10),
            floorName: floorName.trim(),
            totalBeds: parseInt(totalBeds, 10) || 0,
            totalRooms: parseInt(totalRooms, 10) || 0,
            layoutData: layoutData ? (typeof layoutData === "string" ? layoutData : JSON.stringify(layoutData)) : null,
            active: true
        }
    });

    logger.info(`Floor plan ${floorPlan.code} (${floorPlan.buildingName} - ${floorPlan.floorName}) created.`);
    return floorPlan;
}

/**
 * 6. Get Floor Plans
 */
async function getFloorPlans({ buildingName, active } = {}) {
    const where = {};
    if (buildingName) where.buildingName = { contains: buildingName, mode: "insensitive" };
    if (active !== undefined) where.active = active === "true" || active === true;

    const plans = await prisma.facilityFloorPlan.findMany({
        where,
        orderBy: [{ buildingName: "asc" }, { floorNumber: "asc" }]
    });

    return plans.map(p => ({
        ...p,
        layoutData: p.layoutData ? JSON.parse(p.layoutData) : null
    }));
}

/**
 * 7. Get Floor Plan by ID
 */
async function getFloorPlanById(id) {
    if (!id) throw new AppError("Floor plan ID is required", 400, "MISSING_ID");

    const plan = await prisma.facilityFloorPlan.findUnique({
        where: { id }
    });

    if (!plan) throw new AppError(`Floor plan with ID ${id} not found`, 404, "NOT_FOUND");

    return {
        ...plan,
        layoutData: plan.layoutData ? JSON.parse(plan.layoutData) : null
    };
}

/**
 * 8. GIS & Facility Command Center Telemetry
 */
async function getGisTelemetry() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
        totalGeofences,
        activeGeofences,
        totalBreachEvents,
        breachesToday,
        totalFloorPlans,
        bedsAggregate,
        recentBreaches
    ] = await Promise.all([
        prisma.facilityGeofence.count(),
        prisma.facilityGeofence.count({ where: { active: true } }),
        prisma.geofenceBreachEvent.count(),
        prisma.geofenceBreachEvent.count({ where: { timestamp: { gte: todayStart } } }),
        prisma.facilityFloorPlan.count(),
        prisma.facilityFloorPlan.aggregate({
            _sum: {
                totalBeds: true,
                totalRooms: true
            }
        }),
        prisma.geofenceBreachEvent.findMany({
            take: 5,
            orderBy: { timestamp: "desc" },
            include: {
                geofence: { select: { name: true, code: true } }
            }
        })
    ]);

    return {
        totalGeofences,
        activeGeofences,
        totalBreachEvents,
        breachesToday,
        totalFloorPlans,
        totalManagedBeds: bedsAggregate._sum.totalBeds || 0,
        totalManagedRooms: bedsAggregate._sum.totalRooms || 0,
        recentBreaches
    };
}

module.exports = {
    createGeofence,
    getGeofences,
    evaluateLocationPing,
    getBreachEvents,
    createFloorPlan,
    getFloorPlans,
    getFloorPlanById,
    getGisTelemetry
};
