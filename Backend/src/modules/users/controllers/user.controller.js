"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
USER CONTROLLER - ENTERPRISE PRODUCTION HARDENED
CommonJS Only
LOCATION: src/modules/users/controllers/user.controller.js
====================================================
*/

const service = require("../services/user.service");

/**
 * Returns actual registered user counts per role directly from the DB.
 * Triggered on demand when administrator clicks dropdown.
 */
async function getRoleUserCounts(req, res, next) {
    try {
        const result = await service.getRoleUserCounts();

        return res.status(200).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Returns database-backed list of users for administrator cross-check.
 */
async function getUsers(req, res, next) {
    try {
        const { role, active, search, limit, offset } = req.query;

        const result = await service.getUsers({
            role,
            active,
            search,
            limit,
            offset
        });

        return res.status(200).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Approve a pending user account.
 */
async function approveUser(req, res, next) {
    try {
        const { id } = req.params;
        const adminUserId = req.user.id;

        const result = await service.approveUser(id, adminUserId);

        return res.status(200).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update user active/inactive status.
 */
async function setUserStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { active } = req.body;
        const adminUserId = req.user.id;

        const result = await service.setUserStatus(id, active, adminUserId);

        return res.status(200).json({
            success: true,
            data: result,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getRoleUserCounts,
    getUsers,
    approveUser,
    setUserStatus
};
