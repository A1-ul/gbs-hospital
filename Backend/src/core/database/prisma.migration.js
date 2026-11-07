"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

PRISMA MIGRATION CONTROL

Production Hardened
CommonJS Only

LOCATION:
src/core/database/prisma.migration.js

====================================================
*/


const logger =
    require("../utils/logger");


const environmentGuard =
    require("./prisma.environment.guard");


const schemaGuard =
    require("./prisma.schema.guard");



const AppError =
    require("../errors/app.error");







async function validateMigrationSafety(){


    try{



        if(
            typeof environmentGuard !== "function"
        ){

            throw new Error(
                "Database environment guard unavailable"
            );

        }



        if(
            typeof schemaGuard !== "function"
        ){

            throw new Error(
                "Prisma schema guard unavailable"
            );

        }






        environmentGuard();



        schemaGuard();






        logger.info({


            message:
                "Prisma migration safety checks passed"


        });





        return true;



    }


    catch(error){





        logger.error({



            message:
                "Prisma migration safety failed",



            error:{


                message:
                    error.message,


                stack:
                    error.stack



            }



        });







        throw new AppError(


            "Database migration safety validation failed",


            500,


            "MIGRATION_SAFETY_ERROR"


        );



    }


}







module.exports =
{

    validateMigrationSafety

};