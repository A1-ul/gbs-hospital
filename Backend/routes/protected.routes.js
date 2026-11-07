"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

PROTECTED ROUTES

JWT REQUIRED

Production Hardened
CommonJS Only

====================================================
*/


const express =
require("express");


const router =
express.Router();



const authMiddleware =
require("../core/middleware/auth.middleware");


const logger =
require("../core/utils/logger");





router.use(
authMiddleware
);





/*
====================================================
FUTURE PROTECTED MODULES

Example:

router.use(
"/patients",
require("../modules/patient/patient.routes")
);

====================================================
*/





logger.info({

message:
"Protected routes initialized"

});





module.exports =
router;