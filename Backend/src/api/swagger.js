"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

SWAGGER API DOCUMENTATION SETUP

Production Ready
CommonJS Only

LOCATION:
src/api/swagger.js

====================================================
*/


const swaggerUi =
    require("swagger-ui-express");


const openapiConfig =
    require("./openapi/openapi.config");





function setupSwagger(app){


    if(!app){

        throw new Error(
            "Swagger setup requires Express application"
        );

    }





    app.use(

        "/api/docs",

        swaggerUi.serve,

        swaggerUi.setup(
            openapiConfig,
            {

                explorer:true,

                customSiteTitle:
                    "GBS Hospital API Documentation"

            }

        )

    );


}





module.exports =
    setupSwagger;