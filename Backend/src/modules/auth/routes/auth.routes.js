"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../controllers/auth.controller");
const authMiddleware = require("../../../core/middleware/auth.middleware");

router.post("/signup", controller.signup);
router.post("/login", controller.login);
router.get("/me", authMiddleware, controller.me);

module.exports = router;