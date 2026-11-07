"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

API VERSION ROUTER

Production Hardened
CommonJS Only

LOCATION:
src/routes/api.routes.js

====================================================
*/


const express =
require("express");


const router =
express.Router();


const logger =
require("../core/utils/logger");





function safeMount(
path,
route,
name
){


try{


if(!route){

throw new Error(
`${name} route missing`
);

}


router.use(
path,
route
);



logger.info({

message:
`${name} mounted`,

path

});



}

catch(error){


logger.error({

message:
`${name} mount failed`,

error:
error.message


});


throw error;


}


}







/*
====================================================
PUBLIC ROUTES
====================================================
*/


safeMount(

"/",

require("./index"),

"API registry"

);

module.exports =
router;