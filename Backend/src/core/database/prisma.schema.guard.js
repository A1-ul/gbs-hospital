"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

PRISMA SCHEMA SAFETY GUARD

Production Hardened
CommonJS Only

LOCATION:
src/core/database/prisma.schema.guard.js

====================================================
*/


const fs =
require("fs");


const path =
require("path");


const logger =
require("../utils/logger");





function getSchemaPath(){


    return path.resolve(

        process.cwd(),

        "prisma",

        "schema.prisma"

    );

}









function readSchema(){


    const schemaPath =
    getSchemaPath();



    if(
        !fs.existsSync(schemaPath)
    ){

        throw new Error(
            "Prisma schema.prisma file missing"
        );

    }



    const schema =
    fs.readFileSync(

        schemaPath,

        "utf8"

    );



    if(
        !schema ||
        schema.trim().length === 0
    ){

        throw new Error(
            "Prisma schema is empty"
        );

    }



    return schema;

}









function validatePrismaSchema(){


    const schema =
    readSchema();





    if(
        !schema.includes("datasource")
    ){

        throw new Error(
            "Prisma datasource configuration missing"
        );

    }





    if(
        !schema.includes("provider")
    ){

        throw new Error(
            "Prisma datasource provider missing"
        );

    }







    if(
        !schema.includes("generator")
    ){

        throw new Error(
            "Prisma generator configuration missing"
        );

    }







    if(
        !schema.includes("postgresql")
    ){

        throw new Error(
            "Unsupported database provider. PostgreSQL required"
        );

    }







    const result =
    Object.freeze({

        valid:true,

        schema:
        getSchemaPath(),

        timestamp:
        new Date().toISOString()

    });







    logger.info({

        message:
        "Prisma schema validation passed",

        schema:
        result.schema

    });






    return result;


}






module.exports =
validatePrismaSchema;