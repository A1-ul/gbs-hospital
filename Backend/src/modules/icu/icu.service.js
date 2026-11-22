"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ICU & LIVE VITALS MONITORING SERVICE
Live Monitoring, Critical Threshold Alerts, NEWS2, Ventilator Telemetry & Trend Analysis
LOCATION: Backend/src/modules/icu/icu.service.js
====================================================
*/

const prisma = require("../../core/database/prisma.client");
const { ensureDefaultHospitalId } = require("../../core/database/hospital-resolver");
const AppError = require("../../core/errors/app.error");

async function generateIcuMonitorCode() {
    const year = new Date().getFullYear();
    const count = await prisma.icuMonitoringRecord.count();
    return `ICU-${year}-${String(count + 1).padStart(6, "0")}`;
}

async function resolvePatient(patientIdentifier) {
    if (!patientIdentifier) {
        throw new AppError("Patient ID or MRN is required", 400, "MISSING_PATIENT_ID");
    }
    const patient = await prisma.patient.findFirst({
        where: {
            OR: [{ id: String(patientIdentifier) }, { patientNumber: String(patientIdentifier) }]
        }
    });
    if (!patient) {
        throw new AppError("Patient not found", 404, "PATIENT_NOT_FOUND");
    }
    return patient;
}

/**
 * Compute Adult NEWS2 score, MAP, and clinical critical threshold alerts.
 */
function evaluateIcuVitals({
    heartRateBpm,
    systolicBP,
    diastolicBP,
    oxygenSaturationPct,
    respiratoryRate,
    temperatureC,
    glasgowComaScale,
    ventilatorMode = "ROOM_AIR"
}) {
    let news2 = 0;
    const alerts = [];

    // Respiratory rate
    if (respiratoryRate !== null && respiratoryRate !== undefined) {
        if (respiratoryRate <= 8 || respiratoryRate >= 25) {
            news2 += 3;
            alerts.push({ parameter: "RESPIRATORY_RATE", severity: "CRITICAL", value: respiratoryRate, message: `Critical respiratory rate (${respiratoryRate} breaths/min)` });
        } else if (respiratoryRate >= 21) {
            news2 += 2;
            alerts.push({ parameter: "RESPIRATORY_RATE", severity: "WARNING", value: respiratoryRate, message: `Tachypnea (${respiratoryRate} breaths/min)` });
        } else if (respiratoryRate <= 11) {
            news2 += 1;
        }
    }

    // SpO2
    if (oxygenSaturationPct !== null && oxygenSaturationPct !== undefined) {
        if (oxygenSaturationPct <= 91) {
            news2 += 3;
            alerts.push({ parameter: "SPO2", severity: "CRITICAL", value: oxygenSaturationPct, message: `Severe hypoxemia (SpO2 ${oxygenSaturationPct}% <= 91%)` });
        } else if (oxygenSaturationPct <= 93) {
            news2 += 2;
            alerts.push({ parameter: "SPO2", severity: "WARNING", value: oxygenSaturationPct, message: `Low oxygen saturation (SpO2 ${oxygenSaturationPct}%)` });
        } else if (oxygenSaturationPct <= 95) {
            news2 += 1;
        }
    }

    // Supplemental oxygen / ventilator
    if (ventilatorMode && String(ventilatorMode).toUpperCase() !== "ROOM_AIR") {
        news2 += 2;
    }

    // Systolic BP & MAP
    let meanArterialPressure = null;
    if (systolicBP !== null && systolicBP !== undefined && diastolicBP !== null && diastolicBP !== undefined) {
        meanArterialPressure = Number(((systolicBP + 2 * diastolicBP) / 3).toFixed(1));
        if (meanArterialPressure < 65) {
            alerts.push({ parameter: "MAP", severity: "CRITICAL", value: meanArterialPressure, message: `Shock / Hypoperfusion risk (MAP ${meanArterialPressure} mmHg < 65)` });
        }
    }
    if (systolicBP !== null && systolicBP !== undefined) {
        if (systolicBP <= 90 || systolicBP >= 220) {
            news2 += 3;
            alerts.push({ parameter: "BLOOD_PRESSURE", severity: "CRITICAL", value: systolicBP, message: `Critical systolic blood pressure (${systolicBP} mmHg)` });
        } else if (systolicBP <= 100 || systolicBP >= 180) {
            news2 += 2;
            alerts.push({ parameter: "BLOOD_PRESSURE", severity: "WARNING", value: systolicBP, message: `Abnormal systolic blood pressure (${systolicBP} mmHg)` });
        } else if (systolicBP <= 110) {
            news2 += 1;
        }
    }

    // Heart rate
    if (heartRateBpm !== null && heartRateBpm !== undefined) {
        if (heartRateBpm <= 40 || heartRateBpm >= 131) {
            news2 += 3;
            alerts.push({ parameter: "HEART_RATE", severity: "CRITICAL", value: heartRateBpm, message: `Critical heart rate (${heartRateBpm} bpm)` });
        } else if (heartRateBpm >= 111) {
            news2 += 2;
            alerts.push({ parameter: "HEART_RATE", severity: "WARNING", value: heartRateBpm, message: `Tachycardia (${heartRateBpm} bpm)` });
        } else if (heartRateBpm <= 50 || heartRateBpm >= 91) {
            news2 += 1;
        }
    }

    // Temperature
    if (temperatureC !== null && temperatureC !== undefined) {
        if (temperatureC <= 35.0) {
            news2 += 3;
            alerts.push({ parameter: "TEMPERATURE", severity: "CRITICAL", value: temperatureC, message: `Hypothermia (${temperatureC} °C)` });
        } else if (temperatureC >= 39.1) {
            news2 += 2;
            alerts.push({ parameter: "TEMPERATURE", severity: "CRITICAL", value: temperatureC, message: `High fever / hyperpyrexia (${temperatureC} °C)` });
        } else if (temperatureC <= 36.0 || temperatureC >= 38.1) {
            news2 += 1;
        }
    }

    // Consciousness / GCS
    if (glasgowComaScale !== null && glasgowComaScale !== undefined) {
        if (glasgowComaScale <= 8) {
            news2 += 3;
            alerts.push({ parameter: "GCS", severity: "CRITICAL", value: glasgowComaScale, message: `Severe neurological compromise (GCS ${glasgowComaScale}/15 — airway protection indicated)` });
        } else if (glasgowComaScale <= 13) {
            news2 += 3;
            alerts.push({ parameter: "GCS", severity: "WARNING", value: glasgowComaScale, message: `Altered consciousness (GCS ${glasgowComaScale}/15)` });
        }
    }

    const hasCritical = news2 >= 7 || alerts.some((a) => a.severity === "CRITICAL");
    const hasWarning = news2 >= 5 || alerts.some((a) => a.severity === "WARNING");
    const alertLevel = hasCritical ? "CRITICAL" : hasWarning ? "WARNING" : "NORMAL";

    return {
        meanArterialPressure,
        news2Score: news2,
        alertLevel,
        triggeredAlerts: alerts
    };
}

async function getIcuTelemetry() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
        totalReadings,
        readings24h,
        unacknowledgedCriticalAlerts,
        ventilatedReadings,
        recentMonitors
    ] = await Promise.all([
        prisma.icuMonitoringRecord.count(),
        prisma.icuMonitoringRecord.count({ where: { recordedAt: { gte: last24h } } }),
        prisma.icuMonitoringRecord.count({ where: { alertLevel: "CRITICAL", isAcknowledged: false } }),
        prisma.icuMonitoringRecord.count({ where: { ventilatorMode: { not: "ROOM_AIR" }, recordedAt: { gte: last24h } } }),
        prisma.icuMonitoringRecord.findMany({
            orderBy: { recordedAt: "desc" },
            take: 30,
            select: { patientId: true, oxygenSaturationPct: true, news2Score: true, alertLevel: true }
        })
    ]);

    const uniquePatientsMonitored = new Set(recentMonitors.map((m) => m.patientId)).size;
    const spo2Vals = recentMonitors.map((m) => m.oxygenSaturationPct).filter((v) => typeof v === "number");
    const avgSpO2 = spo2Vals.length > 0 ? Number((spo2Vals.reduce((a, b) => a + b, 0) / spo2Vals.length).toFixed(1)) : 0;
    const avgNews2 = recentMonitors.length > 0
        ? Number((recentMonitors.reduce((a, b) => a + (b.news2Score || 0), 0) / recentMonitors.length).toFixed(1))
        : 0;

    return {
        totalReadings,
        readings24h,
        uniquePatientsMonitored,
        unacknowledgedCriticalAlerts,
        ventilatedReadings24h: ventilatedReadings,
        averageSpO2: avgSpO2,
        averageNews2Score: avgNews2
    };
}

async function listIcuMonitors({ patientId, alertLevel, unacknowledgedOnly, limit = 50 } = {}) {
    const where = {};
    if (patientId) where.patientId = patientId;
    if (alertLevel) where.alertLevel = String(alertLevel).toUpperCase();
    if (unacknowledgedOnly === true || unacknowledgedOnly === "true") {
        where.isAcknowledged = false;
    }

    const records = await prisma.icuMonitoringRecord.findMany({
        where,
        include: {
            patient: {
                select: { id: true, patientNumber: true, firstName: true, lastName: true, gender: true }
            }
        },
        orderBy: { recordedAt: "desc" },
        take: Math.min(Number(limit) || 50, 150)
    });

    return { total: records.length, records };
}

async function recordIcuVitals(payload = {}, actor) {
    const patient = await resolvePatient(payload.patientId);

    const toNum = (v) => (v !== undefined && v !== null && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null);
    const toInt = (v) => (v !== undefined && v !== null && v !== "" && !Number.isNaN(Number(v)) ? Math.round(Number(v)) : null);

    const heartRateBpm = toInt(payload.heartRateBpm ?? payload.pulseRate);
    const systolicBP = toInt(payload.systolicBP);
    const diastolicBP = toInt(payload.diastolicBP);
    const oxygenSaturationPct = toNum(payload.oxygenSaturationPct ?? payload.oxygenSaturation);
    const respiratoryRate = toInt(payload.respiratoryRate);
    const temperatureC = toNum(payload.temperatureC ?? payload.temperature);
    const glasgowComaScale = toInt(payload.glasgowComaScale ?? payload.gcs);
    const ventilatorMode = String(payload.ventilatorMode || "ROOM_AIR").toUpperCase();
    const fio2Percent = toNum(payload.fio2Percent);
    const peepCmH2O = toNum(payload.peepCmH2O);

    const evaluation = evaluateIcuVitals({
        heartRateBpm,
        systolicBP,
        diastolicBP,
        oxygenSaturationPct,
        respiratoryRate,
        temperatureC,
        glasgowComaScale,
        ventilatorMode
    });

    const hospitalId = patient.hospitalId || (await ensureDefaultHospitalId());
    const monitorCode = await generateIcuMonitorCode();
    const clinicianName = actor ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() || actor.email : "ICU Clinician";

    const created = await prisma.$transaction(async (tx) => {
        const record = await tx.icuMonitoringRecord.create({
            data: {
                monitorCode,
                hospitalId,
                patientId: patient.id,
                admissionId: payload.admissionId || null,
                wardName: payload.wardName ? String(payload.wardName).trim() : "Adult ICU",
                bedNumber: payload.bedNumber ? String(payload.bedNumber).trim() : null,
                recordedById: actor?.id || null,
                recordedByName: clinicianName,
                heartRateBpm,
                systolicBP,
                diastolicBP,
                meanArterialPressure: evaluation.meanArterialPressure,
                oxygenSaturationPct,
                respiratoryRate,
                temperatureC,
                glasgowComaScale,
                ventilatorMode,
                fio2Percent,
                peepCmH2O,
                news2Score: evaluation.news2Score,
                alertLevel: evaluation.alertLevel,
                triggeredAlerts: evaluation.triggeredAlerts,
                criticalCareInterventions: payload.criticalCareInterventions ? String(payload.criticalCareInterventions).trim() : null
            },
            include: {
                patient: {
                    select: { id: true, patientNumber: true, firstName: true, lastName: true }
                }
            }
        });

        // Mirror core vitals into longitudinal PatientVitalSign table
        await tx.patientVitalSign.create({
            data: {
                patientId: patient.id,
                temperature: temperatureC,
                pulseRate: heartRateBpm,
                respiratoryRate,
                systolicBP,
                diastolicBP,
                oxygenSaturation: oxygenSaturationPct,
                recordedBy: clinicianName
            }
        });

        if (evaluation.alertLevel === "CRITICAL") {
            await tx.systemNotification.create({
                data: {
                    eventType: "ICU_CRITICAL_VITAL_ALERT",
                    recipientRole: "DOCTOR",
                    title: `CRITICAL ICU ALERT — ${patient.firstName} ${patient.lastName} (${patient.patientNumber})`,
                    message: `NEWS2=${evaluation.news2Score} • ${evaluation.triggeredAlerts.map((a) => a.message).join("; ")}`,
                    severity: "CRITICAL",
                    affectedRecord: record.id
                }
            });
        }

        await tx.auditLog.create({
            data: {
                userId: actor?.id || null,
                role: actor?.role || null,
                hospitalId,
                action: evaluation.alertLevel === "CRITICAL" ? "ICU_CRITICAL_ALERT_TRIGGERED" : "ICU_VITALS_RECORDED",
                module: "ICU_VITALS",
                outcome: "SUCCESS",
                affectedRecord: record.id,
                description: `[${monitorCode}] ICU telemetry for ${patient.firstName} ${patient.lastName}: HR=${heartRateBpm ?? "-"} BP=${systolicBP ?? "-"}/${diastolicBP ?? "-"} SpO2=${oxygenSaturationPct ?? "-"}% NEWS2=${evaluation.news2Score} (${evaluation.alertLevel})`
            }
        });

        return record;
    });

    return created;
}

async function acknowledgeIcuAlert(id, payload = {}, actor) {
    const existing = await prisma.icuMonitoringRecord.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("ICU monitoring record not found", 404, "ICU_RECORD_NOT_FOUND");
    }

    const clinicianName = actor ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() || actor.email : "ICU Clinician";
    const interventionAppend = payload.interventionNote
        ? `${existing.criticalCareInterventions ? existing.criticalCareInterventions + " | " : ""}[Ack by ${clinicianName}]: ${String(payload.interventionNote).trim()}`
        : existing.criticalCareInterventions;

    const updated = await prisma.icuMonitoringRecord.update({
        where: { id },
        data: {
            isAcknowledged: true,
            acknowledgedBy: clinicianName,
            acknowledgedAt: new Date(),
            criticalCareInterventions: interventionAppend
        }
    });

    await prisma.auditLog.create({
        data: {
            userId: actor?.id || null,
            role: actor?.role || null,
            hospitalId: existing.hospitalId,
            action: "ICU_ALERT_ACKNOWLEDGED",
            module: "ICU_VITALS",
            outcome: "SUCCESS",
            affectedRecord: updated.id,
            description: `${clinicianName} acknowledged ${existing.alertLevel} ICU alert (${existing.monitorCode})`
        }
    });

    return updated;
}

async function getPatientVitalTrends(patientIdentifier) {
    const patient = await resolvePatient(patientIdentifier);
    const series = await prisma.icuMonitoringRecord.findMany({
        where: { patientId: patient.id },
        orderBy: { recordedAt: "asc" },
        take: 40
    });

    return {
        patient: {
            id: patient.id,
            mrn: patient.patientNumber,
            fullName: `${patient.firstName} ${patient.lastName}`
        },
        totalPoints: series.length,
        latestAlertLevel: series.length > 0 ? series[series.length - 1].alertLevel : "NORMAL",
        trends: series.map((s) => ({
            id: s.id,
            monitorCode: s.monitorCode,
            recordedAt: s.recordedAt,
            heartRateBpm: s.heartRateBpm,
            systolicBP: s.systolicBP,
            diastolicBP: s.diastolicBP,
            meanArterialPressure: s.meanArterialPressure,
            oxygenSaturationPct: s.oxygenSaturationPct,
            respiratoryRate: s.respiratoryRate,
            temperatureC: s.temperatureC,
            glasgowComaScale: s.glasgowComaScale,
            news2Score: s.news2Score,
            alertLevel: s.alertLevel,
            ventilatorMode: s.ventilatorMode
        }))
    };
}

module.exports = {
    evaluateIcuVitals,
    getIcuTelemetry,
    listIcuMonitors,
    recordIcuVitals,
    acknowledgeIcuAlert,
    getPatientVitalTrends
};
