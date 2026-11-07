"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

PUBLIC ROUTES

Production Hardened
CommonJS Only

LOCATION:
src/routes/public.routes.js

====================================================
*/


const express =
require("express");


const router =
express.Router();



const logger =
require("../utils/logger");



try {


const authRoutes =
require("../modules/auth/auth.routes");


router.use(
"/auth",
authRoutes
);



logger.info({

message:
"Public authentication routes loaded"

});


}
catch(error){


logger.warn({

message:
"Authentication routes unavailable",

error:{
message:
error.message
}

});


}

module.exports =
router;