"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ENTERPRISE COUNTDOWN ENGINE
Backend-Controlled Precise Real-Time Countdown
Calculates Days, Hours, Minutes, Seconds & Warnings
LOCATION: src/modules/tenant-management/helpers/countdown.engine.js
====================================================
*/

/**
 * Calculates countdown telemetry from subscription dates
 */
function calculateCountdown(subscription, isSystemLocked = false) {
    if (!subscription) {
        return {
            hasSubscription: false,
            status: "NO_SUBSCRIPTION",
            warningTier: "CRITICAL",
            totalSeconds: 0,
            remainingDays: 0,
            remainingHours: 0,
            remainingMinutes: 0,
            remainingSeconds: 0,
            formattedCountdown: "0 Days 00 Hours 00 Minutes 00 Seconds",
            isExpired: true,
            isLocked: true
        };
    }

    const now = new Date().getTime();
    const expiryTarget = subscription.subscriptionEndDate
        ? new Date(subscription.subscriptionEndDate).getTime()
        : new Date(subscription.trialEndDate).getTime();

    const diffMs = expiryTarget - now;
    const isExpired = diffMs <= 0;

    let totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const remainingDays = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;
    const remainingHours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const remainingMinutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    // Determine warning tiers based on remaining days
    let warningTier = "NORMAL";
    let warningMessage = "Subscription active and operational";

    if (isExpired) {
        // Check if within grace period
        const graceEnd = subscription.gracePeriodEndDate
            ? new Date(subscription.gracePeriodEndDate).getTime()
            : expiryTarget + (7 * 86400 * 1000); // Default 7-day grace period

        if (now < graceEnd) {
            warningTier = "GRACE_PERIOD";
            warningMessage = "Trial/Subscription expired. Account currently in grace period.";
        } else {
            warningTier = "EXPIRED_LOCKED";
            warningMessage = "Subscription expired. System access is restricted.";
        }
    } else if (remainingDays <= 1) {
        warningTier = "FINAL_1_DAY";
        warningMessage = "Final Warning: Subscription expires in less than 24 hours.";
    } else if (remainingDays <= 3) {
        warningTier = "ESCALATED_3_DAYS";
        warningMessage = "Escalated Warning: 3 days remaining before service suspension.";
    } else if (remainingDays <= 7) {
        warningTier = "CRITICAL_7_DAYS";
        warningMessage = "Critical Warning: 7 days remaining on subscription.";
    } else if (remainingDays <= 14) {
        warningTier = "WARNING_14_DAYS";
        warningMessage = "Warning: 14 days remaining on subscription.";
    }

    const pad = (n) => String(n).padStart(2, "0");
    const formattedCountdown = `${remainingDays} Days ${pad(remainingHours)} Hours ${pad(remainingMinutes)} Minutes ${pad(remainingSeconds)} Seconds`;

    return {
        hasSubscription: true,
        subscriptionId: subscription.subscriptionId,
        plan: subscription.plan,
        trialStartDate: subscription.trialStartDate,
        trialEndDate: subscription.trialEndDate,
        subscriptionEndDate: subscription.subscriptionEndDate,
        gracePeriodEndDate: subscription.gracePeriodEndDate,
        remainingDays,
        remainingHours,
        remainingMinutes,
        remainingSeconds,
        totalSeconds: Math.max(0, Math.floor(diffMs / 1000)),
        formattedCountdown,
        warningTier,
        warningMessage,
        isExpired,
        isLocked: isSystemLocked || (isExpired && warningTier === "EXPIRED_LOCKED")
    };
}

module.exports = {
    calculateCountdown
};
