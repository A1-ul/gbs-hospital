"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
GIS & GEOFENCING - MATHEMATICAL SPATIAL ENGINE
Haversine Geodesic Distance & Ray-Casting Polygon Evaluator
Phase 21 Production Hardened - CommonJS Only
LOCATION: src/modules/facility-maps/helpers/geofence-math.js
====================================================
*/

const EARTH_RADIUS_METERS = 6371000; // Mean Earth radius in meters

/**
 * Calculates geodesic distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 Latitude 1 (degrees)
 * @param {number} lon1 Longitude 1 (degrees)
 * @param {number} lat2 Latitude 2 (degrees)
 * @param {number} lon2 Longitude 2 (degrees)
 * @returns {number} Distance in meters
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const toRadians = (deg) => (deg * Math.PI) / 180.0;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(EARTH_RADIUS_METERS * c * 100) / 100; // In meters rounded to 2 decimal places
}

/**
 * Evaluates whether a GPS point is inside a polygon using Ray-Casting Algorithm
 * @param {number} lat Point latitude
 * @param {number} lon Point longitude
 * @param {Array<Array<number>>} polygon Array of [lat, lon] coordinates
 * @returns {boolean} True if point is inside polygon
 */
function isPointInPolygon(lat, lon, polygon) {
    if (!Array.isArray(polygon) || polygon.length < 3) return false;

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];

        const intersect =
            yi > lon !== yj > lon &&
            lat < ((xj - xi) * (lon - yi)) / (yj - yi) + xi;

        if (intersect) inside = !inside;
    }

    return inside;
}

/**
 * Evaluates geofence status for a coordinate against a Geofence definition
 * @param {number} lat GPS Latitude
 * @param {number} lon GPS Longitude
 * @param {Object} geofence Geofence entity
 * @returns {Object} Evaluation details
 */
function evaluateGeofenceStatus(lat, lon, geofence) {
    const distanceMeters = calculateHaversineDistance(
        lat,
        lon,
        geofence.centerLatitude,
        geofence.centerLongitude
    );

    let isInside = false;

    // Check polygon if defined, otherwise check radial distance
    if (geofence.polygonCoordinates) {
        try {
            const polygon = JSON.parse(geofence.polygonCoordinates);
            if (Array.isArray(polygon) && polygon.length >= 3) {
                isInside = isPointInPolygon(lat, lon, polygon);
            } else {
                isInside = distanceMeters <= geofence.radiusMeters;
            }
        } catch (e) {
            isInside = distanceMeters <= geofence.radiusMeters;
        }
    } else {
        isInside = distanceMeters <= geofence.radiusMeters;
    }

    return {
        geofenceId: geofence.id,
        geofenceCode: geofence.code,
        geofenceName: geofence.name,
        distanceMeters,
        radiusMeters: geofence.radiusMeters,
        isInside,
        status: isInside ? "INSIDE_PERIMETER" : "OUTSIDE_PERIMETER"
    };
}

module.exports = {
    calculateHaversineDistance,
    isPointInPolygon,
    evaluateGeofenceStatus
};
