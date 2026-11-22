"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./meetings.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { STAFF_ROLES } = require("../../config/roles");

router.use(authMiddleware);
router.use(authorizeRoles(...STAFF_ROLES));

router.get("/telemetry", controller.getTelemetry);
router.get("/", controller.list);
router.post("/", controller.create);
router.post("/:id/join", controller.join);
router.post("/:id/end", controller.end);
router.patch("/:id/cancel", controller.cancel);

module.exports = router;
