"use strict";

/*
================================================================================
GBS HOSPITAL MANAGEMENT SYSTEM
OUTBOUND SMTP EMAIL ADAPTER (TRUTHFUL NO-MOCK PRODUCTION ADAPTER)
CommonJS Only
LOCATION: Backend/src/core/integration/email.adapter.js
================================================================================
Reports truthful SMTP configuration status. Never fakes email delivery when
SMTP_HOST/SMTP_USER/SMTP_PASS are absent.
*/

const net = require("net");

function getEmailAdapterStatus() {
    const host = String(process.env.SMTP_HOST || "").trim();
    const port = Number(process.env.SMTP_PORT || 587);
    const user = String(process.env.SMTP_USER || "").trim();
    const pass = String(process.env.SMTP_PASS || "").trim();
    const from = String(process.env.SMTP_FROM || user || "").trim();
    const configured = Boolean(host && user && pass);

    return {
        key: "SMTP_EMAIL",
        name: "Outbound SMTP Email Gateway",
        configured,
        status: configured ? "CONFIGURED" : "NOT_CONFIGURED",
        host: configured ? host : null,
        port: configured ? port : null,
        from: configured ? from : null,
        detail: configured
            ? `Configured SMTP host: ${host}:${port}`
            : "SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) not configured; password recovery and alerts record truthfully in PostgreSQL."
    };
}

async function verifySmtpReachability(timeoutMs = 3000) {
    const status = getEmailAdapterStatus();
    if (!status.configured) {
        return {
            reachable: false,
            status: "NOT_CONFIGURED",
            detail: status.detail
        };
    }

    return new Promise((resolve) => {
        const socket = net.createConnection({ host: status.host, port: status.port, timeout: timeoutMs });
        socket.on("connect", () => {
            socket.destroy();
            resolve({ reachable: true, status: "REACHABLE", host: status.host, port: status.port });
        });
        socket.on("timeout", () => {
            socket.destroy();
            resolve({ reachable: false, status: "TIMEOUT", host: status.host, port: status.port });
        });
        socket.on("error", (err) => {
            socket.destroy();
            resolve({ reachable: false, status: "CONNECTION_ERROR", detail: err.message });
        });
    });
}

async function sendEmail({ to, subject, text, html }) {
    const status = getEmailAdapterStatus();
    if (!status.configured) {
        return {
            delivered: false,
            status: "NOT_CONFIGURED",
            recipient: to || null,
            subject: subject || null,
            reason: status.detail
        };
    }

    try {
        const nodemailer = require("nodemailer");
        const transporter = nodemailer.createTransport({
            host: status.host,
            port: status.port,
            secure: status.port === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        const info = await transporter.sendMail({
            from: status.from,
            to,
            subject,
            text,
            html
        });
        return {
            delivered: true,
            status: "SENT",
            messageId: info.messageId,
            recipient: to
        };
    } catch (err) {
        return {
            delivered: false,
            status: "DISPATCH_ERROR",
            recipient: to || null,
            reason: err.message
        };
    }
}

module.exports = {
    getEmailAdapterStatus,
    verifySmtpReachability,
    sendEmail
};
