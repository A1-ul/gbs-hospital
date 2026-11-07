"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

SYSTEM HEALTH SERVICE

PRODUCTION HARDENED

COMMONJS ONLY

LOCATION:
src/core/monitoring/health.service.js

====================================================
*/


const prisma =
    require("../database/prisma.client");


const logger =
    require("../utils/logger");







const HEALTH_TIMEOUT =
    Number(
        process.env.HEALTH_CHECK_TIMEOUT || 5000
    );









function timeoutPromise(ms){


    return new Promise(

        (_, reject)=>{


            const timer =

                setTimeout(()=>{


                    reject(

                        new Error(
                            "Health check timeout"
                        )

                    );


                }, ms);



            timer.unref?.();


        }

    );


}









async function checkDatabase(){


    try{


        await Promise.race([


            prisma.$queryRaw`

                SELECT 1

            `,


            timeoutPromise(
                HEALTH_TIMEOUT
            )


        ]);



        return {


            status:
                "connected",


            healthy:
                true



        };


    }


    catch(error){



        logger.error({


            message:
                "System database health check failed",


            error:{
                message:
                    error.message,

                code:
                    error.code || null

            }



        });



        return {


            status:
                "disconnected",


            healthy:
                false



        };


    }


}

function getMemoryUsage(){



    const memory =
        process.memoryUsage();



    return Object.freeze({


        heapUsed:

            Math.round(

                memory.heapUsed /

                1024 /

                1024

            ) + " MB",



        heapTotal:

            Math.round(

                memory.heapTotal /

                1024 /

                1024

            ) + " MB",



        rss:

            Math.round(

                memory.rss /

                1024 /

                1024

            ) + " MB"



    });


}

async function systemHealth(){


    try{



        const database =
            await checkDatabase();





        return Object.freeze({



            server:
                "running",



            environment:
                process.env.NODE_ENV || "development",




            database,




            memory:
                getMemoryUsage(),




            uptime:

                Number(

                    process.uptime()

                    .toFixed(2)

                ),





            timestamp:
                new Date().toISOString()



        });



    }


    catch(error){



        logger.error({


            message:
                "System health service failure",


            error:{
                message:
                    error.message
            }



        });




        return Object.freeze({


            server:
                "running",


            database:{


                status:
                    "unknown",


                healthy:
                    false


            },


            timestamp:
                new Date().toISOString()



        });



    }


}


module.exports = {


    systemHealth,


    checkDatabase



};