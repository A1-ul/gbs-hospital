"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

PERFORMANCE MONITOR

PRODUCTION HARDENED

COMMONJS ONLY

LOCATION:
src/core/monitoring/performance.monitor.js

====================================================
*/


const logger =
    require("../utils/logger");


const metrics =
    require("./metrics.service");








const MONITOR_KEY =
    "__GBS_PERFORMANCE_MONITOR__";








if(
    !global[MONITOR_KEY]
){

    global[MONITOR_KEY] = {


        operations:
            {},


        slowOperations:
            0,


        totalOperations:
            0



    };


}


const performance =
    global[MONITOR_KEY];

const DEFAULT_SLOW_LIMIT =

    Number(

        process.env.SLOW_OPERATION_LIMIT

    )

    ||

    1000;

function normalizeName(name){


    if(
        typeof name !== "string" ||
        !name.trim()
    ){

        return "unknown_operation";

    }


    return name

        .trim()

        .toLowerCase()

        .replace(
            /[^a-z0-9_.-]/g,
            "_"
        );


}

function recordPerformance({

    operation,

    duration,

    success = true

} = {}){


    try{



        const name =
            normalizeName(operation);



        const time =
            Number(duration) || 0;





        performance.totalOperations++;






        if(
            !performance.operations[name]
        ){

            performance.operations[name] = {


                count:
                    0,


                failures:
                    0,


                totalDuration:
                    0,


                averageDuration:
                    0



            };


        }







        const item =
            performance.operations[name];





        item.count++;


        item.totalDuration += time;


        item.averageDuration =

            Number(

                (

                    item.totalDuration /

                    item.count

                ).toFixed(2)

            );







        if(
            !success
        ){

            item.failures++;

        }







        const slowLimit =

            Number(

                process.env.SLOW_OPERATION_LIMIT

            )

            ||

            DEFAULT_SLOW_LIMIT;







        if(
            time >= slowLimit
        ){


            performance.slowOperations++;




            logger.warn({


                message:
                    "Slow performance detected",


                operation:
                    name,


                duration:
                    `${time}ms`,


                threshold:
                    `${slowLimit}ms`



            });



        }






        metrics.increment(
            "performance.operations"
        );



        metrics.observe(

            "performance.duration",

            time

        );




    }

    catch(error){



        logger.error({


            message:
                "Performance monitor failed",


            error:{
                message:
                    error.message
            }



        });


    }



}









function measure(

    operation,

    callback

){



    if(
        typeof callback !== "function"
    ){

        throw new Error(

            "Performance callback must be a function"

        );


    }







    const start =
        Date.now();






    try{



        const result =
            callback();






        if(
            result &&
            typeof result.then === "function"
        ){


            return result

            .then(value=>{


                recordPerformance({


                    operation,


                    duration:
                        Date.now()-start,


                    success:
                        true



                });



                return value;



            })

            .catch(error=>{


                recordPerformance({


                    operation,


                    duration:
                        Date.now()-start,


                    success:
                        false



                });



                throw error;



            });



        }








        recordPerformance({


            operation,


            duration:
                Date.now()-start,


            success:
                true



        });






        return result;




    }

    catch(error){



        recordPerformance({


            operation,


            duration:
                Date.now()-start,


            success:
                false



        });



        throw error;



    }


}

function getPerformanceMetrics(){



    return Object.freeze({


        totalOperations:
            performance.totalOperations,


        slowOperations:
            performance.slowOperations,


        operations:
            {
                ...performance.operations
            }


    });



}









function resetPerformanceMetrics(){



    performance.operations = {};

    performance.slowOperations = 0;

    performance.totalOperations = 0;




    logger.info({


        message:
            "Performance metrics reset"



    });



}


module.exports = {


    recordPerformance,


    measure,


    getPerformanceMetrics,


    resetPerformanceMetrics



};