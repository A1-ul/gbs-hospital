"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

DATABASE MONITOR SERVICE

Production Hardened
CommonJS Only

LOCATION:
src/core/database/database.monitor.js

====================================================
*/


const logger =
    require("../utils/logger");


const prisma =
    require("./prisma.client");



const MONITOR_KEY =
    "__GBS_DATABASE_MONITOR__";




if(!global[MONITOR_KEY]){


    global[MONITOR_KEY] = {


        status:
            "starting",


        checks:
            0,


        failures:
            0,


        lastCheck:
            null,


        lastError:
            null


    };


}




const metrics =
    global[MONITOR_KEY];







async function monitorDatabase(){


    metrics.checks++;


    try{


        await prisma.$queryRaw`
            SELECT 1
        `;



        metrics.status =
            "healthy";


        metrics.lastCheck =
            new Date();



        logger.debug({


            message:
                "Database monitor check passed"


        });



        return Object.freeze({


            status:
                "healthy",


            database:
                "PostgreSQL",


            timestamp:
                metrics.lastCheck



        });



    }


    catch(error){



        metrics.status =
            "unhealthy";


        metrics.failures++;


        metrics.lastError =
            error.message;



        metrics.lastCheck =
            new Date();




        logger.error({


            message:
                "Database monitor check failed",


            error:
                error.message


        });




        return Object.freeze({


            status:
                "unhealthy",


            database:
                "PostgreSQL",


            timestamp:
                metrics.lastCheck



        });



    }


}









function getDatabaseMonitorStatus(){


    return Object.freeze({

        ...metrics

    });


}






module.exports = {


    monitorDatabase,


    getDatabaseMonitorStatus


};