"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

ADMIN ROUTES

ADMINISTRATOR AREA

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


const roleMiddleware =
require("../core/security/roles");



const logger =
require("../utils/logger");





router.use(
authMiddleware
);





/*
====================================================
ADMIN SECURITY

ADMINISTRATOR ONLY

====================================================
*/


router.use(

roleMiddleware(
"ADMINISTRATOR"
)

);







/*
====================================================
FUTURE ADMIN ROUTES


Examples:

router.use(
"/users",
require("../modules/users/admin.routes")
);


router.use(
"/settings",
require("../modules/settings/admin.routes")
);


====================================================
*/

logger.info({

message:
"Admin routes initialized"

});

module.exports =
router;