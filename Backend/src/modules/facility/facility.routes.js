"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./facility.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { STAFF_ROLES } = require("../../config/roles");

router.use(authMiddleware);
router.use(authorizeRoles(...STAFF_ROLES));

router.get("/telemetry", controller.getTelemetry);
router.get("/tasks", controller.listTasks);
router.post("/tasks", controller.createTask);
router.patch("/tasks/:id/status", controller.updateStatus);

module.exports = router;
