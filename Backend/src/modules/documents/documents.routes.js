"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./documents.controller");
const authMiddleware = require("../../core/middleware/auth.middleware");
const authorizeRoles = require("../../core/security/role.middleware");
const { STAFF_ROLES } = require("../../config/roles");

router.use(authMiddleware);
router.use(authorizeRoles(...STAFF_ROLES));

router.get("/telemetry", controller.getTelemetry);
router.get("/", controller.list);
router.post("/", controller.create);
router.post("/:id/new-version", controller.newVersion);
router.post("/:id/deliver", controller.deliver);
router.patch("/:id/archive", controller.archive);
router.post("/:id/restore", controller.restore);

module.exports = router;
