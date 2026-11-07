"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

ROUTE LOADER

Production Hardened
CommonJS Only

====================================================
*/


const logger =
require("../core/utils/logger");



function loadRoutes(app){


try{


const apiRoutes =
require("./api.routes");



app.use(

"/api/v1",

apiRoutes

);



logger.info({

message:
"API routes loaded",

base:
"/api/v1"

});


}


catch(error){


logger.error({

message:
"Route loading failed",

error:
error.message

});

throw error;

}

}

module.exports =
loadRoutes;