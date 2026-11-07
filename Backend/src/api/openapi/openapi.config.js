"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

OPENAPI CONFIGURATION

Production Ready
CommonJS Only

LOCATION:
src/api/openapi/openapi.config.js

====================================================
*/


module.exports = {


    openapi:
        "3.0.3",


    info:{


        title:
            "GBS Hospital Management API",


        version:
            "v1.0.0",


        description:
            "Enterprise Hospital Management System API"



    },


    servers:[


        {
            url:
                "/api/v1",

            description:
                "Application API Server"

        }


    ],



    components:{


        securitySchemes:{


            bearerAuth:{


                type:
                    "http",


                scheme:
                    "bearer",


                bearerFormat:
                    "JWT"


            }


        }


    }



};