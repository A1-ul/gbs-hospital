"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

API PERFORMANCE MONITOR

PRODUCTION HARDENED

COMMONJS ONLY

LOCATION:
src/core/monitoring/api.monitor.js

====================================================
*/


const logger =
    require("../utils/logger");








const MONITOR_KEY =
    "__GBS_API_MONITOR__";








/*
====================================================
GLOBAL METRICS STORAGE

Prevents duplicate metrics
during nodemon reloads

====================================================
*/


if(
    !global[MONITOR_KEY]
){


    global[MONITOR_KEY] = {


        totalRequests:
            0,


        successfulRequests:
            0,


        failedRequests:
            0,


        totalResponseTime:
            0,


        averageResponseTime:
            0,


        statusCodes:{},


        endpoints:{},


        lastRequest:
            null



    };


}






const metrics =
    global[MONITOR_KEY];









/*
====================================================
SAFE NUMBER CONVERSION
====================================================
*/


function safeNumber(value){


    const number =
        Number(value);



    return Number.isFinite(number)

        ? number

        :

        0;


}









/*
====================================================
RECORD API REQUEST

Called after response completed

====================================================
*/


function recordRequest({

    method,

    path,

    statusCode,

    duration,

    requestId

}){



    try{



        const responseTime =
            safeNumber(duration);





        const status =
            safeNumber(statusCode);







        metrics.totalRequests++;






        metrics.totalResponseTime +=
            responseTime;






        metrics.averageResponseTime =

            Number(

                (

                    metrics.totalResponseTime /

                    metrics.totalRequests

                ).toFixed(2)

            );







        if(
            status >= 200 &&
            status < 400
        ){

            metrics.successfulRequests++;

        }

        else{


            metrics.failedRequests++;

        }








        metrics.statusCodes[status] =

            (

                metrics.statusCodes[status]

                ||

                0

            )

            +

            1;









        const endpointKey =

            `${method || "UNKNOWN"} ${path || "UNKNOWN"}`;







        if(
            !metrics.endpoints[endpointKey]
        ){


            metrics.endpoints[endpointKey] = {


                requests:
                    0,


                failures:
                    0,


                totalDuration:
                    0


            };


        }







        metrics.endpoints[endpointKey].requests++;





        metrics.endpoints[endpointKey]
            .totalDuration += responseTime;







        if(
            status >= 400
        ){

            metrics.endpoints[endpointKey]
                .failures++;

        }







        metrics.lastRequest =
            new Date();








        /*
        Slow API warning
        */


        const slowLimit =

            Number(
                process.env.API_SLOW_REQUEST_LIMIT
            )

            ||

            1000;





        if(
            responseTime >= slowLimit
        ){



            logger.warn({


                message:
                    "Slow API request detected",


                method,


                path,


                duration:
                    `${responseTime}ms`,


                requestId:
                    requestId || null



            });


        }







    }

    catch(error){



        logger.error({


            message:
                "API monitor recording failed",


            error:{
                message:
                    error.message
            }



        });



    }



}









/*
====================================================
EXPRESS MIDDLEWARE

Usage:

app.use(apiMonitor())

====================================================
*/


function apiMonitor(){



    return function(

        req,

        res,

        next

    ){



        const start =
            Date.now();






        res.on(

            "finish",

            ()=>{


                recordRequest({


                    method:
                        req.method,


                    path:
                        req.originalUrl,


                    statusCode:
                        res.statusCode,


                    duration:
                        Date.now() - start,


                    requestId:
                        req.requestId || null



                });


            }


        );







        next();



    };



}

/*
====================================================
GET MONITOR STATUS

====================================================
*/


function getApiMetrics(){



    return Object.freeze({


        totalRequests:
            metrics.totalRequests,


        successfulRequests:
            metrics.successfulRequests,


        failedRequests:
            metrics.failedRequests,


        averageResponseTime:
            metrics.averageResponseTime,


        statusCodes:
            {
                ...metrics.statusCodes
            },


        endpoints:
            {
                ...metrics.endpoints
            },


        lastRequest:
            metrics.lastRequest



    });



}

/*
====================================================
RESET METRICS

Useful for tests/admin tools

====================================================
*/


function resetApiMetrics(){



    metrics.totalRequests = 0;

    metrics.successfulRequests = 0;

    metrics.failedRequests = 0;

    metrics.totalResponseTime = 0;

    metrics.averageResponseTime = 0;

    metrics.statusCodes = {};

    metrics.endpoints = {};

    metrics.lastRequest = null;



    logger.info({

        message:
            "API metrics reset"

    });



}

module.exports = {


    apiMonitor,


    recordRequest,


    getApiMetrics,


    resetApiMetrics



};