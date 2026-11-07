"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

DATABASE APPLICATION MONITOR

PRODUCTION HARDENED

COMMONJS ONLY

LOCATION:
src/core/monitoring/database.monitor.js

====================================================
*/


const logger =
    require("../utils/logger");






const MONITOR_KEY =
    "__GBS_DATABASE_APPLICATION_MONITOR__";







if(
    !global[MONITOR_KEY]
){

    global[MONITOR_KEY] = {


        totalOperations:
            0,


        successfulOperations:
            0,


        failedOperations:
            0,


        slowOperations:
            0,


        totalDuration:
            0,


        averageDuration:
            0,


        lastFailure:
            null,


        lastOperation:
            null



    };


}






const metrics =
    global[MONITOR_KEY];








function number(value){


    const result =
        Number(value);



    return Number.isFinite(result)

        ? result

        :

        0;


}









/*
====================================================
RECORD DATABASE OPERATION

Used by services/repositories

====================================================

Example:

recordDatabaseOperation({
 operation:"patient.findMany",
 duration:120,
 success:true
})

====================================================
*/


function recordDatabaseOperation({

    operation = "UNKNOWN_OPERATION",

    duration = 0,

    success = true,

    error = null

} = {}){


    try{



        const time =
            number(duration);




        metrics.totalOperations++;




        metrics.totalDuration +=
            time;





        metrics.averageDuration =

            Number(

                (

                    metrics.totalDuration /

                    metrics.totalOperations

                ).toFixed(2)

            );






        if(success){


            metrics.successfulOperations++;


        }

        else{


            metrics.failedOperations++;


            metrics.lastFailure =
                new Date();


        }








        const slowLimit =

            number(

                process.env.DB_SLOW_OPERATION_LIMIT

            )

            ||

            500;







        if(
            time >= slowLimit
        ){


            metrics.slowOperations++;




            logger.warn({


                message:
                    "Slow database operation detected",


                operation,


                duration:
                    `${time}ms`,


                threshold:
                    `${slowLimit}ms`



            });


        }






        metrics.lastOperation = {


            operation,


            duration:
                time,


            success,


            timestamp:
                new Date()



        };






    }

    catch(monitorError){



        logger.error({


            message:
                "Database monitoring failure",


            error:{
                message:
                    monitorError.message
            }



        });


    }



}









/*
====================================================
WRAPPER FOR DATABASE ACTIONS

Usage:

await monitorDatabase(
 "patient.create",
 async()=>{

    return prisma.patient.create(...)

 }
)

====================================================
*/


async function monitorDatabase(

    operation,

    callback

){



    if(
        typeof callback !== "function"
    ){


        throw new Error(

            "Database monitor callback must be a function"

        );


    }

    const start =
        Date.now();




    try{



        const result =
            await callback();





        recordDatabaseOperation({


            operation,


            duration:
                Date.now() - start,


            success:
                true



        });





        return result;



    }

    catch(error){



        recordDatabaseOperation({


            operation,


            duration:
                Date.now() - start,


            success:
                false,


            error



        });





        throw error;



    }


}

/*
====================================================
GET DATABASE MONITOR STATUS
====================================================
*/


function getDatabaseMetrics(){



    return Object.freeze({


        totalOperations:
            metrics.totalOperations,


        successfulOperations:
            metrics.successfulOperations,


        failedOperations:
            metrics.failedOperations,


        slowOperations:
            metrics.slowOperations,


        averageDuration:
            metrics.averageDuration,


        lastFailure:
            metrics.lastFailure,


        lastOperation:
            metrics.lastOperation



    });


}

/*
====================================================
RESET METRICS

Used for tests/admin maintenance

====================================================
*/


function resetDatabaseMetrics(){



    metrics.totalOperations = 0;

    metrics.successfulOperations = 0;

    metrics.failedOperations = 0;

    metrics.slowOperations = 0;

    metrics.totalDuration = 0;

    metrics.averageDuration = 0;

    metrics.lastFailure = null;

    metrics.lastOperation = null;




    logger.info({

        message:
            "Database application metrics reset"

    });



}

module.exports = {


    recordDatabaseOperation,


    monitorDatabase,


    getDatabaseMetrics,


    resetDatabaseMetrics



};