"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

DATABASE HEALTH MONITOR

Production Hardened
CommonJS Only

LOCATION:
src/core/database/database.health.js

====================================================
*/


const prisma =
    require("./prisma.client");


const logger =
    require("../utils/logger");





const HEALTH_TIMEOUT =
    5000;







function timeout(ms){


    return new Promise(

        (_, reject)=>{


            setTimeout(()=>{


                reject(

                    new Error(
                        "Database health timeout"
                    )

                );


            }, ms);


        }

    );


}









async function checkDatabaseHealth(){


    const start =
        Date.now();



    try{


        await Promise.race([


            prisma.$queryRaw`
                SELECT 1
            `,


            timeout(
                HEALTH_TIMEOUT
            )


        ]);





        return Object.freeze({


            status:
                "healthy",


            database:
                "postgresql",


            responseTime:
                `${Date.now() - start}ms`,


            timestamp:
                new Date().toISOString()


        });



    }


    catch(error){



        logger.error({


            message:
                "Database health check failed",


            error:{
                message:
                    error.message
            }


        });






        return Object.freeze({


            status:
                "unhealthy",


            database:
                "postgresql",


            responseTime:
                `${Date.now() - start}ms`,


            timestamp:
                new Date().toISOString()


        });



    }



}









async function databaseReady(){


    try{


        await Promise.race([


            prisma.$queryRaw`
                SELECT 1
            `,


            timeout(
                HEALTH_TIMEOUT
            )


        ]);



        return true;


    }


    catch(error){



        logger.error({


            message:
                "Database readiness failed",


            error:{
                message:
                    error.message
            }


        });



        return false;


    }



}

module.exports = {


    checkDatabaseHealth,


    databaseReady


};