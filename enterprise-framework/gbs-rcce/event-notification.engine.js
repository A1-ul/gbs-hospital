"use strict";

/*
================================================================================
GBS CENTRAL SYSTEM RESPONSE, CONTROL & COMMUNICATION ENGINE (GBS-RCCE)
MODULE: Event & Notification Engine
LOCATION: enterprise-framework/gbs-rcce/event-notification.engine.js
================================================================================
Dual-channel event bus & notification router:
1. Synchronous in-process EventEmitter hooks + Real-time SSE broadcast
2. Persistent PostgreSQL domain event & notification records + async queue
================================================================================
*/

const { EventEmitter } = require("events");

const CANONICAL_EVENTS = Object.freeze({
    USER_REGISTERED: "USER_REGISTERED",
    USER_APPROVED: "USER_APPROVED",
    USER_SUSPENDED: "USER_SUSPENDED",
    PATIENT_ADMITTED: "PATIENT_ADMITTED",
    PATIENT_REGISTERED: "PATIENT_REGISTERED",
    PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
    PAYMENT_REJECTED: "PAYMENT_REJECTED",
    RECORD_UPDATED: "RECORD_UPDATED",
    REQUEST_SUBMITTED: "REQUEST_SUBMITTED",
    REQUEST_APPROVED: "REQUEST_APPROVED",
    REQUEST_REJECTED: "REQUEST_REJECTED",
    REPORT_GENERATED: "REPORT_GENERATED",
    ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
    SUBSCRIPTION_EXPIRED: "SUBSCRIPTION_EXPIRED",
    SYSTEM_LOCKED: "SYSTEM_LOCKED",
    SYSTEM_UNLOCKED: "SYSTEM_UNLOCKED",
    SYSTEM_ERROR_DETECTED: "SYSTEM_ERROR_DETECTED",
    DEVELOPER_SENSITIVE_ACCESS: "DEVELOPER_SENSITIVE_ACCESS",
    ACCESS_GRANT_REQUESTED: "ACCESS_GRANT_REQUESTED",
    ACCESS_GRANT_APPROVED: "ACCESS_GRANT_APPROVED",
    ACCESS_GRANT_REVOKED: "ACCESS_GRANT_REVOKED",
    MAINTENANCE_MODE_CHANGED: "MAINTENANCE_MODE_CHANGED",
    OPERATION_DENIED: "OPERATION_DENIED",
    CALL_INITIATED: "CALL_INITIATED",
    CALL_ACCEPTED: "CALL_ACCEPTED",
    CALL_DECLINED: "CALL_DECLINED",
    CALL_ENDED: "CALL_ENDED",
    CONFERENCE_JOINED: "CONFERENCE_JOINED"
});

function createEventNotificationEngine({ storageAdapter, logger }) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(50);

    const sseClients = new Set();
    const backgroundQueue = [];
    let isDraining = false;

    function subscribeRealtime(client) {
        sseClients.add(client);
        return () => sseClients.delete(client);
    }

    function emitUserEvent(targetUserIds, eventName, data) {
        if (!eventName || sseClients.size === 0) return 0;
        const idSet = new Set(
            (Array.isArray(targetUserIds) ? targetUserIds : [targetUserIds])
                .filter(Boolean)
                .map((id) => String(id))
        );
        if (idSet.size === 0) return 0;

        const serialized = JSON.stringify(data || {});
        let delivered = 0;

        for (const client of sseClients) {
            if (!client || !client.userId || !idSet.has(String(client.userId))) {
                continue;
            }
            try {
                client.res.write(`event: ${eventName}\ndata: ${serialized}\n\n`);
                delivered += 1;
            } catch (_err) {
                sseClients.delete(client);
            }
        }
        return delivered;
    }

    function getOnlineUserIds() {
        const ids = new Set();
        for (const client of sseClients) {
            if (client && client.userId) {
                ids.add(String(client.userId));
            }
        }
        return Array.from(ids);
    }

    function dispatchToSseClients(notification) {
        if (!notification || sseClients.size === 0) return;

        const payload = JSON.stringify({
            type: "NOTIFICATION",
            notification
        });

        for (const client of sseClients) {
            try {
                const roleMatch =
                    !notification.recipientRole ||
                    notification.recipientRole === client.role ||
                    notification.recipientRole === "ALL" ||
                    (client.role === "ADMIN" && notification.recipientRole === "SYSTEM_ADMIN");
                const userMatch =
                    !notification.recipientUserId ||
                    notification.recipientUserId === client.userId;

                if (roleMatch && userMatch) {
                    client.res.write(`event: notification\ndata: ${payload}\n\n`);
                }
            } catch (_err) {
                sseClients.delete(client);
            }
        }
    }

    async function enqueueBackground(taskFn) {
        backgroundQueue.push(taskFn);
        if (isDraining) return;
        isDraining = true;
        setImmediate(async () => {
            try {
                while (backgroundQueue.length > 0) {
                    const job = backgroundQueue.shift();
                    try {
                        await job();
                    } catch (jobErr) {
                        if (logger) {
                            logger.warn(`[GBS-RCCE NotificationQueue] Async notification job failed: ${jobErr.message}`);
                        }
                    }
                }
            } finally {
                isDraining = false;
            }
        });
    }

    async function publish(eventInput = {}) {
        const {
            eventCode = "RECORD_UPDATED",
            domain = "SYSTEM",
            actorUserId = null,
            actorRole = null,
            tenantId = null,
            affectedRecord = null,
            severity = "INFO",
            payload = {},
            requestId = null,
            notifications = [],
            asyncDelivery = false
        } = eventInput;

        let savedEvent = {
            id: `evt_${Date.now()}`,
            eventCode,
            domain,
            actorUserId,
            actorRole,
            tenantId,
            affectedRecord,
            severity,
            status: asyncDelivery ? "PENDING" : "PROCESSED",
            payload,
            requestId,
            createdAt: new Date().toISOString()
        };

        if (storageAdapter && typeof storageAdapter.writeEvent === "function") {
            try {
                savedEvent = await storageAdapter.writeEvent({
                    eventCode,
                    domain,
                    actorUserId,
                    actorRole,
                    tenantId,
                    affectedRecord,
                    severity,
                    status: asyncDelivery ? "PENDING" : "PROCESSED",
                    payload,
                    requestId,
                    processedAt: asyncDelivery ? null : new Date()
                });
            } catch (err) {
                if (logger) {
                    logger.warn(`[GBS-RCCE EventEngine] Event persist failed: ${err.message}`);
                }
            }
        }

        const deliverNotifications = async () => {
            const persistedNotifications = [];
            for (const note of notifications) {
                const record = {
                    eventId: savedEvent.id || null,
                    eventType: eventCode,
                    recipientUserId: note.recipientUserId || null,
                    recipientRole: note.recipientRole || null,
                    tenantId: note.tenantId || tenantId || null,
                    title: note.title || eventCode,
                    message: note.message || "System activity notification.",
                    severity: note.severity || severity || "INFO",
                    channel: note.channel || (asyncDelivery ? "BACKGROUND_QUEUE" : "REALTIME"),
                    deliveryStatus: "DELIVERED",
                    actionUrl: note.actionUrl || null,
                    affectedRecord: note.affectedRecord || affectedRecord || null,
                    requestId: requestId || null,
                    metadata: note.metadata || payload || {}
                };

                let createdNote = { ...record, createdAt: new Date().toISOString() };
                if (storageAdapter && typeof storageAdapter.writeNotification === "function") {
                    try {
                        createdNote = await storageAdapter.writeNotification(record);
                    } catch (err) {
                        if (logger) {
                            logger.warn(`[GBS-RCCE NotificationEngine] Persist notification failed: ${err.message}`);
                        }
                    }
                }
                persistedNotifications.push(createdNote);
                dispatchToSseClients(createdNote);
            }

            if (asyncDelivery && storageAdapter && typeof storageAdapter.markEventProcessed === "function" && savedEvent.id) {
                try {
                    await storageAdapter.markEventProcessed(savedEvent.id);
                } catch (_err) {
                    // best effort status update
                }
            }
            return persistedNotifications;
        };

        let createdNotifications = [];
        if (asyncDelivery) {
            await enqueueBackground(deliverNotifications);
        } else {
            createdNotifications = await deliverNotifications();
        }

        emitter.emit(eventCode, { event: savedEvent, notifications: createdNotifications });
        emitter.emit("*", { event: savedEvent, notifications: createdNotifications });

        return {
            event: savedEvent,
            notifications: createdNotifications
        };
    }

    return Object.freeze({
        CANONICAL_EVENTS,
        on: emitter.on.bind(emitter),
        off: emitter.off.bind(emitter),
        subscribeRealtime,
        emitUserEvent,
        getOnlineUserIds,
        publish,
        getQueueDepth: () => backgroundQueue.length,
        getSubscriberCount: () => sseClients.size
    });
}

module.exports = { createEventNotificationEngine, CANONICAL_EVENTS };
